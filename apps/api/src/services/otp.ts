// ─── OTP сервис ───────────────────────────────────────────────────────────────
// Хранит OTP в Redis с TTL 120 сек.
// В dev-режиме OTP всегда "1234" и логируется в консоль.

import type { Redis } from 'ioredis';

interface OtpRecord {
  code: string;
  attempts: number;
}

const MAX_ATTEMPTS = 3;
const TTL_SECONDS = 120;

function otpKey(phone: string): string {
  return `otp:${phone}`;
}

export async function generateOtp(phone: string, redis: Redis): Promise<string> {
  const code = process.env.NODE_ENV === 'production'
    ? String(Math.floor(100000 + Math.random() * 900000)) // 6 цифр
    : '1234';

  const record: OtpRecord = { code, attempts: 0 };
  await redis.set(otpKey(phone), JSON.stringify(record), 'EX', TTL_SECONDS);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[OTP] ${phone} → ${code}`);
  }

  return code;
}

export type VerifyResult =
  | { success: true }
  | { success: false; reason: 'not_found' | 'expired' | 'invalid' | 'too_many_attempts' };

export async function verifyOtp(phone: string, code: string, redis: Redis): Promise<VerifyResult> {
  const raw = await redis.get(otpKey(phone));
  if (!raw) return { success: false, reason: 'not_found' };

  const record: OtpRecord = JSON.parse(raw);

  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(otpKey(phone));
    return { success: false, reason: 'too_many_attempts' };
  }

  if (record.code !== code) {
    record.attempts += 1;
    // Сохраняем обновлённое число попыток, оставляем TTL без изменений через KEEPTTL
    await redis.set(otpKey(phone), JSON.stringify(record), 'KEEPTTL');
    return { success: false, reason: 'invalid' };
  }

  await redis.del(otpKey(phone)); // одноразовый
  return { success: true };
}
