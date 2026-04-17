import type { FastifyPluginAsync } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { TaskService, TransitionError } from '../../services/taskService.js';
import { Notifier } from '../../services/notifier.js';
import { scheduleClientTimeout, cancelClientTimeout } from '../../jobs/queues.js';
import { sendPushToUser } from '../../services/pushService.js';

// ─── Схемы ────────────────────────────────────────────────────────────────────

const ProblemBody = z.object({
  problem_type:   z.enum(['item_not_available', 'need_clarification', 'price_change']),
  content:        z.string().max(500).nullable().optional(),
  photo_url:      z.string().url().nullable().optional(),
  price_proposed: z.number().positive().nullable().optional(),
  options:        z.array(z.string().max(100)).max(4).nullable().optional(),
});

const RespondBody = z.object({
  message_id:      z.string().uuid(),
  response_type:   z.enum(['accept', 'reject', 'select_option']),
  selected_option: z.string().max(200).nullable().optional(),
});

const CompleteQrBody = z.object({
  token: z.string().min(16).max(128),
  completion_photo_url: z.string().url().nullable().optional(),
});

const CancelBody = z.object({
  reason: z.string().min(1).max(300),
});

const RatingBody = z.object({
  task_id:  z.string().uuid(),
  ratee_id: z.string().uuid().optional(),
  stars:    z.number().int().min(1).max(5),
  comment:  z.string().max(200).optional(),
});

const DisputeBody = z.object({
  task_id:      z.string().uuid(),
  dispute_type: z.enum(['wrong_item', 'not_delivered', 'price_dispute', 'other']),
  description:  z.string().max(1000).optional(),
  evidence_urls: z.array(z.string().url()).max(5).default([]),
});

// ─── Таймаут ожидания ответа клиента (мс) ────────────────────────────────────
const CLIENT_RESPONSE_TIMEOUT_MS = 3 * 60 * 1000; // 3 минуты
const COMPLETION_QR_TYPE = 'quicky_task_completion';

// ─── Роуты ────────────────────────────────────────────────────────────────────

const taskExecuteRoutes: FastifyPluginAsync = async (fastify) => {
  const taskService = new TaskService(fastify.prisma);
  const notifier    = new Notifier(fastify.io);

  // ── GET /task/:id/completion-qr ─────────────────────────────────────────────
  // Клиент получает одноразовый QR payload, который исполнитель сканирует
  // при фактической передаче/доставке.

  fastify.get('/task/:id/completion-qr', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await fastify.prisma.task.findUnique({ where: { id } });

    if (!task) return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
    if (task.clientId !== req.user.userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'QR доступен только заказчику' });
    }
    if (['completed', 'cancelled', 'rated'].includes(task.state)) {
      return reply.status(409).send({ error: 'Conflict', message: 'QR для этого задания уже недоступен' });
    }

    const token = (task as { completionQrToken: string }).completionQrToken;
    const payload = JSON.stringify({ type: COMPLETION_QR_TYPE, task_id: id, token });
    return reply.send({ task_id: id, token, payload });
  });

  // ── POST /task/accept ────────────────────────────────────────────────────────

  fastify.post('/task/:id/accept', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    if (req.user.role !== 'executor') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Только исполнители могут принимать задания' });
    }

    // Атомарная блокировка — предотвращает race condition
    const updated = await fastify.prisma.task.updateMany({
      where: { id, state: 'published', executorId: null },
      data: { executorId: req.user.userId, state: 'accepted' },
    });

    if (updated.count === 0) {
      // Задание уже взято кем-то другим или не существует
      const task = await fastify.prisma.task.findUnique({ where: { id } });
      if (!task) return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
      return reply.status(409).send({ error: 'Conflict', message: 'Задание уже принято другим исполнителем' });
    }

    // Пишем в журнал
    await fastify.prisma.taskStateTransition.create({
      data: { taskId: id, fromState: 'published', toState: 'accepted', triggeredBy: req.user.userId },
    });

    const task = await taskService.findById(id);
    notifier.taskFeedRemoved(id);
    notifier.taskStateChanged(id, 'accepted', req.user.userId);
    sendPushToUser(fastify.prisma, task!.clientId as string, '🏃 Исполнитель найден', 'Ваше задание принято, исполнитель уже в пути', { task_id: id }).catch(() => {});
    return reply.send({ task_id: id, state: 'accepted', task_detail: toTaskDetail(task!) });
  });

  // ── POST /task/:id/start ─────────────────────────────────────────────────────

  fastify.post('/task/:id/start', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await taskService.findById(id);

    if (!task) return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
    if (task.executorId !== req.user.userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Это не ваше задание' });
    }

    try {
      await taskService.transition(id, 'in_progress', { id: req.user.userId, role: 'executor' });
    } catch (e) {
      if (e instanceof TransitionError) {
        return reply.status(409).send({ error: 'Conflict', message: e.message });
      }
      throw e;
    }

    notifier.taskStateChanged(id, 'in_progress', req.user.userId);
    return reply.send({ task_id: id, state: 'in_progress', started_at: new Date() });
  });

  // ── POST /task/:id/problem ───────────────────────────────────────────────────

  fastify.post('/task/:id/problem', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = ProblemBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const task = await taskService.findById(id);
    if (!task) return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
    if (task.executorId !== req.user.userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Это не ваше задание' });
    }
    if (task.state !== 'in_progress') {
      return reply.status(409).send({ error: 'Conflict', message: 'Задание не в процессе выполнения' });
    }

    const { problem_type, content, photo_url, price_proposed, options } = body.data;
    const expiresAt = new Date(Date.now() + CLIENT_RESPONSE_TIMEOUT_MS);

    const message = await fastify.prisma.taskMessage.create({
      data: {
        taskId:        id,
        senderId:      req.user.userId,
        messageType:   problem_type,
        content:       content ?? null,
        photoUrl:      photo_url ?? null,
        priceProposed: price_proposed ?? null,
        options:       (options ?? undefined) as never,
        expiresAt,
      },
    });

    // Переводим задание в ожидание ответа клиента
    await taskService.transition(id, 'pending_client', { id: req.user.userId, role: 'executor' });

    // Планируем таймаут (только если Redis доступен)
    await scheduleClientTimeout(id, message.id, task.clientId as string).catch(() => {});

    notifier.newMessage(id, message);
    notifier.taskStateChanged(id, 'pending_client', req.user.userId);
    sendPushToUser(fastify.prisma, task.clientId as string, '❓ Вопрос от исполнителя', 'Требуется ваш ответ — у вас 3 минуты', { task_id: id }).catch(() => {});

    return reply.send({
      message_id: message.id,
      expires_at: expiresAt,
      state:      'pending_client',
    });
  });

  // ── POST /task/:id/respond ───────────────────────────────────────────────────
  // Клиент отвечает на проблему исполнителя

  fastify.post('/task/:id/respond', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = RespondBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const task = await taskService.findById(id);
    if (!task) return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
    if (task.clientId !== req.user.userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Нет доступа' });
    }
    if (task.state !== 'pending_client') {
      return reply.status(409).send({ error: 'Conflict', message: 'Задание не ожидает ответа' });
    }

    const { message_id, response_type, selected_option } = body.data;

    const message = await fastify.prisma.taskMessage.findUnique({ where: { id: message_id } });
    if (!message || message.taskId !== id) {
      return reply.status(404).send({ error: 'NotFound', message: 'Сообщение не найдено' });
    }

    // Сохраняем ответ клиента
    await fastify.prisma.taskMessage.update({
      where: { id: message_id },
      data: {
        isResolved:     true,
        selectedOption: selected_option ?? null,
        priceAccepted:  response_type === 'accept' ? true : response_type === 'reject' ? false : null,
      },
    });

    // Определяем новое состояние
    let newState: 'in_progress' | 'cancelled';

    if (response_type === 'reject' && message.messageType === 'price_change') {
      // Клиент отклонил изменение цены — возвращаемся к выполнению
      newState = 'in_progress';
    } else if (response_type === 'reject') {
      // Клиент отклонил замену — отмена
      newState = 'cancelled';
    } else {
      // Клиент принял — продолжаем
      newState = 'in_progress';
    }

    await taskService.transition(id, newState, { id: req.user.userId, role: 'client' });

    // Отменяем таймаут — клиент уже ответил
    await cancelClientTimeout(message_id).catch(() => {});

    notifier.clientResponse(id, message_id, response_type);
    notifier.taskStateChanged(id, newState, req.user.userId);

    return reply.send({ task_id: id, state: newState });
  });

  // ── POST /task/:id/complete ──────────────────────────────────────────────────

  fastify.post('/task/:id/complete', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    return reply.status(410).send({
      error: 'Gone',
      message: 'Завершение задания доступно только через QR подтверждение',
    });
  });

  // ── POST /task/:id/complete-qr ───────────────────────────────────────────────

  fastify.post('/task/:id/complete-qr', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = CompleteQrBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const task = await taskService.findById(id);
    if (!task) return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
    if (task.executorId !== req.user.userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Это не ваше задание' });
    }
    if (task.state !== 'in_progress') {
      return reply.status(409).send({ error: 'Conflict', message: 'QR подтверждение доступно только для задания в работе' });
    }

    const expectedToken = (task as unknown as { completionQrToken: string }).completionQrToken;
    if (!isSameToken(expectedToken, body.data.token)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'QR код не подходит для этого задания' });
    }

    if (body.data.completion_photo_url) {
      await fastify.prisma.task.update({
        where: { id },
        data: { specialNotes: `completion_photo:${body.data.completion_photo_url}` },
      });
    }

    try {
      await taskService.transition(
        id,
        'completed',
        { id: req.user.userId, role: 'executor' },
        'qr_confirmed',
        { confirmedByQr: true },
      );
    } catch (e) {
      if (e instanceof TransitionError) {
        return reply.status(409).send({ error: 'Conflict', message: e.message });
      }
      throw e;
    }

    notifier.taskCompleted(id);
    notifier.taskStateChanged(id, 'completed', req.user.userId);
    sendPushToUser(fastify.prisma, task.clientId as string, '✅ Заказ подтверждён', 'Исполнитель отсканировал QR. Можно оставить оценку', { task_id: id }).catch(() => {});
    return reply.send({ task_id: id, state: 'completed', completed_at: new Date(), confirmed_by: 'qr' });
  });

  // ── POST /task/:id/cancel ────────────────────────────────────────────────────

  fastify.post('/task/:id/cancel', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = CancelBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const task = await taskService.findById(id);
    if (!task) return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });

    const userId = req.user.userId;
    const isOwner = task.clientId === userId || task.executorId === userId;
    if (!isOwner) return reply.status(403).send({ error: 'Forbidden', message: 'Нет доступа' });

    const role = task.clientId === userId ? 'client' : 'executor';

    try {
      await taskService.transition(id, 'cancelled', { id: userId, role }, body.data.reason);
    } catch (e) {
      if (e instanceof TransitionError) {
        return reply.status(409).send({ error: 'Conflict', message: e.message });
      }
      throw e;
    }

    return reply.send({ task_id: id, state: 'cancelled' });
  });

  // ── POST /rating ─────────────────────────────────────────────────────────────

  fastify.post('/rating', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const body = RatingBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const { task_id, ratee_id, stars, comment } = body.data;

    const task = await fastify.prisma.task.findUnique({ where: { id: task_id } });
    if (!task) return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
    if (task.state !== 'completed' && task.state !== 'rated') {
      return reply.status(409).send({ error: 'Conflict', message: 'Задание ещё не завершено' });
    }
    if (!task.executorId) {
      return reply.status(409).send({ error: 'Conflict', message: 'У задания нет исполнителя для взаимной оценки' });
    }

    const raterId = req.user.userId;
    let resolvedRateeId: string | null = null;
    if (raterId === task.clientId) resolvedRateeId = task.executorId;
    if (raterId === task.executorId) resolvedRateeId = task.clientId;

    if (!resolvedRateeId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Оценивать могут только участники задания' });
    }
    if (ratee_id && ratee_id !== resolvedRateeId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Нельзя оценить пользователя вне этого задания' });
    }

    const existing = await fastify.prisma.rating.findFirst({
      where: { taskId: task_id, raterId },
    });
    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'Вы уже оставили оценку по этому заданию' });
    }

    const rating = await fastify.prisma.rating.create({
      data: { taskId: task_id, raterId, rateeId: resolvedRateeId, stars, comment },
    });

    // Пересчитываем рейтинг пользователя
    const stats = await fastify.prisma.rating.aggregate({
      where: { rateeId: resolvedRateeId },
      _avg: { stars: true },
      _count: { stars: true },
    });

    await fastify.prisma.user.update({
      where: { id: resolvedRateeId },
      data: {
        ratingAvg:   stats._avg.stars ?? 0,
        ratingCount: stats._count.stars,
      },
    });

    // Если обе стороны поставили оценки — переводим в rated
    const ratingsCount = await fastify.prisma.rating.count({ where: { taskId: task_id } });
    if (ratingsCount >= 2 && task.state === 'completed') {
      await taskService.transition(task_id, 'rated', { id: 'system', role: 'system' });
    }

    return reply.status(201).send({ rating_id: rating.id, user_stats_updated: true });
  });

  // ── POST /dispute ────────────────────────────────────────────────────────────

  fastify.post('/dispute', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const body = DisputeBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const { task_id, dispute_type, description, evidence_urls } = body.data;

    const task = await fastify.prisma.task.findUnique({ where: { id: task_id } });
    if (!task) return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });
    if (task.clientId !== req.user.userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Только клиент может открыть спор' });
    }
    if (task.state !== 'completed') {
      return reply.status(409).send({ error: 'Conflict', message: 'Спор можно открыть только по завершённому заданию' });
    }

    const dispute = await fastify.prisma.dispute.create({
      data: {
        taskId:       task_id,
        reporterId:   req.user.userId,
        disputeType:  dispute_type,
        description:  description ?? null,
        evidenceUrls: evidence_urls,
      },
    });

    await taskService.transition(task_id, 'disputed', { id: req.user.userId, role: 'client' });

    // Авторазрешение (уровень 1)
    const autoResolution = await tryAutoResolve(task_id, dispute_type, fastify.prisma);

    return reply.status(201).send({
      dispute_id: dispute.id,
      status: autoResolution ? 'resolved' : 'open',
      auto_resolution_in: autoResolution ? null : '24h',
    });
  });
  // ── GET /task/:id/messages ────────────────────────────────────────────────────
  // История сообщений задания (нужна при реконнекте)

  fastify.get('/task/:id/messages', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const task = await taskService.findById(id);

    if (!task) return reply.status(404).send({ error: 'NotFound', message: 'Задание не найдено' });

    const userId = req.user.userId;
    if (task.clientId !== userId && task.executorId !== userId) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Нет доступа' });
    }

    const messages = await fastify.prisma.taskMessage.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'asc' },
    });

    return reply.send({
      messages: messages.map((m: any) => ({
        id:             m.id,
        task_id:        m.taskId,
        sender_id:      m.senderId,
        message_type:   m.messageType,
        content:        m.content,
        photo_url:      m.photoUrl,
        options:        m.options,
        price_proposed: m.priceProposed ? Number(m.priceProposed) : null,
        is_resolved:    m.isResolved,
        expires_at:     m.expiresAt,
        created_at:     m.createdAt,
      })),
    });
  });
};

// ─── Авторазрешение споров (уровень 1) ───────────────────────────────────────
// Если задание было "выполнено" менее 30 минут назад и тип "not_delivered" →
// автоматически открываем спор для ручного разбора.
// (Полная автоматика — в Phase 2)

async function tryAutoResolve(
  taskId: string,
  disputeType: string,
  prisma: { task: { findUnique: Function }; dispute: { update: Function } },
): Promise<boolean> {
  return false; // MVP: все споры идут на ручной разбор
}

function isSameToken(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

// ─── DTO ─────────────────────────────────────────────────────────────────────

function toTaskDetail(task: Record<string, unknown>) {
  const executor = task['executor'] as { name: string; ratingAvg: unknown } | null | undefined;
  const client   = task['client']   as { name: string; ratingAvg: unknown } | null | undefined;
  return {
    id:               task['id'],
    state:            task['state'],
    category:         task['category'],
    title:            task['title'],
    item_description: task['itemDescription'],
    from_location:    task['fromAddress']
      ? { address: task['fromAddress'], lat: task['fromLat'], lng: task['fromLng'] }
      : null,
    to_location:      { address: task['toAddress'], lat: task['toLat'], lng: task['toLng'] },
    price_final:      task['priceFinal'] ? Number(task['priceFinal']) : null,
    payment_method:   task['paymentMethod'] ?? null,
    notes:            task['notes'] ?? null,
    scheduled_for:    task['scheduledFor'],
    client_id:        task['clientId'],
    executor_id:      task['executorId'] ?? null,
    executor:         executor ? { name: executor.name, rating_avg: executor.ratingAvg ? Number(executor.ratingAvg) : null } : null,
    client:           client ? { name: client.name, rating_avg: client.ratingAvg ? Number(client.ratingAvg) : null } : null,
    created_at:       task['createdAt'],
  };
}

export default taskExecuteRoutes;
