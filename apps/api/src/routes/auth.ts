import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateOtp, verifyOtp } from '../services/otp.js';

// ─── Схемы валидации ──────────────────────────────────────────────────────────

const SendOtpBody = z.object({
  phone: z.string().regex(/^\+?[0-9]{7,15}$/, 'Некорректный номер телефона'),
});

const VerifyOtpBody = z.object({
  phone: z.string(),
  otp: z.string().length(4, 'OTP должен быть 4 символа').or(z.string().length(6, 'OTP должен быть 6 символов')),
});

const RegisterBody = z.object({
  name: z.string().min(2).max(100),
  role: z.enum(['client', 'executor']),
});

// ─── Роуты авторизации ────────────────────────────────────────────────────────

const authRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /auth/send-otp
  fastify.post('/auth/send-otp', async (req, reply) => {
    const body = SendOtpBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const { phone } = body.data;

    // В продакшне здесь вызов Twilio/SMSC
    await generateOtp(phone, fastify.redis);

    return reply.send({
      message: 'OTP отправлен',
      expires_in: 120,
      // В dev — сообщаем что смотреть в консоль
      ...(process.env.NODE_ENV !== 'production' && { hint: 'Dev режим: используйте код 1234' }),
    });
  });

  // POST /auth/verify-otp
  fastify.post('/auth/verify-otp', async (req, reply) => {
    const body = VerifyOtpBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const { phone, otp } = body.data;
    const result = await verifyOtp(phone, otp, fastify.redis);

    if (!result.success) {
      const messages: Record<typeof result.reason, string> = {
        not_found:        'OTP не найден. Запросите новый код.',
        expired:          'OTP истёк. Запросите новый код.',
        invalid:          'Неверный код.',
        too_many_attempts:'Превышено число попыток. Запросите новый код.',
      };
      return reply.status(401).send({ error: 'OtpInvalid', message: messages[result.reason] });
    }

    // Ищем существующего пользователя
    const existingUser = await fastify.prisma.user.findUnique({ where: { phone } });

    if (existingUser) {
      const token = fastify.jwt.sign({
        userId: existingUser.id,
        role: existingUser.role,
        phone: existingUser.phone,
      });
      return reply.send({ token, user: toUserDTO(existingUser), is_new_user: false });
    }

    // Новый пользователь — нужна регистрация
    return reply.status(200).send({ is_new_user: true, phone });
  });

  // POST /auth/register  (только для новых пользователей)
  fastify.post('/auth/register', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    // Этот роут вызывается когда у нас уже есть временный токен без имени
    // Либо упрощённо: принимаем phone + name + role без токена (MVP)
    const body = RegisterBody.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const { userId } = req.user;
    const { name, role } = body.data;

    const user = await fastify.prisma.user.update({
      where: { id: userId },
      data: { name, role },
    });

    const token = fastify.jwt.sign({ userId: user.id, role: user.role, phone: user.phone });
    return reply.send({ token, user: toUserDTO(user) });
  });

  // POST /auth/register-new  (создание нового пользователя без токена)
  fastify.post('/auth/register-new', async (req, reply) => {
    const schema = RegisterBody.extend({ phone: z.string() });
    const body = schema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation', message: body.error.errors[0]?.message });
    }

    const { phone, name, role } = body.data;

    // Проверяем что телефон был верифицирован (OTP прошёл)
    // В реальном проекте — проверять по временному токену
    const existing = await fastify.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'Пользователь уже существует' });
    }

    const user = await fastify.prisma.user.create({ data: { phone, name, role } });
    const token = fastify.jwt.sign({ userId: user.id, role: user.role, phone: user.phone });

    return reply.status(201).send({ token, user: toUserDTO(user), is_new_user: true });
  });

  // GET /auth/me
  fastify.get('/auth/me', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const user = await fastify.prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return reply.status(404).send({ error: 'NotFound', message: 'Пользователь не найден' });
    return reply.send({ user: toUserDTO(user) });
  });

  // PATCH /auth/me — обновить профиль
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

    const updateData: Record<string, unknown> = {};
    if (body.data.name !== undefined)       updateData.name = body.data.name;
    if (body.data.avatar_url !== undefined)  updateData.avatarUrl = body.data.avatar_url;
    if (body.data.location) {
      updateData.locationLat = body.data.location.lat;
      updateData.locationLng = body.data.location.lng;
      updateData.locationUpdatedAt = new Date();
    }

    const user = await fastify.prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
    });

    return reply.send({ user: toUserDTO(user) });
  });

  // POST /auth/push-token — сохранить Expo push token
  fastify.post('/auth/push-token', {
    onRequest: async (req, reply) => fastify.authenticate(req, reply),
  }, async (req, reply) => {
    const body = z.object({ token: z.string().min(1) }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Validation' });

    await fastify.prisma.user.update({
      where: { id: req.user.userId },
      data: { pushToken: body.data.token },
    });
    return reply.send({ ok: true });
  });
};

// ─── DTO ─────────────────────────────────────────────────────────────────────

function toUserDTO(user: {
  id: string; phone: string; name: string; role: string;
  avatarUrl: string | null; ratingAvg: unknown; ratingCount: number;
  completionRate: unknown; isVerified: boolean; createdAt: Date;
}) {
  return {
    id:              user.id,
    phone:           user.phone,
    name:            user.name,
    role:            user.role,
    avatar_url:      user.avatarUrl,
    rating_avg:      Number(user.ratingAvg),
    rating_count:    user.ratingCount,
    completion_rate: Number(user.completionRate),
    is_verified:     user.isVerified,
    created_at:      user.createdAt,
  };
}

export default authRoutes;
