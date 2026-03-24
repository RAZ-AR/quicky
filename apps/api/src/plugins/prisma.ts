import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { FastifyPluginAsync } from 'fastify';

// ─── Prisma плагин ────────────────────────────────────────────────────────────
// Создаёт единственный экземпляр PrismaClient и добавляет его в fastify.
// Корректно отключает соединение при остановке сервера.

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

  await prisma.$connect();

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});

export default prismaPlugin;
