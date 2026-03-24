import type { PrismaClient } from '@prisma/client';
import { validateTransition } from './taskMachine.js';
import type { ActorRole, TaskState } from './taskMachine.js';

// ─── Сервис задания ───────────────────────────────────────────────────────────
// Инкапсулирует все операции с заданиями в БД.
// Все переходы состояний проходят через validateTransition.

export class TaskService {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Создать черновик задания ─────────────────────────────────────────────────

  async createDraft(clientId: string, data: {
    rawVoiceText?: string;
    category: string;
    title: string;
    itemDescription?: string;
    fromAddress?: string;
    fromLat?: number;
    fromLng?: number;
    toAddress: string;
    toLat?: number;
    toLng?: number;
    priceSuggested?: number;
    clarificationData?: object[];
    clarificationStep?: number;
  }) {
    return this.prisma.task.create({
      data: {
        clientId,
        rawVoiceText:     data.rawVoiceText,
        category:         data.category as never,
        title:            data.title,
        itemDescription:  data.itemDescription,
        fromAddress:      data.fromAddress,
        fromLat:          data.fromLat,
        fromLng:          data.fromLng,
        toAddress:        data.toAddress ?? '',
        toLat:            data.toLat,
        toLng:            data.toLng,
        priceSuggested:   data.priceSuggested,
        clarificationData: data.clarificationData ?? [],
        clarificationStep: data.clarificationStep ?? 0,
        state:            'draft',
      },
    });
  }

  // ── Обновить черновик ────────────────────────────────────────────────────────

  async updateDraft(taskId: string, data: {
    title?: string;
    itemDescription?: string;
    fromAddress?: string;
    toAddress?: string;
    priceSuggested?: number;
    clarificationData?: object[];
    clarificationStep?: number;
  }) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        clarificationData: data.clarificationData as never,
        updatedAt: new Date(),
      },
    });
  }

  // ── Переход состояния с записью в журнал ─────────────────────────────────────

  async transition(
    taskId: string,
    toState: TaskState,
    actor: { id: string; role: ActorRole },
    reason?: string,
    metadata?: Record<string, unknown>,
  ) {
    const task = await this.prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    const fromState = task.state as TaskState;

    const result = validateTransition(fromState, toState, {
      taskId,
      actorId: actor.id,
      actorRole: actor.role,
      reason,
      metadata,
    });

    if (!result.success) {
      throw new TransitionError(result.code, result.message);
    }

    // Атомарная операция: обновляем состояние + пишем журнал
    const [updated] = await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id: taskId },
        data: { state: toState },
      }),
      this.prisma.taskStateTransition.create({
        data: {
          taskId,
          fromState,
          toState,
          triggeredBy: actor.role === 'system' ? null : actor.id,
          reason,
          metadata: metadata as never,
        },
      }),
    ]);

    return updated;
  }

  // ── Получить задание ─────────────────────────────────────────────────────────

  async findById(taskId: string) {
    return this.prisma.task.findUnique({
      where: { id: taskId },
      include: { client: true, executor: true },
    });
  }

  // ── Получить задания клиента ─────────────────────────────────────────────────

  async findByClient(clientId: string) {
    return this.prisma.task.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// ─── Кастомная ошибка перехода ────────────────────────────────────────────────

export class TransitionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TransitionError';
  }
}
