/**
 * E2E: Полный цикл Заказчик → Исполнитель
 *
 * Фазы:
 *  1. Онбординг  — регистрация клиента и исполнителя через /auth/social-complete
 *  2. Создание   — клиент парсит текст → подтверждение → публикация
 *  3. Лента      — исполнитель видит задание
 *  4. Принятие   — исполнитель берёт задание
 *  5. Выполнение — исполнитель стартует, сообщает о проблеме, клиент отвечает
 *  6. Завершение — клиент получает QR, исполнитель сканирует
 *  7. Оценка     — обе стороны ставят оценки
 *  8. Граничные  — отмена, спор
 *  9. Безопасность — перекрёстные роли, истёкший токен
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import jwt from 'jsonwebtoken';
import fp from 'fastify-plugin';

import authPlugin        from '../../plugins/auth.js';
import taskCreateRoutes  from '../task/create.js';
import taskExecuteRoutes from '../task/execute.js';
import taskFeedRoutes    from '../task/feed.js';
import authRoutes        from '../auth.js';

// ─── Константы ────────────────────────────────────────────────────────────────

const JWT_SECRET = 'dev-secret-change-in-production';

const CLIENT_ID  = 'aaaaaaaa-0001-0001-0001-000000000001';
const EXEC_ID    = 'aaaaaaaa-0002-0002-0002-000000000002';
const TASK_ID    = 'bbbbbbbb-0001-0001-0001-000000000001';
const MSG_ID     = 'cccccccc-0001-0001-0001-000000000001';
const QR_TOKEN   = 'qr-secret-e2e-test-token';

// Простые шестнадцатеричные токены (min 16 символов для SocialCompleteBody)
const TEMP_TOKEN_CLIENT = 'a'.repeat(64);
const TEMP_TOKEN_EXEC   = 'b'.repeat(64);

const SESSION_CLIENT = JSON.stringify({
  provider: 'google', providerId: 'google-sub-123',
  name: 'Иван Петров', avatar: null, email: 'ivan@test.com',
});
const SESSION_EXEC = JSON.stringify({
  provider: 'google', providerId: 'google-sub-456',
  name: 'Алексей Курьер', avatar: null, email: 'alex@test.com',
});

// ─── Состояние задания (мутируется по ходу теста) ─────────────────────────────

let taskState = 'published';

const mockTask = () => ({
  id:                  TASK_ID,
  clientId:            CLIENT_ID,
  executorId:          taskState === 'published' ? null : EXEC_ID,
  state:               taskState,
  category:            'shopping',
  title:               'Купить продукты',
  itemDescription:     'Молоко 3.2%, хлеб белый, яйца 10 шт',
  fromAddress:         'Пятёрочка, ул. Ленина, 1',
  fromLat:             55.75, fromLng: 37.61,
  toAddress:           'пр. Победы, 45, кв. 12',
  toLat:               55.76, toLng:   37.62,
  priceFinal:          450,
  priceSuggested:      450,
  paymentMethod:       'cash_on_delivery',
  completionQrToken:   QR_TOKEN,
  scheduledFor:        null,
  expiresAt:           new Date(Date.now() + 86_400_000),
  rawVoiceText:        null,
  clarificationStep:   0,
  clarificationData:   [],
  city:                'Belgrade',
  specialNotes:        null,
  createdAt:           new Date(),
  updatedAt:           new Date(),
  client:   { id: CLIENT_ID, name: 'Иван Петров',    ratingAvg: 4.8, ratingCount: 12, phone: '+71112223344' },
  executor: taskState === 'published' ? null
    : { id: EXEC_ID, name: 'Алексей Курьер', ratingAvg: 4.9, ratingCount: 30, phone: '+72223334455' },
});

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const prismaMock = {
  user: {
    findUnique:  vi.fn(),
    findFirst:   vi.fn(),
    create:      vi.fn(),
    update:      vi.fn().mockResolvedValue({}),
  },
  task: {
    create:            vi.fn().mockImplementation(() => Promise.resolve(mockTask())),
    findUnique:        vi.fn().mockImplementation(() => Promise.resolve(mockTask())),
    findUniqueOrThrow: vi.fn().mockImplementation(() => Promise.resolve(mockTask())),
    update:            vi.fn().mockImplementation((args: { data: { state?: string } }) => {
      if (args.data?.state) taskState = args.data.state;
      return Promise.resolve(mockTask());
    }),
    updateMany:        vi.fn().mockResolvedValue({ count: 1 }),
    findMany:          vi.fn().mockImplementation(() => Promise.resolve([mockTask()])),
  },
  taskStateTransition: { create: vi.fn().mockResolvedValue({}) },
  taskMessage: {
    create:     vi.fn().mockResolvedValue({
      id: MSG_ID, taskId: TASK_ID, messageType: 'item_not_available',
      content: 'Молока 3.2% нет, есть 2.5% — взять?', photoUrl: null,
      options: null, priceProposed: 440,
      expiresAt: new Date(Date.now() + 3_600_000),
    }),
    findUnique: vi.fn().mockResolvedValue({
      id: MSG_ID, taskId: TASK_ID, messageType: 'item_not_available',
    }),
    update: vi.fn().mockResolvedValue({}),
  },
  rating: {
    findFirst: vi.fn().mockResolvedValue(null),
    create:    vi.fn().mockResolvedValue({ id: 'rating-1' }),
    aggregate: vi.fn().mockResolvedValue({ _avg: { stars: 4.9 }, _count: { stars: 5 } }),
    count:     vi.fn().mockResolvedValue(1),
  },
  dispute:  { create: vi.fn().mockResolvedValue({ id: 'dispute-1' }) },
  payment:  { create: vi.fn().mockResolvedValue({}) },
  session:  {
    findUnique: vi.fn().mockResolvedValue(null),
    create:     vi.fn().mockResolvedValue({}),
    update:     vi.fn().mockResolvedValue({}),
    delete:     vi.fn().mockResolvedValue({}),
  },
  $transaction: vi.fn().mockImplementation((ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : (ops as Function)(prismaMock),
  ),
};

// ─── Redis mock ───────────────────────────────────────────────────────────────

const redisMock = {
  get:    vi.fn().mockImplementation((key: string) => {
    if (key === `social_temp:${TEMP_TOKEN_CLIENT}`) return Promise.resolve(SESSION_CLIENT);
    if (key === `social_temp:${TEMP_TOKEN_EXEC}`)   return Promise.resolve(SESSION_EXEC);
    return Promise.resolve(null);
  }),
  set:    vi.fn().mockResolvedValue('OK'),
  del:    vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
};

// ─── AI / Queue / Notifier mocks ──────────────────────────────────────────────

vi.mock('../../services/ai/index.js', () => ({
  getAI: () => ({
    parseTask: vi.fn().mockResolvedValue({
      category:        'shopping',
      title:           'Купить продукты',
      item_description:'Молоко 3.2%, хлеб белый, яйца 10 шт',
      from_location:   { address: 'Пятёрочка, ул. Ленина, 1' },
      to_location:     { address: 'пр. Победы, 45, кв. 12' },
      price_suggested: 450,
      questions:       [],
    }),
    clarify: vi.fn().mockResolvedValue({ question: null, done: true }),
  }),
}));

vi.mock('../../services/clarification/index.js', () => ({
  ClarificationLoop: class {
    start()  { return Promise.resolve({ done: true, question: null, session: { is_complete: true, draft: {}, history: [], step: 0 } }); }
    answer() { return Promise.resolve({ done: true, question: null, session: { is_complete: true, draft: {}, history: [], step: 0 }, next_question: null }); }
    skip()   { return Promise.resolve({ done: true, question: null, session: { is_complete: true, draft: {}, history: [], step: 0 }, next_question: null }); }
  },
}));

vi.mock('../../jobs/queues.js', () => ({
  scheduleTaskExpiry:    vi.fn().mockResolvedValue(undefined),
  scheduleClientTimeout: vi.fn().mockResolvedValue(undefined),
  cancelClientTimeout:   vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/notifier.js', () => ({
  Notifier: class {
    taskStateChanged()  {}
    taskFeedNew()       {}
    taskFeedRemoved()   {}
    newMessage()        {}
    clientResponse()    {}
    taskCompleted()     {}
  },
}));

// ─── App factory ──────────────────────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(fp(async (f) => {
    f.decorate('prisma', prismaMock as never);
    f.decorate('redis',  redisMock  as never);
    f.decorate('io',     { to: () => ({ emit: vi.fn() }) } as never);
  }));

  await app.register(authPlugin);
  await app.register(multipart);
  await app.register(authRoutes);
  await app.register(taskCreateRoutes);
  await app.register(taskExecuteRoutes);
  await app.register(taskFeedRoutes);
  await app.ready();
  return app;
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────

const clientJwt   = () => jwt.sign({ userId: CLIENT_ID, role: 'client',   phone: '+71112223344' }, JWT_SECRET);
const executorJwt = () => jwt.sign({ userId: EXEC_ID,   role: 'executor', phone: '+72223334455' }, JWT_SECRET);

// ═════════════════════════════════════════════════════════════════════════════
// ТЕСТЫ
// ═════════════════════════════════════════════════════════════════════════════

describe('E2E: Полный цикл Заказчик → Исполнитель', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ФАЗА 1: Онбординг — регистрация обоих пользователей
  // ───────────────────────────────────────────────────────────────────────────

  describe('Фаза 1 — Онбординг и регистрация', () => {

    it('Клиент: завершает регистрацию (выбирает роль client)', async () => {
      prismaMock.user.create.mockResolvedValueOnce({
        id: CLIENT_ID, name: 'Иван Петров', role: 'client', phone: null,
        googleId: 'google-sub-123', avatarFromSocial: null,
        ratingAvg: 0, ratingCount: 0, cancellationCount: 0, isVerified: false,
      });

      const res = await app.inject({
        method: 'POST', url: '/auth/social-complete',
        payload: { temp_token: TEMP_TOKEN_CLIENT, name: 'Иван Петров', role: 'client' },
      });

      expect(res.statusCode, res.body).toBe(201);
      const body = res.json();
      expect(body.token).toBeTruthy();
      expect(body.user.role).toBe('client');
      expect(body.user.name).toBe('Иван Петров');
    });

    it('Исполнитель: завершает регистрацию (выбирает роль executor)', async () => {
      prismaMock.user.create.mockResolvedValueOnce({
        id: EXEC_ID, name: 'Алексей Курьер', role: 'executor', phone: null,
        googleId: 'google-sub-456', avatarFromSocial: null,
        ratingAvg: 0, ratingCount: 0, cancellationCount: 0, isVerified: false,
      });

      const res = await app.inject({
        method: 'POST', url: '/auth/social-complete',
        payload: { temp_token: TEMP_TOKEN_EXEC, name: 'Алексей Курьер', role: 'executor' },
      });

      expect(res.statusCode, res.body).toBe(201);
      expect(res.json().user.role).toBe('executor');
    });

    it('Клиент: получает свой профиль /auth/me', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: CLIENT_ID, name: 'Иван Петров', role: 'client', phone: null,
        ratingAvg: 0, ratingCount: 0, cancellationCount: 0, isVerified: false,
      });

      const res = await app.inject({
        method: 'GET', url: '/auth/me',
        headers: { authorization: `Bearer ${clientJwt()}` },
      });

      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().user.id).toBe(CLIENT_ID);
    });

    it('Нельзя зарегистрироваться с невалидным именем (< 2 символов)', async () => {
      const res = await app.inject({
        method: 'POST', url: '/auth/social-complete',
        payload: { temp_token: TEMP_TOKEN_CLIENT, name: 'A', role: 'client' },
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ФАЗА 2: Создание заказа — клиент
  // ───────────────────────────────────────────────────────────────────────────

  describe('Фаза 2 — Создание заказа', () => {

    it('Клиент: парсит текстовый запрос → черновик', async () => {
      // parse создаёт draft, ClarificationLoop.start возвращает is_complete=true →
      // route делает transition(draft → pending_confirm); findUniqueOrThrow должен видеть draft
      prismaMock.task.create.mockResolvedValueOnce({ ...mockTask(), state: 'draft' });
      prismaMock.task.findUniqueOrThrow.mockResolvedValueOnce({ ...mockTask(), state: 'draft' });

      const res = await app.inject({
        method: 'POST', url: '/task/parse',
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { text: 'Купи молоко хлеб и яйца в Пятёрочке на Ленина, привези на Победы 45 кв 12' },
      });

      expect(res.statusCode, res.body).toBe(201);
      const body = res.json();
      expect(body.task_id).toBeTruthy();
      expect(body.parsed.category).toBe('shopping');
    });

    it('Исполнитель НЕ может создавать заказы', async () => {
      const res = await app.inject({
        method: 'POST', url: '/task/parse',
        headers: { authorization: `Bearer ${executorJwt()}` },
        payload: { text: 'Купи кофе' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('Клиент: подтверждает заказ (устанавливает цену и публикует)', async () => {
      // findById → pending_confirm → confirm check passes
      prismaMock.task.findUnique.mockResolvedValue({ ...mockTask(), state: 'pending_confirm' });
      // findUniqueOrThrow (inside transition) → pending_confirm → valid transition
      prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...mockTask(), state: 'pending_confirm' });

      const res = await app.inject({
        method: 'POST', url: '/task/confirm',
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { task_id: TASK_ID, price_final: 450, payment_method: 'cash_on_delivery' },
      });

      expect(res.statusCode, res.body).toBe(200);
      const body = res.json();
      expect(body.state).toBe('published');
      taskState = 'published';
      // Reset to dynamic mocks
      prismaMock.task.findUnique.mockImplementation(() => Promise.resolve(mockTask()));
      prismaMock.task.findUniqueOrThrow.mockImplementation(() => Promise.resolve(mockTask()));
    });

    it('Нельзя подтвердить с нулевой ценой', async () => {
      const res = await app.inject({
        method: 'POST', url: '/task/confirm',
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { task_id: TASK_ID, price_final: 0, payment_method: 'cash_on_delivery' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ФАЗА 3: Лента — исполнитель видит задание
  // ───────────────────────────────────────────────────────────────────────────

  describe('Фаза 3 — Лента заданий', () => {

    it('Исполнитель: видит опубликованное задание в ленте', async () => {
      taskState = 'published';
      prismaMock.task.findMany.mockResolvedValueOnce([mockTask()]);

      const res = await app.inject({
        method: 'GET', url: '/tasks/feed?lat=55.75&lng=37.61',
        headers: { authorization: `Bearer ${executorJwt()}` },
      });

      expect(res.statusCode, res.body).toBe(200);
      const body = res.json();
      expect(Array.isArray(body.tasks)).toBe(true);
      expect(body.tasks.length).toBeGreaterThan(0);
      expect(body.tasks[0].category).toBe('shopping');
    });

    it('Клиент НЕ видит ленту исполнителей', async () => {
      const res = await app.inject({
        method: 'GET', url: '/tasks/feed?lat=55.75&lng=37.61',
        headers: { authorization: `Bearer ${clientJwt()}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ФАЗА 4: Принятие задания
  // ───────────────────────────────────────────────────────────────────────────

  describe('Фаза 4 — Принятие задания', () => {

    it('Клиент НЕ может принять задание', async () => {
      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/accept`,
        headers: { authorization: `Bearer ${clientJwt()}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('Исполнитель успешно принимает задание', async () => {
      taskState = 'published';
      prismaMock.task.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.task.findUnique.mockResolvedValueOnce({
        ...mockTask(), state: 'accepted', executorId: EXEC_ID,
      });

      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/accept`,
        headers: { authorization: `Bearer ${executorJwt()}` },
      });

      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().state).toBe('accepted');
      expect(res.json().task_id).toBe(TASK_ID);
      taskState = 'accepted';
    });

    it('409 если задание уже занято другим исполнителем', async () => {
      prismaMock.task.updateMany.mockResolvedValueOnce({ count: 0 });
      prismaMock.task.findUnique.mockResolvedValueOnce({
        ...mockTask(), state: 'accepted', executorId: 'another-executor-id',
      });

      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/accept`,
        headers: { authorization: `Bearer ${executorJwt()}` },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ФАЗА 5: Выполнение — start → problem → respond
  // ───────────────────────────────────────────────────────────────────────────

  describe('Фаза 5 — Выполнение задания', () => {

    it('Исполнитель: начинает выполнение (accepted → in_progress)', async () => {
      taskState = 'accepted';
      prismaMock.task.findUnique.mockResolvedValue({ ...mockTask(), state: 'accepted', executorId: EXEC_ID });
      prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...mockTask(), state: 'accepted', executorId: EXEC_ID });

      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/start`,
        headers: { authorization: `Bearer ${executorJwt()}` },
      });

      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().state).toBe('in_progress');
      taskState = 'in_progress';
      prismaMock.task.findUnique.mockImplementation(() => Promise.resolve(mockTask()));
      prismaMock.task.findUniqueOrThrow.mockImplementation(() => Promise.resolve(mockTask()));
    });

    it('Клиент НЕ может стартовать задание', async () => {
      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/start`,
        headers: { authorization: `Bearer ${clientJwt()}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('Исполнитель: сообщает о проблеме (нет товара)', async () => {
      taskState = 'in_progress';
      prismaMock.task.findUnique.mockResolvedValue({ ...mockTask(), state: 'in_progress', executorId: EXEC_ID });
      prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...mockTask(), state: 'in_progress', executorId: EXEC_ID });

      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/problem`,
        headers: { authorization: `Bearer ${executorJwt()}` },
        payload: {
          problem_type:   'item_not_available',
          content:        'Молока 3.2% нет, есть 2.5% — взять?',
          photo_url:      'https://cdn.quicky.app/photos/milk-2.5.jpg',
          price_proposed: 440,
        },
      });

      expect(res.statusCode, res.body).toBe(200);
      const body = res.json();
      expect(body.state).toBe('pending_client');
      expect(body.message_id).toBeTruthy();
      expect(body.expires_at).toBeTruthy();
      taskState = 'pending_client';
      prismaMock.task.findUnique.mockImplementation(() => Promise.resolve(mockTask()));
      prismaMock.task.findUniqueOrThrow.mockImplementation(() => Promise.resolve(mockTask()));
    });

    it('Нельзя сообщить о проблеме без problem_type', async () => {
      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/problem`,
        headers: { authorization: `Bearer ${executorJwt()}` },
        payload: { content: 'что-то пошло не так' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('Клиент: принимает замену (pending_client → in_progress)', async () => {
      taskState = 'pending_client';
      prismaMock.task.findUnique.mockResolvedValue({ ...mockTask(), state: 'pending_client', executorId: EXEC_ID });
      prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...mockTask(), state: 'pending_client', executorId: EXEC_ID });
      prismaMock.taskMessage.findUnique.mockResolvedValue({
        id: MSG_ID, taskId: TASK_ID, messageType: 'item_not_available',
      });

      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/respond`,
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { message_id: MSG_ID, response_type: 'accept' },
      });

      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().state).toBe('in_progress');
      taskState = 'in_progress';
      prismaMock.task.findUnique.mockImplementation(() => Promise.resolve(mockTask()));
      prismaMock.task.findUniqueOrThrow.mockImplementation(() => Promise.resolve(mockTask()));
    });

    it('Клиент: может отклонить замену (→ cancelled)', async () => {
      taskState = 'pending_client';
      prismaMock.task.findUnique.mockResolvedValueOnce({ ...mockTask(), state: 'pending_client', executorId: EXEC_ID });
      prismaMock.task.findUniqueOrThrow.mockResolvedValueOnce({ ...mockTask(), state: 'pending_client', executorId: EXEC_ID });
      prismaMock.taskMessage.findUnique.mockResolvedValueOnce({
        id: MSG_ID, taskId: TASK_ID, messageType: 'item_not_available',
      });

      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/respond`,
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { message_id: MSG_ID, response_type: 'reject' },
      });

      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().state).toBe('cancelled');
      taskState = 'in_progress'; // сбрасываем для следующих фаз
    });

    it('Исполнитель НЕ может отвечать на своё же сообщение', async () => {
      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/respond`,
        headers: { authorization: `Bearer ${executorJwt()}` },
        payload: { message_id: MSG_ID, response_type: 'accept' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ФАЗА 6: Завершение через QR
  // ───────────────────────────────────────────────────────────────────────────

  describe('Фаза 6 — Завершение (QR)', () => {

    it('Клиент: получает QR-payload для подтверждения', async () => {
      taskState = 'in_progress';
      prismaMock.task.findUnique.mockResolvedValue({ ...mockTask(), state: 'in_progress', executorId: EXEC_ID });

      const res = await app.inject({
        method: 'GET', url: `/task/${TASK_ID}/completion-qr`,
        headers: { authorization: `Bearer ${clientJwt()}` },
      });

      expect(res.statusCode, res.body).toBe(200);
      const body = res.json();
      expect(body.task_id).toBe(TASK_ID);
      expect(body.token).toBe(QR_TOKEN);
      const payload = JSON.parse(body.payload);
      expect(payload.type).toBe('quicky_task_completion');
      expect(payload.task_id).toBe(TASK_ID);
    });

    it('Исполнитель НЕ может получить QR клиента', async () => {
      prismaMock.task.findUnique.mockResolvedValueOnce({ ...mockTask(), state: 'in_progress', executorId: EXEC_ID });
      const res = await app.inject({
        method: 'GET', url: `/task/${TASK_ID}/completion-qr`,
        headers: { authorization: `Bearer ${executorJwt()}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('403 при неверном QR токене', async () => {
      prismaMock.task.findUnique.mockResolvedValueOnce({ ...mockTask(), state: 'in_progress', executorId: EXEC_ID });
      prismaMock.task.findUniqueOrThrow.mockResolvedValueOnce({ ...mockTask(), state: 'in_progress', executorId: EXEC_ID });

      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/complete-qr`,
        headers: { authorization: `Bearer ${executorJwt()}` },
        payload: { token: 'WRONG-TOKEN-HACKER' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('Исполнитель: сканирует QR и завершает задание (in_progress → completed)', async () => {
      taskState = 'in_progress';
      prismaMock.task.findUnique.mockResolvedValue({ ...mockTask(), state: 'in_progress', executorId: EXEC_ID });
      prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...mockTask(), state: 'in_progress', executorId: EXEC_ID });

      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/complete-qr`,
        headers: { authorization: `Bearer ${executorJwt()}` },
        payload: { token: QR_TOKEN },
      });

      expect(res.statusCode, res.body).toBe(200);
      const body = res.json();
      expect(body.state).toBe('completed');
      expect(body.confirmed_by).toBe('qr');
      taskState = 'completed';
      prismaMock.task.findUnique.mockImplementation(() => Promise.resolve(mockTask()));
      prismaMock.task.findUniqueOrThrow.mockImplementation(() => Promise.resolve(mockTask()));
    });

    it('410 при попытке завершить без QR (прямой /complete)', async () => {
      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/complete`,
        headers: { authorization: `Bearer ${executorJwt()}` },
        payload: {},
      });
      expect(res.statusCode).toBe(410);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ФАЗА 7: Оценка
  // ───────────────────────────────────────────────────────────────────────────

  describe('Фаза 7 — Взаимная оценка', () => {

    beforeAll(() => {
      taskState = 'completed';
      prismaMock.task.findUnique.mockImplementation(() =>
        Promise.resolve({ ...mockTask(), state: 'completed', executorId: EXEC_ID }),
      );
      prismaMock.rating.findFirst.mockResolvedValue(null);
    });

    it('Клиент: ставит оценку исполнителю (5 звёзд)', async () => {
      const res = await app.inject({
        method: 'POST', url: '/rating',
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: {
          task_id:  TASK_ID,
          ratee_id: EXEC_ID,
          stars:    5,
          comment:  'Привёз быстро и точно, спасибо!',
        },
      });

      expect(res.statusCode, res.body).toBe(201);
      expect(res.json().rating_id).toBeTruthy();
    });

    it('Исполнитель: ставит оценку клиенту (4 звезды)', async () => {
      const res = await app.inject({
        method: 'POST', url: '/rating',
        headers: { authorization: `Bearer ${executorJwt()}` },
        payload: {
          task_id:  TASK_ID,
          ratee_id: CLIENT_ID,
          stars:    4,
          comment:  'Хороший клиент, точно описал заказ',
        },
      });

      expect(res.statusCode, res.body).toBe(201);
    });

    it('400 оценка 6 звёзд невозможна', async () => {
      const res = await app.inject({
        method: 'POST', url: '/rating',
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { task_id: TASK_ID, ratee_id: EXEC_ID, stars: 6 },
      });
      expect(res.statusCode).toBe(400);
    });

    it('400 оценка 0 звёзд невозможна', async () => {
      const res = await app.inject({
        method: 'POST', url: '/rating',
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { task_id: TASK_ID, ratee_id: EXEC_ID, stars: 0 },
      });
      expect(res.statusCode).toBe(400);
    });

    it('409 нельзя оценить дважды', async () => {
      prismaMock.rating.findFirst.mockResolvedValueOnce({ id: 'existing-rating' });
      const res = await app.inject({
        method: 'POST', url: '/rating',
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { task_id: TASK_ID, ratee_id: EXEC_ID, stars: 5 },
      });
      expect(res.statusCode).toBe(409);
    });

    it('403 нельзя оценить постороннего пользователя', async () => {
      const res = await app.inject({
        method: 'POST', url: '/rating',
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { task_id: TASK_ID, ratee_id: '00000000-ffff-ffff-ffff-000000000000', stars: 5 },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ФАЗА 8: Отмена и спор
  // ───────────────────────────────────────────────────────────────────────────

  describe('Фаза 8 — Отмена и спор', () => {

    it('Клиент: может отменить задание со статусом accepted', async () => {
      prismaMock.task.findUnique.mockResolvedValueOnce({
        ...mockTask(), state: 'accepted', executorId: EXEC_ID,
      });
      prismaMock.task.findUniqueOrThrow.mockResolvedValueOnce({
        ...mockTask(), state: 'accepted', executorId: EXEC_ID,
      });

      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/cancel`,
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { reason: 'передумал' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().state).toBe('cancelled');
    });

    it('400 отмена без причины запрещена', async () => {
      const res = await app.inject({
        method: 'POST', url: `/task/${TASK_ID}/cancel`,
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('Клиент: открывает спор после завершения', async () => {
      // dispute route: findUnique (state check) + taskService.transition → findUniqueOrThrow
      prismaMock.task.findUnique.mockResolvedValueOnce({
        ...mockTask(), state: 'completed', clientId: CLIENT_ID, executorId: EXEC_ID,
      });
      prismaMock.task.findUniqueOrThrow.mockResolvedValueOnce({
        ...mockTask(), state: 'completed', clientId: CLIENT_ID, executorId: EXEC_ID,
      });

      const res = await app.inject({
        method: 'POST', url: '/dispute',
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: {
          task_id:      TASK_ID,
          dispute_type: 'not_delivered',
          description:  'Молоко было просроченным',
        },
      });

      expect(res.statusCode, res.body).toBe(201);
      expect(res.json().dispute_id).toBeTruthy();
    });

    it('403 исполнитель НЕ может открывать споры', async () => {
      prismaMock.task.findUnique.mockResolvedValueOnce({
        ...mockTask(), state: 'completed', clientId: CLIENT_ID, executorId: EXEC_ID,
      });
      const res = await app.inject({
        method: 'POST', url: '/dispute',
        headers: { authorization: `Bearer ${executorJwt()}` },
        payload: { task_id: TASK_ID, dispute_type: 'not_delivered', description: 'тест' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('409 спор нельзя открыть по незавершённому заданию', async () => {
      prismaMock.task.findUnique.mockResolvedValueOnce({
        ...mockTask(), state: 'in_progress', clientId: CLIENT_ID, executorId: EXEC_ID,
      });
      const res = await app.inject({
        method: 'POST', url: '/dispute',
        headers: { authorization: `Bearer ${clientJwt()}` },
        payload: { task_id: TASK_ID, dispute_type: 'wrong_item', description: 'не то привезли' },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ФАЗА 9: Безопасность — перекрёстные роли
  // ───────────────────────────────────────────────────────────────────────────

  describe('Фаза 9 — Безопасность: перекрёстные роли', () => {

    it('Без токена → 401 на любом защищённом роуте', async () => {
      const res = await app.inject({ method: 'GET', url: '/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('Клиент не может смотреть ленту (feed)', async () => {
      const res = await app.inject({
        method: 'GET', url: '/tasks/feed?lat=55.75&lng=37.61',
        headers: { authorization: `Bearer ${clientJwt()}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('Исполнитель не может создавать заказы (parse)', async () => {
      const res = await app.inject({
        method: 'POST', url: '/task/parse',
        headers: { authorization: `Bearer ${executorJwt()}` },
        payload: { text: 'Купи кофе' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('Истёкший токен → 401', async () => {
      const expiredToken = jwt.sign(
        { userId: CLIENT_ID, role: 'client', phone: '+71112223344' },
        JWT_SECRET, { expiresIn: '-1s' },
      );
      const res = await app.inject({
        method: 'GET', url: '/auth/me',
        headers: { authorization: `Bearer ${expiredToken}` },
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
