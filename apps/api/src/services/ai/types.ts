// ─── Общие типы для всех AI-провайдеров ───────────────────────────────────────

export type TaskCategory = 'buy_deliver' | 'pickup_drop' | 'simple_errand';

export interface LocationDTO {
  address: string;
  lat?: number;
  lng?: number;
}

export interface ParsedTaskDTO {
  category: TaskCategory | null;
  title: string | null;
  item_description: string | null;
  from_location: LocationDTO | null;
  to_location: LocationDTO | null;
  scheduled_for: string | null; // ISO8601 или null = ASAP
  price_suggested: number | null;
  missing_fields: Array<
    'category' | 'item_description' | 'from_location' | 'to_location' | 'price'
  >;
  confidence: number; // 0.0 – 1.0
}

export type ClarificationInputType = 'text' | 'location' | 'number' | 'select';

export interface ClarificationQuestionDTO {
  question_text: string;
  field: string;
  input_type: ClarificationInputType;
  options: string[] | null;
  step: number;
  total_steps: number;
}

export interface PriceSuggestionDTO {
  suggested_price: number;
  price_range: { min: number; max: number };
}

// ─── Контракт провайдера ──────────────────────────────────────────────────────

export interface AIProvider {
  /** Whisper: аудиофайл → транскрипция */
  transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string>;

  /** GPT: текст задания → структурированные данные */
  parseTask(text: string): Promise<ParsedTaskDTO>;

  /** GPT: генерирует один уточняющий вопрос */
  generateClarification(
    missingField: string,
    taskContext: string,
    step: number,
    totalSteps: number,
  ): Promise<ClarificationQuestionDTO>;

  /** GPT: предлагает цену на основе задания */
  suggestPrice(
    taskSummary: string,
    category: TaskCategory,
    distanceKm?: number,
  ): Promise<PriceSuggestionDTO>;
}

// ─── Конфигурация провайдера ──────────────────────────────────────────────────

export type AIProviderName = 'openai' | 'groq' | 'ollama' | 'mock';

export interface AIConfig {
  provider: AIProviderName;
  apiKey?: string;
  baseURL?: string;    // для Groq / Ollama
  chatModel?: string;  // переопределить модель
  whisperModel?: string;
}
