import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import jwt from 'jsonwebtoken';
import authPlugin from '../../plugins/auth.js';
import taskCreateRoutes from '../task/create.js';

const JWT_SECRET = 'dev-secret-change-in-production';

// ─── Мок Prisma ───────────────────────────────────────────────────────────────

const TASK_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_ID = '550e8400-e29b-41d4-a716-446655440002';
const OTHER_ID = '550e8400-e29b-41d4-a716-446655440003';

const mockTask = {
  id: TASK_ID,
  clientId: USER_ID,
  executorId: null,
  state: 'draft',
  category: 'buy_deliver',
  title: 'Купить кофе',
  itemDescription: 'Латте',
  fromAddress: 'Starbucks',
  fromLat: null, fromLng: null,
  toAddress: 'Блок 45',
  toLat: null, toLng: null,
  priceSuggested: 900,
  priceFinal: null,
  scheduledFor: null,
  expiresAt: null,
  rawVoiceText: null,
  clarificationStep: 0,
  clarificationData: [],
  city: 'Belgrade',
  specialNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  client: { id: USER_ID, name: 'Иван' },
  executor: null,
};

const prismaMock = {
  task: {
    create:            vi.fn().mockResolvedValue(mockTask),
    update:            vi.fn().mockResolvedValue({ ...mockTask, state: 'published' }),
    findUnique:        vi.fn().mockResolvedValue({ ...mockTask, client: mockTask.client, executor: null }),
    findUniqueOrThrow: vi.fn().mockResolvedValue(mockTask),
    findMany:          vi.fn().mockResolvedValue([mockTask]),
  },
  taskStateTransition: {
    create: vi.fn().mockResolvedValue({}),
  },
  payment: {
    create: vi.fn().mockResolvedValue({}),
  },
  $transaction: vi.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
};

// ─── Fastify-плагин-заглушка для Prisma и Redis ──────────────────────────────

import fp from 'fastify-plugin';

const redisStore = new Map<string, string>();
const redisMock = {
  async get(key: string) { return redisStore.get(key) ?? null; },
  async set(key: string, value: string) { redisStore.set(key, value); },
  async del(key: string) { redisStore.delete(key); },
};

const fakePrismaPlugin = fp(async (fastify) => {
  fastify.decorate('prisma', prismaMock as never);
});

const fakeRedisPlugin = fp(async (fastify) => {
  fastify.decorate('redis', redisMock as never);
});

// ─── Хелпер: создать тестовый сервер ─────────────────────────────────────────

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(fakePrismaPlugin);
  await app.register(fakeRedisPlugin);
  await app.register(authPlugin);
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(taskCreateRoutes);
  await app.ready();
  return app;
}

function makeToken() {
  return jwt.sign({ userId: USER_ID, role: 'client', phone: '+381601234567' }, JWT_SECRET);
}

// ─── Тесты ────────────────────────────────────────────────────────────────────

describe('POST /task/parse', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUniqueOrThrow.mockResolvedValue(mockTask);
    app = await buildApp();
  });

  it('401 без токена', async () => {
    const res = await app.inject({ method: 'POST', url: '/task/parse', payload: { text: 'купи кофе' } });
    expect(res.statusCode).toBe(401);
  });

  it('400 если текст слишком короткий', async () => {
    const token = makeToken();
    const res = await app.inject({
      method: 'POST', url: '/task/parse',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'ab' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('201 возвращает task_id и состояние', async () => {
    const token = makeToken();
    const res = await app.inject({
      method: 'POST', url: '/task/parse',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'купи большой латте в Starbucks и доставь в Блок 45' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.task_id).toBeTruthy();
    expect(['draft', 'pending_confirm']).toContain(body.state);
    expect(body.parsed).toBeDefined();
  });

  it('возвращает next_question если есть missing_fields', async () => {
    const token = makeToken();
    const res = await app.inject({
      method: 'POST', url: '/task/parse',
      headers: { authorization: `Bearer ${token}` },
      payload: { text: 'missing сделай что-нибудь непонятно' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    // Mock парсер возвращает missing_fields для текста с "missing"
    if (body.state === 'draft') {
      expect(body.next_question).not.toBeNull();
      expect(body.next_question.field).toBeTruthy();
      expect(body.next_question.step).toBe(1);
    }
  });
});

describe('POST /task/clarify', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  it('400 при невалидном UUID', async () => {
    const token = makeToken();
    const res = await app.inject({
      method: 'POST', url: '/task/clarify',
      headers: { authorization: `Bearer ${token}` },
      payload: { task_id: 'not-a-uuid', field_answered: 'to_location', answer: 'Блок 45' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('403 если задание чужое', async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce({
      ...mockTask, clientId: OTHER_ID, state: 'draft',
    });
    const token = makeToken();
    const res = await app.inject({
      method: 'POST', url: '/task/clarify',
      headers: { authorization: `Bearer ${token}` },
      payload: { task_id: TASK_ID, field_answered: 'to_location', answer: 'Блок 45' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('409 если задание не в состоянии draft', async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce({
      ...mockTask, state: 'published',
    });
    const token = makeToken();
    const res = await app.inject({
      method: 'POST', url: '/task/clarify',
      headers: { authorization: `Bearer ${token}` },
      payload: { task_id: TASK_ID, field_answered: 'to_location', answer: 'Блок 45' },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('POST /task/confirm', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.task.findUnique.mockResolvedValue({
      ...mockTask,
      state: 'pending_confirm',
      client: mockTask.client,
      executor: null,
    });
    prismaMock.task.findUniqueOrThrow.mockResolvedValue({
      ...mockTask, state: 'pending_confirm',
    });
    prismaMock.task.update.mockResolvedValue({ ...mockTask, state: 'published' });
    app = await buildApp();
  });

  it('400 без price_final', async () => {
    const token = makeToken();
    const res = await app.inject({
      method: 'POST', url: '/task/confirm',
      headers: { authorization: `Bearer ${token}` },
      payload: { task_id: TASK_ID },
    });
    expect(res.statusCode).toBe(400);
  });

  it('400 если price_final отрицательная', async () => {
    const token = makeToken();
    const res = await app.inject({
      method: 'POST', url: '/task/confirm',
      headers: { authorization: `Bearer ${token}` },
      payload: { task_id: TASK_ID, price_final: -100 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('200 успешное подтверждение', async () => {
    const token = makeToken();
    const res = await app.inject({
      method: 'POST', url: '/task/confirm',
      headers: { authorization: `Bearer ${token}` },
      payload: { task_id: TASK_ID, price_final: 900, payment_method: 'cash_on_delivery' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.task_id).toBe(TASK_ID);
    expect(body.state).toBe('published');
    expect(body.published_at).toBeTruthy();
  });
});

describe('GET /task/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  it('200 владелец видит своё задание', async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce({
      ...mockTask, client: mockTask.client, executor: null,
    });
    const token = makeToken();
    const res = await app.inject({
      method: 'GET', url: '/task/task-uuid-1',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.task.id).toBe(TASK_ID);
  });

  it('403 чужое задание', async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce({
      ...mockTask, clientId: 'other-user', executorId: null,
      client: { id: 'other-user' }, executor: null,
    });
    const token = makeToken();
    const res = await app.inject({
      method: 'GET', url: '/task/task-uuid-1',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('404 несуществующее задание', async () => {
    prismaMock.task.findUnique.mockResolvedValueOnce(null);
    const token = makeToken();
    const res = await app.inject({
      method: 'GET', url: '/task/task-uuid-1',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /tasks/my', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  it('200 возвращает список заданий', async () => {
    const token = makeToken();
    const res = await app.inject({
      method: 'GET', url: '/tasks/my',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.tasks)).toBe(true);
  });
});
