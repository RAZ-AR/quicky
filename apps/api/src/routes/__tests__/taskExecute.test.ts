import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import jwt from 'jsonwebtoken';
import fp from 'fastify-plugin';
import authPlugin from '../../plugins/auth.js';
import taskExecuteRoutes from '../task/execute.js';

const JWT_SECRET = 'dev-secret-change-in-production';
const TASK_ID    = '550e8400-e29b-41d4-a716-446655440001';
const CLIENT_ID  = '550e8400-e29b-41d4-a716-446655440002';
const EXEC_ID    = '550e8400-e29b-41d4-a716-446655440003';
const MSG_ID     = '550e8400-e29b-41d4-a716-446655440004';
const QR_TOKEN   = 'qr-token-1234567890';

// ─── Базовые моки задания ─────────────────────────────────────────────────────

const baseTask = {
  id: TASK_ID, clientId: CLIENT_ID, executorId: EXEC_ID,
  completionQrToken: QR_TOKEN,
  state: 'in_progress', category: 'buy_deliver', title: 'Купить кофе',
  itemDescription: 'Латте', fromAddress: null, fromLat: null, fromLng: null,
  toAddress: 'Блок 45', toLat: 44.81, toLng: 20.46,
  priceFinal: 900, priceSuggested: 900, scheduledFor: null, expiresAt: null,
  rawVoiceText: null, clarificationStep: 0, clarificationData: [],
  city: 'Belgrade', specialNotes: null, createdAt: new Date(), updatedAt: new Date(),
  client: { id: CLIENT_ID, ratingAvg: 4.5, ratingCount: 10 },
  executor: { id: EXEC_ID },
};

const prismaMock = {
  task: {
    findUnique:        vi.fn().mockResolvedValue({ ...baseTask }),
    findUniqueOrThrow: vi.fn().mockResolvedValue({ ...baseTask }),
    update:            vi.fn().mockResolvedValue({ ...baseTask }),
    updateMany:        vi.fn().mockResolvedValue({ count: 1 }),
    findMany:          vi.fn().mockResolvedValue([]),
  },
  taskStateTransition: { create: vi.fn().mockResolvedValue({}) },
  taskMessage: {
    create:     vi.fn().mockResolvedValue({ id: MSG_ID, taskId: TASK_ID, messageType: 'item_not_available' }),
    findUnique: vi.fn().mockResolvedValue({ id: MSG_ID, taskId: TASK_ID, messageType: 'item_not_available' }),
    update:     vi.fn().mockResolvedValue({}),
  },
  rating: {
    findFirst: vi.fn().mockResolvedValue(null),
    create:    vi.fn().mockResolvedValue({ id: 'rating-id' }),
    aggregate: vi.fn().mockResolvedValue({ _avg: { stars: 4.5 }, _count: { stars: 5 } }),
    count:     vi.fn().mockResolvedValue(2),
  },
  dispute: { create: vi.fn().mockResolvedValue({ id: 'dispute-id' }) },
  user: { update: vi.fn().mockResolvedValue({}) },
  $transaction: vi.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(fp(async (f) => { f.decorate('prisma', prismaMock as never); }));
  await app.register(authPlugin);
  await app.register(multipart);
  await app.register(taskExecuteRoutes);
  await app.ready();
  return app;
}

const clientToken   = () => jwt.sign({ userId: CLIENT_ID, role: 'client',   phone: '+1' }, JWT_SECRET);
const executorToken = () => jwt.sign({ userId: EXEC_ID,   role: 'executor', phone: '+2' }, JWT_SECRET);

// ─── accept ───────────────────────────────────────────────────────────────────

describe('POST /task/:id/accept', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => { vi.clearAllMocks(); app = await buildApp(); });

  it('403 для клиента', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/accept`,
      headers: { authorization: `Bearer ${clientToken()}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('200 исполнитель принимает задание', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/accept`,
      headers: { authorization: `Bearer ${executorToken()}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.state).toBe('accepted');
    expect(body.task_id).toBe(TASK_ID);
  });

  it('409 если задание уже занято (updateMany вернул count=0)', async () => {
    prismaMock.task.updateMany.mockResolvedValueOnce({ count: 0 });
    prismaMock.task.findUnique.mockResolvedValueOnce({ ...baseTask, executorId: CLIENT_ID });
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/accept`,
      headers: { authorization: `Bearer ${executorToken()}` },
    });
    expect(res.statusCode).toBe(409);
  });
});

// ─── start ────────────────────────────────────────────────────────────────────

describe('POST /task/:id/start', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUnique.mockResolvedValue({ ...baseTask, state: 'accepted', client: baseTask.client, executor: baseTask.executor });
    prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...baseTask, state: 'accepted' });
    app = await buildApp();
  });

  it('200 исполнитель начинает задание', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/start`,
      headers: { authorization: `Bearer ${executorToken()}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().state).toBe('in_progress');
  });

  it('403 клиент не может начать', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/start`,
      headers: { authorization: `Bearer ${clientToken()}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─── problem ──────────────────────────────────────────────────────────────────

describe('POST /task/:id/problem', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUnique.mockResolvedValue({ ...baseTask, state: 'in_progress', client: baseTask.client, executor: baseTask.executor });
    prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...baseTask, state: 'in_progress' });
    app = await buildApp();
  });

  it('400 без problem_type', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/problem`,
      headers: { authorization: `Bearer ${executorToken()}` },
      payload: { content: 'нет в наличии' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('200 исполнитель сообщает о проблеме', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/problem`,
      headers: { authorization: `Bearer ${executorToken()}` },
      payload: { problem_type: 'item_not_available', content: 'Нет латте' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.state).toBe('pending_client');
    expect(body.message_id).toBeTruthy();
    expect(body.expires_at).toBeTruthy();
  });

  it('200 предложение замены с ценой и фото', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/problem`,
      headers: { authorization: `Bearer ${executorToken()}` },
      payload: {
        problem_type: 'item_not_available',
        content: 'Нет латте, есть капучино',
        photo_url: 'https://example.com/photo.jpg',
        price_proposed: 850,
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it('409 если задание не in_progress', async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce({
      ...baseTask, state: 'pending_client', client: baseTask.client, executor: baseTask.executor,
    });
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/problem`,
      headers: { authorization: `Bearer ${executorToken()}` },
      payload: { problem_type: 'need_clarification', content: 'какой размер?' },
    });
    expect(res.statusCode).toBe(409);
  });
});

// ─── respond ──────────────────────────────────────────────────────────────────

describe('POST /task/:id/respond', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUnique.mockResolvedValue({
      ...baseTask, state: 'pending_client', client: baseTask.client, executor: baseTask.executor,
    });
    prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...baseTask, state: 'pending_client' });
    prismaMock.taskMessage.findUnique.mockResolvedValue({
      id: MSG_ID, taskId: TASK_ID, messageType: 'item_not_available',
    });
    app = await buildApp();
  });

  it('200 клиент принимает замену', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/respond`,
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: { message_id: MSG_ID, response_type: 'accept' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().state).toBe('in_progress');
  });

  it('200 клиент отклоняет → отмена задания', async () => {
    prismaMock.task.findUniqueOrThrow.mockResolvedValueOnce({ ...baseTask, state: 'pending_client' });
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/respond`,
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: { message_id: MSG_ID, response_type: 'reject' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().state).toBe('cancelled');
  });

  it('403 исполнитель не может отвечать', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/respond`,
      headers: { authorization: `Bearer ${executorToken()}` },
      payload: { message_id: MSG_ID, response_type: 'accept' },
    });
    expect(res.statusCode).toBe(403);
  });
});

// ─── completion QR ────────────────────────────────────────────────────────────

describe('GET /task/:id/completion-qr', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUnique.mockResolvedValue({
      ...baseTask,
      state: 'in_progress',
      client: baseTask.client,
      executor: baseTask.executor,
    });
    app = await buildApp();
  });

  it('200 заказчик получает payload для QR', async () => {
    const res = await app.inject({
      method: 'GET', url: `/task/${TASK_ID}/completion-qr`,
      headers: { authorization: `Bearer ${clientToken()}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.task_id).toBe(TASK_ID);
    expect(body.token).toBe(QR_TOKEN);
    expect(JSON.parse(body.payload)).toEqual({
      type: 'quicky_task_completion',
      task_id: TASK_ID,
      token: QR_TOKEN,
    });
  });

  it('403 исполнитель не может получить QR заказчика', async () => {
    const res = await app.inject({
      method: 'GET', url: `/task/${TASK_ID}/completion-qr`,
      headers: { authorization: `Bearer ${executorToken()}` },
    });

    expect(res.statusCode).toBe(403);
  });
});

describe('POST /task/:id/complete', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUnique.mockResolvedValue({ ...baseTask, state: 'in_progress', client: baseTask.client, executor: baseTask.executor });
    prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...baseTask, state: 'in_progress' });
    app = await buildApp();
  });

  it('410 прямое завершение выключено', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/complete`,
      headers: { authorization: `Bearer ${executorToken()}` },
      payload: {},
    });

    expect(res.statusCode).toBe(410);
  });

  it('410 клиент тоже не может завершить без QR', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/complete`,
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: {},
    });

    expect(res.statusCode).toBe(410);
  });
});

describe('POST /task/:id/complete-qr', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUnique.mockResolvedValue({
      ...baseTask,
      state: 'in_progress',
      client: baseTask.client,
      executor: baseTask.executor,
    });
    prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...baseTask, state: 'in_progress' });
    app = await buildApp();
  });

  it('200 исполнитель завершает задание после сканирования QR', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/complete-qr`,
      headers: { authorization: `Bearer ${executorToken()}` },
      payload: { token: QR_TOKEN },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().state).toBe('completed');
    expect(res.json().confirmed_by).toBe('qr');
  });

  it('403 отклоняет неправильный QR токен', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/complete-qr`,
      headers: { authorization: `Bearer ${executorToken()}` },
      payload: { token: 'wrong-token-123456' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('403 клиент не может подтвердить выполнение QR кодом', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/complete-qr`,
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: { token: QR_TOKEN },
    });

    expect(res.statusCode).toBe(403);
  });
});

// ─── cancel ───────────────────────────────────────────────────────────────────

describe('POST /task/:id/cancel', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUnique.mockResolvedValue({ ...baseTask, state: 'accepted', client: baseTask.client, executor: baseTask.executor });
    prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...baseTask, state: 'accepted' });
    app = await buildApp();
  });

  it('200 клиент отменяет', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/cancel`,
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: { reason: 'передумал' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().state).toBe('cancelled');
  });

  it('200 исполнитель отменяет', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/cancel`,
      headers: { authorization: `Bearer ${executorToken()}` },
      payload: { reason: 'не могу выполнить' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('400 без причины', async () => {
    const res = await app.inject({
      method: 'POST', url: `/task/${TASK_ID}/cancel`,
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─── rating ───────────────────────────────────────────────────────────────────

describe('POST /rating', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUnique.mockResolvedValue({ ...baseTask, state: 'completed' });
    prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...baseTask, state: 'completed' });
    prismaMock.rating.findFirst.mockResolvedValue(null);
    app = await buildApp();
  });

  it('201 успешная оценка', async () => {
    prismaMock.rating.count.mockResolvedValueOnce(1); // ещё не обе оценки
    const res = await app.inject({
      method: 'POST', url: '/rating',
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: { task_id: TASK_ID, ratee_id: EXEC_ID, stars: 5, comment: 'Отлично!' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().rating_id).toBeTruthy();
  });

  it('400 звёзды вне диапазона 1-5', async () => {
    const res = await app.inject({
      method: 'POST', url: '/rating',
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: { task_id: TASK_ID, ratee_id: EXEC_ID, stars: 6 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('403 нельзя подменить пользователя для оценки', async () => {
    const res = await app.inject({
      method: 'POST', url: '/rating',
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: {
        task_id: TASK_ID,
        ratee_id: '550e8400-e29b-41d4-a716-446655440099',
        stars: 5,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('409 нельзя оставить оценку дважды', async () => {
    prismaMock.rating.findFirst.mockResolvedValueOnce({ id: 'existing-rating' });

    const res = await app.inject({
      method: 'POST', url: '/rating',
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: { task_id: TASK_ID, ratee_id: EXEC_ID, stars: 5 },
    });

    expect(res.statusCode).toBe(409);
  });
});

// ─── dispute ──────────────────────────────────────────────────────────────────

describe('POST /dispute', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUnique.mockResolvedValue({ ...baseTask, state: 'completed', clientId: CLIENT_ID });
    prismaMock.task.findUniqueOrThrow.mockResolvedValue({ ...baseTask, state: 'completed' });
    app = await buildApp();
  });

  it('201 клиент открывает спор', async () => {
    const res = await app.inject({
      method: 'POST', url: '/dispute',
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: { task_id: TASK_ID, dispute_type: 'not_delivered', description: 'не привезли' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.dispute_id).toBeTruthy();
    expect(['open', 'resolved']).toContain(body.status);
  });

  it('403 исполнитель не может открыть спор', async () => {
    const res = await app.inject({
      method: 'POST', url: '/dispute',
      headers: { authorization: `Bearer ${executorToken()}` },
      payload: { task_id: TASK_ID, dispute_type: 'not_delivered' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('409 спор нельзя открыть по незавершённому заданию', async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce({ ...baseTask, state: 'in_progress', clientId: CLIENT_ID });
    const res = await app.inject({
      method: 'POST', url: '/dispute',
      headers: { authorization: `Bearer ${clientToken()}` },
      payload: { task_id: TASK_ID, dispute_type: 'wrong_item' },
    });
    expect(res.statusCode).toBe(409);
  });
});
