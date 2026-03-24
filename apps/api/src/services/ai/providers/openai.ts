import OpenAI from 'openai';
import { z } from 'zod';
import type {
  AIProvider,
  AIConfig,
  ParsedTaskDTO,
  ClarificationQuestionDTO,
  PriceSuggestionDTO,
  TaskCategory,
} from '../types.js';

// ─── Zod-схемы для валидации вывода AI ────────────────────────────────────────

const ParsedTaskSchema = z.object({
  category: z.enum(['buy_deliver', 'pickup_drop', 'simple_errand']).nullable(),
  title: z.string().max(60).nullable(),
  item_description: z.string().nullable(),
  from_location: z.object({ address: z.string() }).nullable(),
  to_location: z.object({ address: z.string() }).nullable(),
  scheduled_for: z.string().nullable(),
  price_suggested: z.number().nullable(),
  missing_fields: z.array(
    z.enum(['category', 'item_description', 'from_location', 'to_location', 'price']),
  ),
  confidence: z.number().min(0).max(1),
});

const ClarificationSchema = z.object({
  question_text: z.string().max(100),
  input_type: z.enum(['text', 'location', 'number', 'select']),
  options: z.array(z.string()).nullable(),
});

const PriceSchema = z.object({
  suggested_price: z.number().positive(),
  price_range: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }),
});

// ─── Провайдер: OpenAI / Groq / Ollama ────────────────────────────────────────
// Все три используют OpenAI-совместимый API, разница только в baseURL и модели.

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private chatModel: string;
  private whisperModel: string;

  constructor(config: AIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey ?? 'ollama',
      baseURL: config.baseURL, // undefined = официальный OpenAI
    });
    this.chatModel = config.chatModel ?? 'gpt-4o-mini';
    this.whisperModel = config.whisperModel ?? 'whisper-1';
  }

  // ── Whisper: аудио → текст ──────────────────────────────────────────────────

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const blob = new Blob([audioBuffer as unknown as ArrayBuffer], { type: mimeType });
    const file = new File([blob], `audio.${mimeType.split('/')[1] ?? 'webm'}`, {
      type: mimeType,
    });

    const response = await this.client.audio.transcriptions.create({
      model: this.whisperModel,
      file,
      language: 'sr', // сербский, улучшает точность
    });

    return response.text;
  }

  // ── Парсер задания ──────────────────────────────────────────────────────────

  async parseTask(text: string): Promise<ParsedTaskDTO> {
    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      response_format: { type: 'json_object' },
      temperature: 0.1, // детерминированный вывод
      messages: [
        {
          role: 'system',
          content: `Ты ассистент для извлечения данных из задач в Белграде, Сербия.
Верни ТОЛЬКО корректный JSON по этой схеме:
{
  "category": "buy_deliver" | "pickup_drop" | "simple_errand" | null,
  "title": "краткое название задания (макс 60 символов)" | null,
  "item_description": "что купить/забрать" | null,
  "from_location": {"address": string} | null,
  "to_location": {"address": string} | null,
  "scheduled_for": "ISO8601" | null,
  "price_suggested": number | null,
  "missing_fields": ["category"|"item_description"|"from_location"|"to_location"|"price"],
  "confidence": 0.0-1.0
}
Правила:
- Не придумывай данные — только то, что явно сказано
- Если локация расплывчата ("рядом") — null и добавь в missing_fields
- title должен быть конкретным: "Купить кофе и доставить в Нови Београд"`,
        },
        { role: 'user', content: text },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    return this.validateOrFallback(ParsedTaskSchema, raw, this.parseFallback());
  }

  // ── Генератор уточняющего вопроса ───────────────────────────────────────────

  async generateClarification(
    missingField: string,
    taskContext: string,
    step: number,
    totalSteps: number,
  ): Promise<ClarificationQuestionDTO> {
    const fieldLabels: Record<string, string> = {
      item_description: 'что именно нужно купить или забрать',
      from_location: 'откуда взять товар (название магазина или адрес)',
      to_location: 'куда доставить (адрес назначения)',
      price: 'сколько клиент готов заплатить (в RSD)',
      category: 'тип задания',
    };

    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `Ты ассистент уточнений для маркетплейса задач.
Сгенерируй ОДИН короткий вопрос (макс 15 слов) для получения пропущенного поля.
Верни JSON:
{
  "question_text": string,
  "input_type": "text" | "location" | "number" | "select",
  "options": string[] | null
}
Используй "select" с 2-4 вариантами если вопрос допускает предустановленные ответы.
Используй "location" для адресов, "number" для цен, "text" для остального.`,
        },
        {
          role: 'user',
          content: `Пропущенное поле: ${fieldLabels[missingField] ?? missingField}
Контекст задания: ${taskContext}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    const parsed = this.validateOrFallback(ClarificationSchema, raw, {
      question_text: `Уточните: ${missingField}`,
      input_type: 'text' as const,
      options: null,
    });

    return { ...parsed, field: missingField, step, total_steps: totalSteps };
  }

  // ── Предложение цены ────────────────────────────────────────────────────────

  async suggestPrice(
    taskSummary: string,
    category: TaskCategory,
    distanceKm = 3,
  ): Promise<PriceSuggestionDTO> {
    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `Ты помощник по ценообразованию в Белграде, Сербия.
Предложи справедливую цену в RSD для задания по доставке/поручению.
Учитывай: расстояние, тип товара, сложность.
Верни JSON:
{
  "suggested_price": number,
  "price_range": {"min": number, "max": number}
}`,
        },
        {
          role: 'user',
          content: `Задание: ${taskSummary}
Категория: ${category}
Расстояние: ~${distanceKm} км`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '{}';
    return this.validateOrFallback(PriceSchema, raw, {
      suggested_price: 800,
      price_range: { min: 500, max: 1200 },
    });
  }

  // ── Приватные хелперы ───────────────────────────────────────────────────────

  private validateOrFallback<T>(schema: z.ZodSchema<T>, raw: string, fallback: T): T {
    try {
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);
    } catch {
      console.error('[AI] Невалидный вывод, используем запасной вариант:', raw);
      return fallback;
    }
  }

  private parseFallback(): ParsedTaskDTO {
    return {
      category: null,
      title: null,
      item_description: null,
      from_location: null,
      to_location: null,
      scheduled_for: null,
      price_suggested: null,
      missing_fields: ['category', 'item_description', 'from_location', 'to_location', 'price'],
      confidence: 0,
    };
  }
}
