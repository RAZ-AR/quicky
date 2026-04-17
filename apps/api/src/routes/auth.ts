import type { FastifyPluginAsync } from 'fastify';
import { createHash, createHmac } from 'node:crypto';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// ─── Google ───────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_IDS = [
  process.env.GOOGLE_IOS_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
  process.env.GOOGLE_WEB_CLIENT_ID,
].filter(Boolean) as string[];

const googleClient = new OAuth2Client();

async function verifyGoogleToken(idToken: string) {
  for (const audience of GOOGLE_CLIENT_IDS) {
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience });
      const p = ticket.getPayload()!;
      return { sub: p.sub, email: p.email ?? null, name: p.name ?? null, picture: p.picture ?? null };
    } catch {}
  }
  throw new Error('Invalid Google token');
}

// ─── Apple ────────────────────────────────────────────────────────────────────
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID ?? 'com.quicky.app';

async function verifyAppleToken(identityToken: string) {
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer:   'https://appleid.apple.com',
    audience: APPLE_BUNDLE_ID,
  });
  return {
    sub:   payload.sub as string,
    email: (payload.email as string | undefined) ?? null,
  };
}

// ─── Telegram ─────────────────────────────────────────────────────────────────
const TG_BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN  ?? '';
const TG_BOT_NAME   = process.env.TELEGRAM_BOT_NAME   ?? '';
const TG_SESSION_TTL = 300; // сек — время жизни temp-сессии виджета

interface TelegramAuthData {
  id: number; first_name: string; last_name?: string;
  username?: string; photo_url?: string; auth_date: number; hash: string;
}

function verifyTelegramHash(data: TelegramAuthData): boolean {
  const { hash, ...rest } = data;
  const str = Object.entries(rest)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHash('sha256').update(TG_BOT_TOKEN).digest();
  const computed = createHmac('sha256', secret).update(str).digest('hex');
  return computed === hash;
}

// ─── Temp session (Redis) ─────────────────────────────────────────────────────
const TEMP_TTL = 600; // 10 мин

async function createTempSession(
  redis: { set: Function },
  data: { provider: string; providerId: string; name: string | null; avatar: string | null; email: string | null },
): Promise<string> {
  const token = createHash('sha256')
    .update(`${data.providerId}:${Date.now()}:${Math.random()}`)
    .digest('hex');
  await redis.set(`social_temp:${token}`, JSON.stringify(data), 'EX', TEMP_TTL);
  return token;
}

async function consumeTempSession(
  redis: { get: Function; del: Function },
  token: string,
) {
  const raw = await redis.get(`social_temp:${token}`);
  if (!raw) throw new Error('Session expired');
  await redis.del(`social_temp:${token}`);
  return JSON.parse(raw) as { provider: string; providerId: string; name: string | null; avatar: string | null; email: string | null };
}

// ─── Схемы ────────────────────────────────────────────────────────────────────
const SocialCompleteBody = z.object({
  temp_token: z.string().min(16),
  name:       z.string().min(2).max(100),
  role:       z.enum(['client', 'executor']),
});

const RegisterBody = z.object({
  name: z.string().min(2).max(100),
  role: z.enum(['client', 'executor']),
});

// ─── Роуты ────────────────────────────────────────────────────────────────────
const authRoutes: FastifyPluginAsync = async (fastify) => {

  // ── POST /auth/google ────────────────────────────────────────────────────────
  fastify.post('/auth/google', async (req, reply) => {
    const { id_token } = req.body as { id_token?: string };
    if (!id_token) return reply.status(400).send({ error: 'Validation', message: 'id_token required' });

    let google: { sub: string; email: string | null; name: string | null; picture: string | null };
    try {
      google = await verifyGoogleToken(id_token);
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid Google token' });
    }

    // Ищем по googleId
    let user = await fastify.prisma.user.findUnique({ where: { googleId: google.sub } });

    // Или по email (если был аккаунт с телефоном/другим провайдером)
    if (!user && google.email) {
      const byEmail = await fastify.prisma.user.findFirst({ where: { phone: google.email } });
      if (byEmail) {
        user = await fastify.prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId: google.sub },
        });
      }
    }

    if (user) {
      const token = fastify.jwt.sign({ userId: user.id, role: user.role });
      return reply.send({ token, user: toUserDTO(user), is_new_user: false });
    }

    // Новый пользователь → temp session
    const temp_token = await createTempSession(fastify.redis, {
      provider:   'google',
      providerId: google.sub,
      name:       google.name,
      avatar:     google.picture,
      email:      google.email,
    });

    return reply.send({ is_new_user: true, temp_token, suggested_name: google.name ?? '' });
  });

  // ── POST /auth/apple ─────────────────────────────────────────────────────────
  fastify.post('/auth/apple', async (req, reply) => {
    const { identity_token, full_name } = req.body as { identity_token?: string; full_name?: string };
    if (!identity_token) return reply.status(400).send({ error: 'Validation', message: 'identity_token required' });

    let apple: { sub: string; email: string | null };
    try {
      apple = await verifyAppleToken(identity_token);
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid Apple token' });
    }

    let user = await fastify.prisma.user.findUnique({ where: { appleId: apple.sub } });

    if (user) {
      const token = fastify.jwt.sign({ userId: user.id, role: user.role });
      return reply.send({ token, user: toUserDTO(user), is_new_user: false });
    }

    const temp_token = await createTempSession(fastify.redis, {
      provider:   'apple',
      providerId: apple.sub,
      name:       full_name ?? null,
      avatar:     null,
      email:      apple.email,
    });

    return reply.send({ is_new_user: true, temp_token, suggested_name: full_name ?? '' });
  });

  // ── GET /auth/telegram/widget ────────────────────────────────────────────────
  // Возвращает HTML страницу с виджетом Telegram Login
  fastify.get('/auth/telegram/widget', async (req, reply) => {
    const { session_id } = req.query as { session_id?: string };
    if (!session_id) return reply.status(400).send('Missing session_id');

    const callbackUrl = `${process.env.API_BASE_URL ?? 'http://localhost:3000'}/auth/telegram/callback?session_id=${session_id}`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Quicky — Вход через Telegram</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: -apple-system, sans-serif; display:flex; flex-direction:column;
         align-items:center; justify-content:center; min-height:100vh; margin:0;
         background:#0f0f13; color:#fff; gap:20px; }
  .logo { font-size:48px; }
  h2 { margin:0; font-size:22px; font-weight:800; }
  p  { margin:0; color:rgba(255,255,255,0.55); font-size:14px; }
</style></head>
<body>
  <div class="logo">⚡</div>
  <h2>Войти в Quicky</h2>
  <p>через Telegram</p>
  <script async src="https://telegram.org/js/telegram-widget.js?22"
    data-telegram-login="${TG_BOT_NAME}"
    data-size="large"
    data-auth-url="${callbackUrl}"
    data-request-access="write"></script>
</body></html>`;

    return reply.type('text/html').send(html);
  });

  // ── GET /auth/telegram/callback ──────────────────────────────────────────────
  // Telegram редиректит сюда с данными пользователя
  fastify.get('/auth/telegram/callback', async (req, reply) => {
    const q = req.query as Record<string, string>;
    const { session_id, hash, ...authFields } = q;

    if (!session_id || !hash) return reply.status(400).send('Invalid callback');

    const tgData: TelegramAuthData = {
      id:         Number(authFields.id),
      first_name: authFields.first_name ?? '',
      last_name:  authFields.last_name,
      username:   authFields.username,
      photo_url:  authFields.photo_url,
      auth_date:  Number(authFields.auth_date),
      hash,
    };

    if (!verifyTelegramHash(tgData)) {
      return reply.status(401).send('Hash mismatch');
    }

    // Проверяем свежесть (5 минут)
    if (Date.now() / 1000 - tgData.auth_date > 300) {
      return reply.status(401).send('Auth data expired');
    }

    // Ищем или создаём пользователя
    let user = await fastify.prisma.user.findUnique({ where: { telegramId: BigInt(tgData.id) } });
    let jwt_token: string;

    if (user) {
      jwt_token = fastify.jwt.sign({ userId: user.id, role: user.role });
      // Сохраняем JWT в Redis, приложение подберёт
      await fastify.redis.set(`tg_session:${session_id}`, JSON.stringify({ jwt: jwt_token, is_new_user: false }), 'EX', TG_SESSION_TTL);
      return reply.redirect(`quicky://auth/telegram?done=1`);
    }

    // Новый пользователь
    const name = [tgData.first_name, tgData.last_name].filter(Boolean).join(' ');
    const temp_token = await createTempSession(fastify.redis, {
      provider:   'telegram',
      providerId: String(tgData.id),
      name:       name || null,
      avatar:     tgData.photo_url ?? null,
      email:      null,
    });

    await fastify.redis.set(
      `tg_session:${session_id}`,
      JSON.stringify({ temp_token, is_new_user: true, suggested_name: name }),
      'EX', TG_SESSION_TTL,
    );

    return reply.redirect(`quicky://auth/telegram?done=1`);
  });

  // ── GET /auth/telegram/poll ──────────────────────────────────────────────────
  // Приложение поллит этот endpoint пока пользователь авторизуется в браузере
  fastify.get('/auth/telegram/poll', async (req, reply) => {
    const { session_id } = req.query as { session_id?: string };
    if (!session_id) return reply.status(400).send({ error: 'Validation', message: 'session_id required' });

    const raw = await fastify.redis.get(`tg_session:${session_id}`);
    if (!raw) return reply.send({ status: 'pending' });

    const data = JSON.parse(raw) as { jwt?: string; temp_token?: string; is_new_user: boolean; suggested_name?: string };
    await fastify.redis.del(`tg_session:${session_id}`);

    return reply.send({ status: 'done', ...data });
  });

  // ── POST /auth/social-complete ───────────────────────────────────────────────
  // Новый пользователь выбирает имя и роль после social login
  fastify.post('/auth/social-complete', async (req, reply) => {
    const body = SocialCompleteBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const { temp_token, name, role } = body.data;

    let session: { provider: string; providerId: string; name: string | null; avatar: string | null; email: string | null };
    try {
      session = await consumeTempSession(fastify.redis, temp_token);
    } catch {
      return reply.status(410).send({ error: 'Gone', message: 'Сессия истекла. Войдите снова.' });
    }

    // Создаём пользователя
    const userData: Record<string, unknown> = {
      name,
      role,
      avatarFromSocial: session.avatar,
    };

    if (session.provider === 'google')   userData.googleId   = session.providerId;
    if (session.provider === 'apple')    userData.appleId    = session.providerId;
    if (session.provider === 'telegram') userData.telegramId = BigInt(session.providerId);

    const user = await fastify.prisma.user.create({ data: userData as any });
    const token = fastify.jwt.sign({ userId: user.id, role: user.role });

    return reply.status(201).send({ token, user: toUserDTO(user), is_new_user: true });
  });

  // ── GET /auth/me ─────────────────────────────────────────────────────────────
  fastify.get('/auth/me', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const user = await fastify.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return reply.status(404).send({ error: 'NotFound', message: 'Пользователь не найден' });
    return reply.send({ user: toUserDTO(user) });
  });

  // ── PATCH /auth/me ───────────────────────────────────────────────────────────
  fastify.patch('/auth/me', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const schema = z.object({
      name:       z.string().min(2).max(100).optional(),
      avatar_url: z.string().url().nullable().optional(),
      location:   z.object({ lat: z.number(), lng: z.number() }).optional(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }
    const d: Record<string, unknown> = {};
    if (body.data.name !== undefined)      d.name      = body.data.name;
    if (body.data.avatar_url !== undefined) d.avatarUrl = body.data.avatar_url;
    if (body.data.location) {
      d.locationLat = body.data.location.lat;
      d.locationLng = body.data.location.lng;
      d.locationUpdatedAt = new Date();
    }
    const user = await fastify.prisma.user.update({ where: { id: req.user.userId }, data: d });
    return reply.send({ user: toUserDTO(user) });
  });

  // ── POST /auth/push-token ────────────────────────────────────────────────────
  fastify.post('/auth/push-token', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const body = z.object({ token: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation' });
    await fastify.prisma.user.update({
      where: { id: req.user.userId },
      data:  { pushToken: body.data.token },
    });
    return reply.send({ ok: true });
  });

  // ── (legacy) OTP — оставляем как fallback ────────────────────────────────────
  fastify.post('/auth/register', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const body = RegisterBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    const user = await fastify.prisma.user.update({
      where: { id: req.user.userId },
      data:  { name: body.data.name, role: body.data.role },
    });
    const token = fastify.jwt.sign({ userId: user.id, role: user.role });
    return reply.send({ token, user: toUserDTO(user) });
  });
};

// ─── DTO ─────────────────────────────────────────────────────────────────────
function toUserDTO(user: {
  id: string; phone?: string | null; name: string; role: string;
  avatarUrl?: string | null; avatarFromSocial?: string | null;
  ratingAvg: unknown; ratingCount: number;
  completionRate: unknown; isVerified: boolean; createdAt: Date;
}) {
  return {
    id:              user.id,
    phone:           user.phone ?? null,
    name:            user.name,
    role:            user.role,
    avatar_url:      user.avatarUrl ?? user.avatarFromSocial ?? null,
    rating_avg:      Number(user.ratingAvg),
    rating_count:    user.ratingCount,
    completion_rate: Number(user.completionRate),
    is_verified:     user.isVerified,
    created_at:      user.createdAt,
  };
}

export default authRoutes;
