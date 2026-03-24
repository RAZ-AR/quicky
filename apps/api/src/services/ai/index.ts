// ─── Публичный API AI-слоя ────────────────────────────────────────────────────
// Весь код приложения импортирует только отсюда.

export { getAI, resetAI, createAIProvider } from './providers/index.js';
export type {
  AIProvider,
  AIConfig,
  AIProviderName,
  ParsedTaskDTO,
  ClarificationQuestionDTO,
  PriceSuggestionDTO,
  TaskCategory,
  LocationDTO,
} from './types.js';
