// ─── Машина состояний задания ─────────────────────────────────────────────────
// Все переходы состояний проходят через этот файл.
// AI никогда не управляет потоком — только этот модуль.

export type TaskState =
  | 'draft'            // создаётся, идут уточнения
  | 'pending_confirm'  // клиент подтверждает карточку
  | 'published'        // видна исполнителям
  | 'accepted'         // исполнитель принял
  | 'in_progress'      // исполнитель выполняет
  | 'pending_client'   // ждём ответа клиента (таймаут 3 мин)
  | 'completed'        // исполнитель завершил
  | 'rated'            // обе стороны поставили оценки
  | 'cancelled'        // отменено
  | 'disputed';        // открыт спор

export type ActorRole = 'client' | 'executor' | 'system';

export interface TransitionContext {
  taskId: string;
  actorId: string;
  actorRole: ActorRole;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionResult {
  success: true;
  from: TaskState;
  to: TaskState;
  context: TransitionContext;
  timestamp: Date;
}

export interface TransitionError {
  success: false;
  code: TransitionErrorCode;
  message: string;
  from: TaskState;
  attempted: TaskState;
}

export type TransitionErrorCode =
  | 'INVALID_TRANSITION'
  | 'UNAUTHORIZED_ACTOR'
  | 'ALREADY_IN_STATE';

// ─── Разрешённые переходы ─────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  draft:           ['pending_confirm', 'cancelled'],
  pending_confirm: ['published', 'draft', 'cancelled'],
  published:       ['accepted', 'cancelled'],
  accepted:        ['in_progress', 'cancelled'],
  in_progress:     ['pending_client', 'completed', 'cancelled'],
  pending_client:  ['in_progress', 'cancelled'],
  completed:       ['rated', 'disputed'],
  rated:           [],
  cancelled:       [],
  disputed:        ['completed', 'cancelled'],
};

// ─── Кто может инициировать переход ──────────────────────────────────────────
// null = любой актор

type TransitionKey = `${TaskState}->${TaskState}`;
const AUTHORIZED_ACTORS: Partial<Record<TransitionKey, ActorRole | null>> = {
  'draft->pending_confirm':     'system',
  'pending_confirm->published': 'client',
  'pending_confirm->draft':     'client',
  'pending_confirm->cancelled': 'client',
  'published->accepted':        'executor',
  'published->cancelled':       null,       // клиент или система
  'accepted->in_progress':      'executor',
  'accepted->cancelled':        null,
  'in_progress->pending_client':'executor',
  'in_progress->completed':     'executor',
  'in_progress->cancelled':     null,
  'pending_client->in_progress':'client',
  'pending_client->cancelled':  null,       // клиент или система (таймаут)
  'completed->rated':           'system',
  'completed->disputed':        'client',
  'disputed->completed':        'system',
  'disputed->cancelled':        'system',
};

// ─── Основная функция валидации перехода ──────────────────────────────────────

export function validateTransition(
  from: TaskState,
  to: TaskState,
  context: TransitionContext,
): TransitionResult | TransitionError {
  // Уже в нужном состоянии
  if (from === to) {
    return {
      success: false,
      code: 'ALREADY_IN_STATE',
      message: `Задание уже в состоянии "${to}"`,
      from,
      attempted: to,
    };
  }

  // Переход не существует
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    return {
      success: false,
      code: 'INVALID_TRANSITION',
      message: `Переход "${from}" → "${to}" недопустим`,
      from,
      attempted: to,
    };
  }

  // Проверка прав актора
  const key: TransitionKey = `${from}->${to}`;
  const requiredRole = AUTHORIZED_ACTORS[key];

  if (requiredRole !== undefined && requiredRole !== null) {
    if (context.actorRole !== requiredRole) {
      return {
        success: false,
        code: 'UNAUTHORIZED_ACTOR',
        message: `Переход "${from}" → "${to}" доступен только для роли "${requiredRole}", получено "${context.actorRole}"`,
        from,
        attempted: to,
      };
    }
  }

  return {
    success: true,
    from,
    to,
    context,
    timestamp: new Date(),
  };
}

// ─── Хелперы ──────────────────────────────────────────────────────────────────

/** Все доступные переходы из текущего состояния */
export function getAvailableTransitions(state: TaskState): TaskState[] {
  return VALID_TRANSITIONS[state];
}

/** Является ли состояние финальным (нет переходов) */
export function isFinalState(state: TaskState): boolean {
  return VALID_TRANSITIONS[state].length === 0;
}

/** Можно ли отменить задание из текущего состояния */
export function isCancellable(state: TaskState): boolean {
  return VALID_TRANSITIONS[state].includes('cancelled');
}

/** Требует ли переход определённой роли */
export function getRequiredRole(from: TaskState, to: TaskState): ActorRole | null | undefined {
  const key: TransitionKey = `${from}->${to}`;
  return AUTHORIZED_ACTORS[key];
}
