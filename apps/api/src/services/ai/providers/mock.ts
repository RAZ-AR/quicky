import type {
  AIProvider,
  ParsedTaskDTO,
  ClarificationQuestionDTO,
  PriceSuggestionDTO,
  TaskCategory,
} from '../types.js';

// ─── Мок-провайдер для тестов и локальной разработки ─────────────────────────
// Не делает никаких HTTP-запросов. Полностью бесплатно.

export class MockAIProvider implements AIProvider {
  async transcribeAudio(_audioBuffer: Buffer, _mimeType: string): Promise<string> {
    return 'Купи большой латте в Starbucks и доставь в Нови Београд, блок 45';
  }

  async parseTask(text: string): Promise<ParsedTaskDTO> {
    // Простая логика для разных тестовых сценариев
    const lower = text.toLowerCase();

    if (lower.includes('missing') || lower.includes('непонятно')) {
      // Сценарий: много пропущенных полей
      return {
        category: 'buy_deliver',
        title: 'Купить и доставить',
        item_description: null,
        from_location: null,
        to_location: null,
        scheduled_for: null,
        price_suggested: null,
        missing_fields: ['item_description', 'from_location', 'to_location', 'price'],
        confidence: 0.3,
      };
    }

    // Сценарий по умолчанию: почти всё заполнено
    return {
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
  }

  async generateClarification(
    missingField: string,
    _taskContext: string,
    step: number,
    totalSteps: number,
  ): Promise<ClarificationQuestionDTO> {
    const questions: Record<string, ClarificationQuestionDTO> = {
      item_description: {
        question_text: 'Что именно нужно купить?',
        field: 'item_description',
        input_type: 'text',
        options: null,
        step,
        total_steps: totalSteps,
      },
      from_location: {
        question_text: 'Где купить?',
        field: 'from_location',
        input_type: 'select',
        options: ['Ближайший магазин', 'Выбрать на карте'],
        step,
        total_steps: totalSteps,
      },
      to_location: {
        question_text: 'Куда доставить?',
        field: 'to_location',
        input_type: 'location',
        options: null,
        step,
        total_steps: totalSteps,
      },
      price: {
        question_text: 'Сколько готовы заплатить? (в RSD)',
        field: 'price',
        input_type: 'number',
        options: ['500', '800', '1000', '1500'],
        step,
        total_steps: totalSteps,
      },
    };

    return (
      questions[missingField] ?? {
        question_text: `Уточните: ${missingField}`,
        field: missingField,
        input_type: 'text',
        options: null,
        step,
        total_steps: totalSteps,
      }
    );
  }

  async suggestPrice(
    _taskSummary: string,
    _category: TaskCategory,
    distanceKm = 3,
  ): Promise<PriceSuggestionDTO> {
    const base = 500;
    const perKm = 100;
    const suggested = base + distanceKm * perKm;
    return {
      suggested_price: suggested,
      price_range: { min: suggested * 0.8, max: suggested * 1.3 },
    };
  }
}
