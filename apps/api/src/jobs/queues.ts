import { Queue } from 'bullmq';

// ─── Имена очередей ───────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  TIMEOUT:     'task-timeout',
  TASK_EXPIRE: 'task-expire',
} as const;

// ─── Типы задач ───────────────────────────────────────────────────────────────

export interface TimeoutJobData {
  taskId:    string;
  messageId: string;
  clientId:  string;
}

export interface TaskExpireJobData {
  taskId: string;
}

// ─── Синглтоны очередей ───────────────────────────────────────────────────────

const REDIS_URL = () => process.env.REDIS_URL ?? 'redis://localhost:6379';

let _timeoutQueue:    Queue<TimeoutJobData>    | null = null;
let _taskExpireQueue: Queue<TaskExpireJobData> | null = null;

export function getTimeoutQueue(): Queue<TimeoutJobData> {
  if (!_timeoutQueue) {
    _timeoutQueue = new Queue<TimeoutJobData>(QUEUE_NAMES.TIMEOUT, {
      connection: { url: REDIS_URL() },
    });
  }
  return _timeoutQueue;
}

export function getTaskExpireQueue(): Queue<TaskExpireJobData> {
  if (!_taskExpireQueue) {
    _taskExpireQueue = new Queue<TaskExpireJobData>(QUEUE_NAMES.TASK_EXPIRE, {
      connection: { url: REDIS_URL() },
    });
  }
  return _taskExpireQueue;
}

function isJobsEnabled() {
  return process.env.NODE_ENV !== 'test' && process.env.ENABLE_JOBS !== 'false';
}

export async function scheduleClientTimeout(
  taskId: string,
  messageId: string,
  clientId: string,
  delayMs = 3 * 60 * 1000,
) {
  if (!isJobsEnabled()) return;
  const queue = getTimeoutQueue();

  // Предупреждение за 30 секунд до таймаута
  await queue.add('warning', { taskId, messageId, clientId }, {
    delay: delayMs - 30_000,
    jobId: `warn:${messageId}`,
  });

  // Сам таймаут
  await queue.add('timeout', { taskId, messageId, clientId }, {
    delay: delayMs,
    jobId: `timeout:${messageId}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

export async function cancelClientTimeout(messageId: string) {
  if (!isJobsEnabled()) return;
  const queue = getTimeoutQueue();
  await Promise.all([
    queue.remove(`warn:${messageId}`),
    queue.remove(`timeout:${messageId}`),
  ]);
}

export async function scheduleTaskExpiry(
  taskId: string,
  delayMs = 24 * 60 * 60 * 1000,
) {
  if (!isJobsEnabled()) return;
  const queue = getTaskExpireQueue();
  await queue.add('expire', { taskId }, {
    delay: delayMs,
    jobId: `expire:${taskId}`,
    attempts: 2,
  });
}
