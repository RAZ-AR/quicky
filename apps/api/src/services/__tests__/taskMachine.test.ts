import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  getAvailableTransitions,
  isFinalState,
  isCancellable,
  type TaskState,
  type TransitionContext,
} from '../taskMachine.js';

// ─── Хелпер ───────────────────────────────────────────────────────────────────

function ctx(role: 'client' | 'executor' | 'system'): TransitionContext {
  return { taskId: 'task-1', actorId: 'user-1', actorRole: role };
}

// ─── Валидные переходы ────────────────────────────────────────────────────────

describe('validateTransition — валидные переходы', () => {
  const cases: [TaskState, TaskState, ReturnType<typeof ctx>][] = [
    ['draft',           'pending_confirm', ctx('system')],
    ['pending_confirm', 'published',       ctx('client')],
    ['pending_confirm', 'draft',           ctx('client')],
    ['published',       'accepted',        ctx('executor')],
    ['accepted',        'in_progress',     ctx('executor')],
    ['in_progress',     'pending_client',  ctx('executor')],
    ['in_progress',     'completed',       ctx('executor')],
    ['pending_client',  'in_progress',     ctx('client')],
    ['completed',       'rated',           ctx('system')],
    ['completed',       'disputed',        ctx('client')],
    ['disputed',        'completed',       ctx('system')],
  ];

  it.each(cases)('%s → %s (%s)', (from, to, context) => {
    const result = validateTransition(from, to, context);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.from).toBe(from);
      expect(result.to).toBe(to);
      expect(result.timestamp).toBeInstanceOf(Date);
    }
  });
});

// ─── Недопустимые переходы ────────────────────────────────────────────────────

describe('validateTransition — недопустимые переходы', () => {
  it('нельзя прыгнуть через состояние (draft → published)', () => {
    const result = validateTransition('draft', 'published', ctx('client'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('INVALID_TRANSITION');
  });

  it('нельзя вернуться назад (completed → in_progress)', () => {
    const result = validateTransition('completed', 'in_progress', ctx('executor'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('INVALID_TRANSITION');
  });

  it('нельзя перейти из финального состояния (rated → любое)', () => {
    const result = validateTransition('rated', 'completed', ctx('system'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('INVALID_TRANSITION');
  });

  it('нельзя перейти из cancelled (cancelled → published)', () => {
    const result = validateTransition('cancelled', 'published', ctx('client'));
    expect(result.success).toBe(false);
  });
});

// ─── Проверка прав актора ─────────────────────────────────────────────────────

describe('validateTransition — права актора', () => {
  it('исполнитель не может подтвердить задание (pending_confirm → published)', () => {
    const result = validateTransition('pending_confirm', 'published', ctx('executor'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('UNAUTHORIZED_ACTOR');
  });

  it('клиент не может принять задание (published → accepted)', () => {
    const result = validateTransition('published', 'accepted', ctx('client'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('UNAUTHORIZED_ACTOR');
  });

  it('клиент не может завершить задание (in_progress → completed)', () => {
    const result = validateTransition('in_progress', 'completed', ctx('client'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('UNAUTHORIZED_ACTOR');
  });

  it('только система может перевести в rated', () => {
    expect(validateTransition('completed', 'rated', ctx('client')).success).toBe(false);
    expect(validateTransition('completed', 'rated', ctx('executor')).success).toBe(false);
    expect(validateTransition('completed', 'rated', ctx('system')).success).toBe(true);
  });

  it('исполнитель не может открыть спор (completed → disputed)', () => {
    const result = validateTransition('completed', 'disputed', ctx('executor'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('UNAUTHORIZED_ACTOR');
  });
});

// ─── Уже в нужном состоянии ───────────────────────────────────────────────────

describe('validateTransition — ALREADY_IN_STATE', () => {
  it('возвращает ошибку если from === to', () => {
    const result = validateTransition('published', 'published', ctx('client'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe('ALREADY_IN_STATE');
  });
});

// ─── Хелперы ──────────────────────────────────────────────────────────────────

describe('getAvailableTransitions', () => {
  it('draft имеет 2 перехода', () => {
    expect(getAvailableTransitions('draft')).toHaveLength(2);
  });

  it('rated не имеет переходов', () => {
    expect(getAvailableTransitions('rated')).toHaveLength(0);
  });

  it('cancelled не имеет переходов', () => {
    expect(getAvailableTransitions('cancelled')).toHaveLength(0);
  });
});

describe('isFinalState', () => {
  it('rated — финальное состояние', () => {
    expect(isFinalState('rated')).toBe(true);
  });

  it('cancelled — финальное состояние', () => {
    expect(isFinalState('cancelled')).toBe(true);
  });

  it('published — не финальное', () => {
    expect(isFinalState('published')).toBe(false);
  });
});

describe('isCancellable', () => {
  const cancellable: TaskState[] = [
    'draft', 'pending_confirm', 'published',
    'accepted', 'in_progress', 'pending_client',
  ];
  const notCancellable: TaskState[] = ['completed', 'rated', 'cancelled'];

  it.each(cancellable)('%s можно отменить', (state) => {
    expect(isCancellable(state)).toBe(true);
  });

  it.each(notCancellable)('%s нельзя отменить', (state) => {
    expect(isCancellable(state)).toBe(false);
  });
});

// ─── Полный жизненный цикл задания ───────────────────────────────────────────

describe('полный жизненный цикл', () => {
  it('счастливый путь: draft → rated', () => {
    const steps: [TaskState, TaskState, ReturnType<typeof ctx>][] = [
      ['draft',           'pending_confirm', ctx('system')],
      ['pending_confirm', 'published',       ctx('client')],
      ['published',       'accepted',        ctx('executor')],
      ['accepted',        'in_progress',     ctx('executor')],
      ['in_progress',     'completed',       ctx('executor')],
      ['completed',       'rated',           ctx('system')],
    ];

    for (const [from, to, context] of steps) {
      const result = validateTransition(from, to, context);
      expect(result.success, `${from} → ${to} должен быть успешным`).toBe(true);
    }
  });

  it('путь с уточнением: in_progress → pending_client → in_progress → completed', () => {
    expect(validateTransition('in_progress', 'pending_client', ctx('executor')).success).toBe(true);
    expect(validateTransition('pending_client', 'in_progress', ctx('client')).success).toBe(true);
    expect(validateTransition('in_progress', 'completed', ctx('executor')).success).toBe(true);
  });

  it('путь со спором: completed → disputed → completed → rated', () => {
    expect(validateTransition('completed', 'disputed', ctx('client')).success).toBe(true);
    expect(validateTransition('disputed', 'completed', ctx('system')).success).toBe(true);
    expect(validateTransition('completed', 'rated', ctx('system')).success).toBe(true);
  });
});
