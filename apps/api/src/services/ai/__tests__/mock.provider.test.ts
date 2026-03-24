import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../providers/mock.js';

describe('MockAIProvider', () => {
  const ai = new MockAIProvider();

  describe('transcribeAudio', () => {
    it('возвращает фиксированный текст', async () => {
      const result = await ai.transcribeAudio(Buffer.from(''), 'audio/webm');
      expect(result).toBeTypeOf('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('parseTask', () => {
    it('возвращает полностью заполненный результат для нормального текста', async () => {
      const result = await ai.parseTask('Купи кофе и доставь');

      expect(result.category).toBe('buy_deliver');
      expect(result.title).toBeTruthy();
      expect(result.missing_fields).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('возвращает missing_fields для непонятного текста', async () => {
      const result = await ai.parseTask('сделай что-нибудь непонятно');

      expect(result.missing_fields.length).toBeGreaterThan(0);
      expect(result.to_location).toBeNull();
    });

    it('всегда возвращает confidence от 0 до 1', async () => {
      const result = await ai.parseTask('любой текст');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('generateClarification', () => {
    it('генерирует вопрос для каждого типа поля', async () => {
      const fields = ['item_description', 'from_location', 'to_location', 'price'];

      for (const field of fields) {
        const result = await ai.generateClarification(field, 'купить кофе', 1, 3);

        expect(result.field).toBe(field);
        expect(result.question_text).toBeTruthy();
        expect(result.step).toBe(1);
        expect(result.total_steps).toBe(3);
        expect(['text', 'location', 'number', 'select']).toContain(result.input_type);
      }
    });

    it('корректно передаёт номер шага', async () => {
      const result = await ai.generateClarification('to_location', '', 2, 3);
      expect(result.step).toBe(2);
      expect(result.total_steps).toBe(3);
    });
  });

  describe('suggestPrice', () => {
    it('возвращает положительную цену', async () => {
      const result = await ai.suggestPrice('купить кофе', 'buy_deliver', 5);

      expect(result.suggested_price).toBeGreaterThan(0);
      expect(result.price_range.min).toBeLessThanOrEqual(result.suggested_price);
      expect(result.price_range.max).toBeGreaterThanOrEqual(result.suggested_price);
    });

    it('учитывает расстояние (дальше = дороже)', async () => {
      const near = await ai.suggestPrice('купить кофе', 'buy_deliver', 1);
      const far = await ai.suggestPrice('купить кофе', 'buy_deliver', 20);

      expect(far.suggested_price).toBeGreaterThan(near.suggested_price);
    });
  });
});
