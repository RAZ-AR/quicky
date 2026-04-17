import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getAI } from '../../services/ai/index.js';
import { ClarificationLoop } from '../../services/clarification/index.js';
import { TaskService, TransitionError } from '../../services/taskService.js';
import { Notifier } from '../../services/notifier.js';
import { scheduleTaskExpiry } from '../../jobs/queues.js';
import type { ClarificationSession } from '../../services/clarification/index.js';

// ─── Схемы ────────────────────────────────────────────────────────────────────

const ParseBody = z.object({
  text: z.string().min(3).max(500),
});

const ClarifyBody = z.object({
  task_id:        z.string().uuid(),
  field_answered: z.string(),
  answer:         z.string().min(1).max(300).nullable(),
  skip:           z.boolean().optional().default(false),
});

const ConfirmBody = z.object({
  task_id:        z.string().uuid(),
  price_final:    z.number().positive(),
  scheduled_for:  z.string().datetime().nullable().optional(),
  payment_method: z.enum(['cash_on_delivery', 'pseudo_escrow']).default('cash_on_delivery'),
});

// ─── Роуты ────────────────────────────────────────────────────────────────────

const taskCreateRoutes: FastifyPluginAsync = async (fastify) => {
  const taskService = new TaskService(fastify.prisma);
  const notifier    = new Notifier(fastify.io);

  // ─── Redis-хелперы для сессий кларификации ────────────────────────────────
  const SESSION_TTL = 1800; // 30 минут

  async function getSession(taskId: string): Promise<ClarificationSession | null> {
    const raw = await fastify.redis.get(`clarification:${taskId}`);
    return raw ? (JSON.parse(raw) as ClarificationSession) : null;
  }

  async function saveSession(taskId: string, session: ClarificationSession): Promise<void> {
    await fastify.redis.set(`clarification:${taskId}`, JSON.stringify(session), 'EX', SESSION_TTL);
  }

  async function deleteSession(taskId: string): Promise<void> {
    await fastify.redis.del(`clarification:${taskId}`);
  }

  // ── POST /task/voice ─────────────────────────────────────────────────────────
  // Принимает аудиофайл → транскрибирует → парсит → возвращает первый вопрос

  fastify.post('/task/voice', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    if (req.user.role === 'executor') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Исполнитель не может создавать заказы' });
    }
    const data = await req.file();
    if (!data) {
      return reply.status(400).send({ error: 'BadRequest', message: 'Аудиофайл не найден' });
    }

    const mimeType = data.mimetype; // audio/webm, audio/m4a
    const audioBuffer = await data.toBuffer();

    if (audioBuffer.length > 10 * 1024 * 1024) { // 10 MB
      return reply.status(400).send({ error: 'BadRequest', message: 'Файл слишком большой (макс 10 МБ)' });
    }

    const ai = getAI();
    const loop = new ClarificationLoop(ai);

    // Шаг 1: транскрипция
    const transcript = await ai.transcribeAudio(audioBuffer, mimeType);

    // Шаг 2: парсинг
    const parsed = await ai.parseTask(transcript);

    // Шаг 3: создаём черновик в БД
    const task = await taskService.createDraft(req.user.userId, {
      rawVoiceText:     transcript,
      category:         parsed.category ?? 'buy_deliver',
      title:            parsed.title ?? 'Новое задание',
      itemDescription:  parsed.item_description ?? undefined,
      fromAddress:      parsed.from_location?.address,
      toAddress:        parsed.to_location?.address ?? '',
      priceSuggested:   parsed.price_suggested ?? undefined,
    });

    // Шаг 4: запускаем цикл уточнений
    const { session, next_question } = await loop.start(task.id, parsed, transcript);
    await saveSession(task.id, session);

    // Если уточнения не нужны — сразу переходим к подтверждению
    if (session.is_complete) {
      await taskService.transition(task.id, 'pending_confirm',
        { id: 'system', role: 'system' });
    }

    return reply.status(201).send({
      task_id:       task.id,
      transcript,
      parsed,
      state:         session.is_complete ? 'pending_confirm' : 'draft',
      next_question: next_question ?? null,
    });
  });

  // ── POST /task/parse ─────────────────────────────────────────────────────────
  // Текстовый ввод вместо голоса

  fastify.post('/task/parse', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    if (req.user.role === 'executor') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Исполнитель не может создавать заказы' });
    }
    const body = ParseBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const ai = getAI();
    const loop = new ClarificationLoop(ai);
    const parsed = await ai.parseTask(body.data.text);

    const task = await taskService.createDraft(req.user.userId, {
      category:        parsed.category ?? 'buy_deliver',
      title:           parsed.title ?? 'Новое задание',
      itemDescription: parsed.item_description ?? undefined,
      fromAddress:     parsed.from_location?.address,
      toAddress:       parsed.to_location?.address ?? '',
      priceSuggested:  parsed.price_suggested ?? undefined,
    });

    const { session, next_question } = await loop.start(task.id, parsed);
    await saveSession(task.id, session);

    if (session.is_complete) {
      await taskService.transition(task.id, 'pending_confirm',
        { id: 'system', role: 'system' });
    }

    return reply.status(201).send({
      task_id:       task.id,
      parsed,
      state:         session.is_complete ? 'pending_confirm' : 'draft',
      next_question: next_question ?? null,
    });
  });

  // ── POST /task/clarify ───────────────────────────────────────────────────────
  // Клиент отвечает на уточняющий вопрос (или пропускает)

  fastify.post('/task/clarify', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const body = ClarifyBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const { task_id, field_answered, answer, skip } = body.data;

    // Проверяем владельца задания
    const task = await taskService.findById(task_id);
    if (!task) {
      return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
    }
    if (task.clientId !== req.user.userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Нет доступа' });
    }
    if (task.state !== 'draft') {
      return reply.status(409).send({ error: 'Conflict', message: `Задание в состоянии "${task.state}", уточнения недоступны` });
    }

    // Восстанавливаем сессию (или пересоздаём если сессия истекла)
    let session = await getSession(task_id);
    if (!session) {
      session = rebuildSession(task);
    }

    const ai = getAI();
    const loop = new ClarificationLoop(ai);

    const result = skip || !answer
      ? await loop.skip(session, field_answered as never)
      : await loop.answer(session, field_answered as never, answer);

    await saveSession(task_id, result.session);

    // Сохраняем ответ в БД
    const history = result.session.history;
    await taskService.updateDraft(task_id, {
      title:             result.session.draft.title ?? undefined,
      itemDescription:   result.session.draft.item_description ?? undefined,
      fromAddress:       result.session.draft.from_location?.address,
      toAddress:         result.session.draft.to_location?.address,
      priceSuggested:    result.session.draft.price_suggested ?? undefined,
      clarificationData: history as object[],
      clarificationStep: result.session.step,
    });

    // Если цикл завершён — переходим к подтверждению
    if (result.session.is_complete) {
      await taskService.transition(task_id, 'pending_confirm',
        { id: 'system', role: 'system' });
    }

    return reply.send({
      task_id,
      state:         result.session.is_complete ? 'pending_confirm' : 'draft',
      next_question: result.next_question ?? null,
      task_snapshot: draftToSnapshot(result.session.draft),
    });
  });

  // ── POST /task/confirm ───────────────────────────────────────────────────────
  // Клиент подтверждает карточку задания → публикуем

  fastify.post('/task/confirm', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const body = ConfirmBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const { task_id, price_final, scheduled_for, payment_method } = body.data;

    const task = await taskService.findById(task_id);
    if (!task) {
      return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
    }
    if (task.clientId !== req.user.userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Нет доступа' });
    }
    if (task.state !== 'pending_confirm') {
      return reply.status(409).send({
        error:   'Conflict',
        message: `Ожидается состояние "pending_confirm", получено "${task.state}"`,
      });
    }

    // Финальная цена + время
    await taskService.updateDraft(task_id, {
      toAddress: task.toAddress, // без изменений
    });
    await fastify.prisma.task.update({
      where: { id: task_id },
      data: {
        priceFinal:   price_final,
        scheduledFor: scheduled_for ? new Date(scheduled_for) : null,
        expiresAt:    new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 часа
      },
    });

    // Создаём запись платежа
    await fastify.prisma.payment.create({
      data: {
        taskId:        task_id,
        clientId:      req.user.userId,
        amount:        price_final,
        paymentMethod: payment_method,
        status:        'pending',
      },
    });

    // Публикуем задание
    const published = await taskService.transition(
      task_id, 'published',
      { id: req.user.userId, role: 'client' },
    );

    await deleteSession(task_id);

    // Планируем истечение задания через 24 часа
    await scheduleTaskExpiry(task_id).catch(() => {});

    // Уведомляем исполнителей в ленте
    const fullTask = await taskService.findById(task_id);
    if (fullTask) {
      notifier.taskFeedNew({
        id:          fullTask.id,
        title:       fullTask.title,
        category:    fullTask.category,
        to_location: { address: fullTask.toAddress, lat: fullTask.toLat, lng: fullTask.toLng },
        price_final: fullTask.priceFinal ? Number(fullTask.priceFinal) : null,
        urgency:     fullTask.scheduledFor ? 'scheduled' : 'asap',
        distance_km: null,
      });
    }

    return reply.send({
      task_id,
      state:        published.state,
      published_at: published.updatedAt,
    });
  });

  // ── GET /task/:id ────────────────────────────────────────────────────────────

  fastify.get('/task/:id', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await taskService.findById(id);

    if (!task) {
      return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
    }

    // Клиент видит своё задание, исполнитель — назначенное ему
    const userId = req.user.userId;
    if (task.clientId !== userId && task.executorId !== userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Нет доступа' });
    }

    return reply.send({ task: toTaskDTO(task) });
  });

  // ── GET /tasks/my ────────────────────────────────────────────────────────────

  fastify.get('/tasks/my', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const tasks = await taskService.findByClient(req.user.userId);
    return reply.send({ tasks: tasks.map(toTaskDTO) });
  });
};

// ─── Хелперы ─────────────────────────────────────────────────────────────────

function draftToSnapshot(draft: ClarificationSession['draft']) {
  return {
    title:            draft.title,
    item_description: draft.item_description,
    from_location:    draft.from_location,
    to_location:      draft.to_location,
    price_suggested:  draft.price_suggested,
    scheduled_for:    draft.scheduled_for,
  };
}

function toTaskDTO(task: Record<string, unknown>) {
  const executor = task['executor'] as { name: string; ratingAvg: unknown } | null | undefined;
  return {
    id:               task['id'],
    state:            task['state'],
    category:         task['category'],
    title:            task['title'],
    item_description: task['itemDescription'],
    from_location:    task['fromAddress'] ? { address: task['fromAddress'], lat: task['fromLat'], lng: task['fromLng'] } : null,
    to_location:      { address: task['toAddress'], lat: task['toLat'], lng: task['toLng'] },
    price_suggested:  task['priceSuggested'] ? Number(task['priceSuggested']) : null,
    price_final:      task['priceFinal'] ? Number(task['priceFinal']) : null,
    payment_method:   task['paymentMethod'] ?? null,
    notes:            task['notes'] ?? null,
    client_id:        task['clientId'],
    executor_id:      task['executorId'] ?? null,
    executor:         executor ? { name: executor.name, rating_avg: executor.ratingAvg ? Number(executor.ratingAvg) : null } : null,
    scheduled_for:    task['scheduledFor'],
    clarification_step: task['clarificationStep'],
    created_at:       task['createdAt'],
    updated_at:       task['updatedAt'],
  };
}

// Пересоздаём сессию из данных БД если сервер перезапускался
function rebuildSession(task: {
  id: string;
  category: string;
  title: string;
  itemDescription: string | null;
  fromAddress: string | null;
  toAddress: string;
  priceSuggested: unknown;
  clarificationStep: number;
  clarificationData: unknown;
  rawVoiceText: string | null;
}): ClarificationSession {
  return {
    taskId: task.id,
    draft: {
      taskId:           task.id,
      category:         task.category as never,
      title:            task.title,
      item_description: task.itemDescription,
      from_location:    task.fromAddress ? { address: task.fromAddress } : null,
      to_location:      task.toAddress ? { address: task.toAddress } : null,
      scheduled_for:    null,
      price_suggested:  task.priceSuggested ? Number(task.priceSuggested) : null,
      price_final:      null,
      raw_voice_text:   task.rawVoiceText,
    },
    missing_fields:   [],
    answered_fields:  [],
    step:             task.clarificationStep,
    max_steps:        3,
    history:          (task.clarificationData as never[]) ?? [],
    is_complete:      false,
  };
}

export default taskCreateRoutes;
