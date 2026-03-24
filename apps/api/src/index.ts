import 'dotenv/config';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import prismaPlugin from './plugins/prisma.js';
import redisPlugin from './plugins/redis.js';
import authPlugin from './plugins/auth.js';
import socketPlugin from './plugins/socket.js';
import authRoutes from './routes/auth.js';
import taskCreateRoutes from './routes/task/create.js';
import taskFeedRoutes from './routes/task/feed.js';
import taskExecuteRoutes from './routes/task/execute.js';
import uploadRoutes from './routes/upload.js';
import { startTimeoutWorker, startTaskExpireWorker } from './jobs/worker.js';

const fastify = Fastify({
  logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' },
});

async function start() {
  await fastify.register(prismaPlugin);
  await fastify.register(redisPlugin);
  await fastify.register(authPlugin);
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await fastify.register(socketPlugin);

  await fastify.register(authRoutes);
  await fastify.register(taskCreateRoutes);
  await fastify.register(taskFeedRoutes);
  await fastify.register(taskExecuteRoutes);
  await fastify.register(uploadRoutes);

  fastify.get('/health', async () => ({ status: 'ok', ts: new Date() }));

  const port = Number(process.env.PORT ?? 3000);
  await fastify.listen({ port, host: '0.0.0.0' });

  // Воркеры BullMQ — запускаем после старта сервера
  startTimeoutWorker(fastify.prisma, fastify.io);
  startTaskExpireWorker(fastify.prisma, fastify.io);

  console.log(`Server running on http://localhost:${port}`);
}

start().catch((err) => { console.error(err); process.exit(1); });
