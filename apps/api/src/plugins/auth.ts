import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

// ─── Типы токена ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  role: 'client' | 'executor' | 'admin';
  phone: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// ─── Auth плагин ──────────────────────────────────────────────────────────────

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    sign: { expiresIn: '30d' },
  });

  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized', message: 'Токен недействителен или отсутствует' });
    }
  });
});

export default authPlugin;
