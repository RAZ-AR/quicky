import { Worker } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import type { Server } from 'socket.io';
import { QUEUE_NAMES } from './queues.js';
import type { TimeoutJobData, TaskExpireJobData } from './queues.js';
import { sendPushToUser } from '../services/pushService.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// ─── Воркер: таймаут ответа клиента ──────────────────────────────────────────

export function startTimeoutWorker(prisma: PrismaClient, io: Server): Worker {
  return new Worker<TimeoutJobData>(
    QUEUE_NAMES.TIMEOUT,
    async (job) => {
      const { taskId, messageId, clientId } = job.data;

      // Предупреждение — 30 секунд до таймаута
      if (job.name === 'warning') {
        io.to(`task:${taskId}`).emit('timeout_warning', {
          message_id: messageId,
          seconds_remaining: 30,
        });
        sendPushToUser(prisma, clientId, '⏰ Ответьте исполнителю', 'У вас 30 секунд для ответа на сообщение', { task_id: taskId }).catch(() => {});
        return;
      }

      // Таймаут истёк — проверяем задание всё ещё ждёт
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task || task.state !== 'pending_client') return; // уже ответили

      const message = await prisma.taskMessage.findUnique({ where: { id: messageId } });
      if (!message || message.isResolved) return;

      // Авто-резолюция: отменяем задание, уведомляем
      await prisma.taskMessage.update({
        where: { id: messageId },
        data: { isResolved: true, selectedOption: 'system_timeout' },
      });

      await prisma.taskStateTransition.create({
        data: {
          taskId,
          fromState: 'pending_client',
          toState:   'cancelled',
          reason:    'Клиент не ответил в течение 3 минут',
          metadata:  { messageId, clientId } as never,
        },
      });

      await prisma.task.update({
        where: { id: taskId },
        data:  { state: 'cancelled' },
      });

      // Уведомляем через Socket.io
      io.to(`task:${taskId}`).emit('task_state_changed', {
        task_id:      taskId,
        new_state:    'cancelled',
        triggered_by: null,
      });

      io.to(`task:${taskId}`).emit('message_resolved', {
        message_id: messageId,
        resolution: 'system_timeout',
      });

      // Push: исполнителю сообщаем что задание отменено
      const cancelledTask = await prisma.task.findUnique({ where: { id: taskId } });
      if (cancelledTask?.executorId) {
        sendPushToUser(prisma, cancelledTask.executorId, '❌ Задание отменено', 'Клиент не ответил — задание отменено автоматически', { task_id: taskId }).catch(() => {});
      }
    },
    { connection: { url: REDIS_URL }, concurrency: 10 },
  );
}

export function startTaskExpireWorker(prisma: PrismaClient, io: Server): Worker {
  return new Worker<TaskExpireJobData>(
    QUEUE_NAMES.TASK_EXPIRE,
    async (job) => {
      const { taskId } = job.data;
      const task = await prisma.task.findUnique({ where: { id: taskId } });

      if (!task || task.state !== 'published') return;

      await prisma.task.update({ where: { id: taskId }, data: { state: 'cancelled' } });
      await prisma.taskStateTransition.create({
        data: { taskId, fromState: 'published', toState: 'cancelled', reason: 'Срок задания истёк' },
      });

      io.to(`task:${taskId}`).emit('task_state_changed', {
        task_id:      taskId,
        new_state:    'cancelled',
        triggered_by: null,
      });
    },
    { connection: { url: REDIS_URL }, concurrency: 5 },
  );
}
