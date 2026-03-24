import type { ParsedTaskDTO, ClarificationQuestionDTO, LocationDTO, TaskCategory } from '../ai/types.js';

// ─── Состояние сессии уточнений ───────────────────────────────────────────────

export type ClarificationField =
  | 'category'
  | 'item_description'
  | 'from_location'
  | 'to_location'
  | 'price';

export interface TaskDraft {
  taskId: string;
  category: TaskCategory | null;
  title: string | null;
  item_description: string | null;
  from_location: LocationDTO | null;
  to_location: LocationDTO | null;
  scheduled_for: string | null;
  price_suggested: number | null;
  price_final: number | null;
  raw_voice_text: string | null;
}

export interface ClarificationSession {
  taskId: string;
  draft: TaskDraft;
  missing_fields: ClarificationField[];  // очередь полей требующих уточнения
  answered_fields: ClarificationField[]; // уже заполненные через уточнения
  step: number;                          // текущий шаг (1-3)
  max_steps: number;                     // максимум 3
  history: ClarificationHistoryEntry[];
  is_complete: boolean;                  // все критичные поля заполнены
}

export interface ClarificationHistoryEntry {
  field: ClarificationField;
  question: string;
  answer: string;
  step: number;
}

// ─── Результаты операций ──────────────────────────────────────────────────────

export interface StartClarificationResult {
  session: ClarificationSession;
  // null = уточнения не нужны, сразу к подтверждению
  next_question: ClarificationQuestionDTO | null;
}

export interface AnswerResult {
  session: ClarificationSession;
  next_question: ClarificationQuestionDTO | null; // null = цикл завершён
}

// ─── Приоритет полей ──────────────────────────────────────────────────────────
// Поля опрашиваются в этом порядке — от самых важных к необязательным

export const FIELD_PRIORITY: ClarificationField[] = [
  'to_location',       // без адреса доставки задание бессмысленно
  'item_description',  // без описания нечего покупать
  'from_location',     // откуда — можно угадать (ближайший магазин)
  'price',             // цена — можно предложить автоматически
  'category',          // категория — обычно понятна из контекста
];

// ─── Обязательные поля (без них нельзя опубликовать) ──────────────────────────

export const REQUIRED_FIELDS: ClarificationField[] = ['to_location', 'item_description'];
