import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateOtp, verifyOtp } from '../otp.js';

// ─── Mock Redis ───────────────────────────────────────────────────────────────

const store = new Map<string, string>();
const expiry = new Map<string, number>(); // key → expiry timestamp

const redisMock = {
  async get(key: string) {
    const exp = expiry.get(key);
    if (exp && Date.now() > exp) {
      store.delete(key);
      expiry.delete(key);
      return null;
    }
    return store.get(key) ?? null;
  },
  async set(key: string, value: string, ...args: unknown[]) {
    store.set(key, value);
    const exIdx = (args as string[]).findIndex((a) => a === 'EX');
    if (exIdx !== -1) {
      expiry.set(key, Date.now() + Number(args[exIdx + 1]) * 1000);
    }
  },
  async del(key: string) {
    store.delete(key);
    expiry.delete(key);
  },
} as never;

beforeEach(() => {
  store.clear();
  expiry.clear();
  vi.unstubAllEnvs();
});

describe('generateOtp', () => {
  it('в dev-режиме всегда возвращает 1234', async () => {
    const code = await generateOtp('+381601234567', redisMock);
    expect(code).toBe('1234');
  });

  it('в production генерирует 6-значный код', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const code = await generateOtp('+381601234567', redisMock);
    expect(code).toMatch(/^\d{6}$/);
  });
});

describe('verifyOtp', () => {
  it('успешная верификация', async () => {
    await generateOtp('+381601234567', redisMock);
    const result = await verifyOtp('+381601234567', '1234', redisMock);
    expect(result.success).toBe(true);
  });

  it('ошибка: OTP не запрашивался', async () => {
    const result = await verifyOtp('+381600000000', '1234', redisMock);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('not_found');
  });

  it('ошибка: неверный код', async () => {
    await generateOtp('+381601234567', redisMock);
    const result = await verifyOtp('+381601234567', '0000', redisMock);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('invalid');
  });

  it('ошибка: истёкший OTP', async () => {
    vi.useFakeTimers();
    await generateOtp('+381601234567', redisMock);
    vi.advanceTimersByTime(121_000); // 121 секунда
    const result = await verifyOtp('+381601234567', '1234', redisMock);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('not_found'); // TTL истёк → not_found
    vi.useRealTimers();
  });

  it('ошибка: превышено число попыток (3)', async () => {
    await generateOtp('+381601234567', redisMock);
    await verifyOtp('+381601234567', 'wrong', redisMock);
    await verifyOtp('+381601234567', 'wrong', redisMock);
    await verifyOtp('+381601234567', 'wrong', redisMock);
    const result = await verifyOtp('+381601234567', '1234', redisMock);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('too_many_attempts');
  });

  it('OTP одноразовый — повторная верификация не работает', async () => {
    await generateOtp('+381601234567', redisMock);
    await verifyOtp('+381601234567', '1234', redisMock);
    const result = await verifyOtp('+381601234567', '1234', redisMock);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe('not_found');
  });

  it('разные телефоны не мешают друг другу', async () => {
    await generateOtp('+381601111111', redisMock);
    await generateOtp('+381602222222', redisMock);
    expect((await verifyOtp('+381601111111', '1234', redisMock)).success).toBe(true);
    expect((await verifyOtp('+381602222222', '1234', redisMock)).success).toBe(true);
  });
});
