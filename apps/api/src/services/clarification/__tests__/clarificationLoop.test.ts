import { describe, it, expect, beforeEach } from 'vitest';
import { ClarificationLoop } from '../clarificationLoop.js';
import { MockAIProvider } from '../../ai/providers/mock.js';
import type { ParsedTaskDTO } from '../../ai/types.js';
import type { ClarificationSession } from '../types.js';

// ─── Фикстуры ─────────────────────────────────────────────────────────────────

const FULL_PARSED: ParsedTaskDTO = {
  category: 'buy_deliver',
  title: 'Купить кофе и доставить',
  item_description: 'Большой латте',
  from_location: { address: 'Starbucks, Knez Mihailova' },
  to_location: { address: 'Нови Београд, Блок 45' },
  scheduled_for: null,
  price_suggested: 900,
  missing_fields: [],
  confidence: 0.95,
};

const EMPTY_PARSED: ParsedTaskDTO = {
  category: null,
  title: null,
  item_description: null,
  from_location: null,
  to_location: null,
  scheduled_for: null,
  price_suggested: null,
  missing_fields: ['category', 'item_description', 'from_location', 'to_location', 'price'],
  confidence: 0.1,
};

const PARTIAL_PARSED: ParsedTaskDTO = {
  category: 'buy_deliver',
  title: 'Купить кофе',
  item_description: 'Латте',
  from_location: null,
  to_location: null,
  scheduled_for: null,
  price_suggested: null,
  missing_fields: ['from_location', 'to_location', 'price'],
  confidence: 0.6,
};

// ─── Тесты ────────────────────────────────────────────────────────────────────

describe('ClarificationLoop', () => {
  let loop: ClarificationLoop;

  beforeEach(() => {
    loop = new ClarificationLoop(new MockAIProvider());
  });

  // ── start() ────────────────────────────────────────────────────────────────

  describe('start()', () => {
    it('если все поля заполнены — сразу is_complete, без вопроса', async () => {
      const { session, next_question } = await loop.start('task-1', FULL_PARSED);

      expect(session.is_complete).toBe(true);
      expect(next_question).toBeNull();
      expect(session.step).toBe(0);
    });

    it('если есть missing_fields — возвращает первый вопрос', async () => {
      const { session, next_question } = await loop.start('task-1', PARTIAL_PARSED);

      expect(session.is_complete).toBe(false);
      expect(next_question).not.toBeNull();
      expect(next_question?.field).toBeTruthy();
    });

    it('сохраняет данные парсера в draft', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);

      expect(session.draft.category).toBe('buy_deliver');
      expect(session.draft.item_description).toBe('Латте');
      expect(session.draft.to_location).toBeNull();
    });

    it('сохраняет raw_voice_text', async () => {
      const raw = 'купи мне кофе';
      const { session } = await loop.start('task-1', FULL_PARSED, raw);
      expect(session.draft.raw_voice_text).toBe(raw);
    });

    it('сортирует поля по приоритету (to_location — первый)', async () => {
      const { session } = await loop.start('task-1', EMPTY_PARSED);
      expect(session.missing_fields[0]).toBe('to_location');
    });

    it('первый вопрос имеет step=1', async () => {
      const { next_question } = await loop.start('task-1', PARTIAL_PARSED);
      expect(next_question?.step).toBe(1);
    });
  });

  // ── answer() ───────────────────────────────────────────────────────────────

  describe('answer()', () => {
    it('применяет ответ к draft', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);
      const { session: updated } = await loop.answer(session, 'to_location', 'Блок 45, Нови Београд');

      expect(updated.draft.to_location).toEqual({ address: 'Блок 45, Нови Београд' });
    });

    it('убирает поле из missing_fields', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);
      const before = session.missing_fields.length;
      const { session: updated } = await loop.answer(session, 'to_location', 'Блок 45');

      expect(updated.missing_fields.length).toBe(before - 1);
      expect(updated.missing_fields).not.toContain('to_location');
    });

    it('добавляет в answered_fields', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);
      const { session: updated } = await loop.answer(session, 'to_location', 'Блок 45');

      expect(updated.answered_fields).toContain('to_location');
    });

    it('записывает историю', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);
      const { session: updated } = await loop.answer(session, 'to_location', 'Блок 45');

      expect(updated.history).toHaveLength(1);
      expect(updated.history[0]?.field).toBe('to_location');
      expect(updated.history[0]?.answer).toBe('Блок 45');
    });

    it('увеличивает step на 1', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);
      const { session: updated } = await loop.answer(session, 'to_location', 'Блок 45');

      expect(updated.step).toBe(1);
    });

    it('корректно парсит числовой ответ для поля price', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);
      const s2 = (await loop.answer(session, 'to_location', 'Блок 45')).session;
      const { session: s3 } = await loop.answer(s2, 'price', '1200');

      expect(s3.draft.price_suggested).toBe(1200);
    });

    it('завершает цикл когда все обязательные поля заполнены', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);
      // to_location + item_description уже есть в PARTIAL_PARSED
      // осталось только from_location, to_location, price
      const s2 = (await loop.answer(session, 'to_location', 'Блок 45')).session;

      // После заполнения to_location — оба обязательных поля есть
      expect(s2.is_complete).toBe(true);
    });

    it('возвращает null next_question когда цикл завершён', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);
      const { next_question } = await loop.answer(session, 'to_location', 'Блок 45');

      expect(next_question).toBeNull();
    });
  });

  // ── skip() ─────────────────────────────────────────────────────────────────

  describe('skip()', () => {
    it('убирает поле из очереди без записи в draft', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);
      const { session: updated } = await loop.skip(session, 'from_location');

      expect(updated.missing_fields).not.toContain('from_location');
      expect(updated.draft.from_location).toBeNull(); // не изменился
    });

    it('увеличивает step', async () => {
      const { session } = await loop.start('task-1', PARTIAL_PARSED);
      const { session: updated } = await loop.skip(session, 'from_location');
      expect(updated.step).toBe(1);
    });
  });

  // ── Лимит в 3 вопроса ──────────────────────────────────────────────────────

  describe('лимит max_steps=3', () => {
    it('завершает цикл после 3 вопросов даже если поля остались', async () => {
      const { session: s0 } = await loop.start('task-1', EMPTY_PARSED);
      const { session: s1 } = await loop.answer(s0, 'to_location', 'Блок 45');
      const { session: s2 } = await loop.answer(s1, 'item_description', 'Латте');
      const { session: s3, next_question } = await loop.answer(s2, 'from_location', 'Ближайший');

      expect(s3.step).toBe(3);
      expect(s3.is_complete).toBe(true);
      expect(next_question).toBeNull();
    });
  });

  // ── forceComplete() ────────────────────────────────────────────────────────

  describe('forceComplete()', () => {
    it('принудительно завершает сессию', async () => {
      const { session } = await loop.start('task-1', EMPTY_PARSED);
      expect(session.is_complete).toBe(false);

      const completed = loop.forceComplete(session);
      expect(completed.is_complete).toBe(true);
    });
  });

  // ── Полный сценарий ────────────────────────────────────────────────────────

  describe('полный сценарий', () => {
    it('клиент отвечает на 2 вопроса и получает готовый draft', async () => {
      const { session: s0, next_question: q1 } = await loop.start('task-1', PARTIAL_PARSED);

      expect(q1?.field).toBe('to_location'); // первый по приоритету
      expect(s0.is_complete).toBe(false);

      // Отвечаем на первый вопрос
      const { session: s1, next_question: q2 } = await loop.answer(
        s0, 'to_location', 'Нови Београд, Блок 45',
      );

      // to_location заполнен, item_description тоже есть в PARTIAL_PARSED
      // → оба обязательных поля есть → цикл завершён
      expect(s1.is_complete).toBe(true);
      expect(q2).toBeNull();
      expect(s1.draft.to_location?.address).toBe('Нови Београд, Блок 45');
      expect(s1.draft.item_description).toBe('Латте');
    });
  });
});
