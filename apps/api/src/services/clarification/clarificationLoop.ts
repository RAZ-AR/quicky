import type { AIProvider, ParsedTaskDTO, ClarificationQuestionDTO } from '../ai/types.js';
import type {
  ClarificationSession,
  ClarificationField,
  TaskDraft,
  StartClarificationResult,
  AnswerResult,
} from './types.js';
import { FIELD_PRIORITY, REQUIRED_FIELDS } from './types.js';

// ─── Цикл уточнений ───────────────────────────────────────────────────────────
// Управляет сессией уточнений: берёт missing_fields от AI-парсера,
// задаёт максимум 3 вопроса, возвращает заполненный draft.

export class ClarificationLoop {
  constructor(private readonly ai: AIProvider) {}

  // ── Начало сессии (после парсинга голоса/текста) ────────────────────────────

  async start(
    taskId: string,
    parsed: ParsedTaskDTO,
    rawVoiceText: string | null = null,
  ): Promise<StartClarificationResult> {
    const draft: TaskDraft = {
      taskId,
      category: parsed.category,
      title: parsed.title,
      item_description: parsed.item_description,
      from_location: parsed.from_location,
      to_location: parsed.to_location,
      scheduled_for: parsed.scheduled_for,
      price_suggested: parsed.price_suggested,
      price_final: null,
      raw_voice_text: rawVoiceText,
    };

    // Сортируем поля по приоритету
    const missing = this.sortByPriority(parsed.missing_fields as ClarificationField[]);

    const session: ClarificationSession = {
      taskId,
      draft,
      missing_fields: missing,
      answered_fields: [],
      step: 0,
      max_steps: 3,
      history: [],
      is_complete: false,
    };

    // Если уточнения не нужны — сразу готово
    if (missing.length === 0) {
      session.is_complete = true;
      return { session, next_question: null };
    }

    // Генерируем первый вопрос
    const next_question = await this.generateQuestion(session);
    return { session, next_question };
  }

  // ── Ответ на вопрос ─────────────────────────────────────────────────────────

  async answer(
    session: ClarificationSession,
    fieldAnswered: ClarificationField,
    answerText: string,
  ): Promise<AnswerResult> {
    // Применяем ответ к draft
    const updatedDraft = this.applyAnswer(session.draft, fieldAnswered, answerText);

    // Записываем в историю
    const lastQuestion =
      session.history.length > 0
        ? session.history[session.history.length - 1]?.question ?? ''
        : '';

    const updatedSession: ClarificationSession = {
      ...session,
      draft: updatedDraft,
      missing_fields: session.missing_fields.filter((f) => f !== fieldAnswered),
      answered_fields: [...session.answered_fields, fieldAnswered],
      step: session.step + 1,
      history: [
        ...session.history,
        { field: fieldAnswered, question: lastQuestion, answer: answerText, step: session.step + 1 },
      ],
    };

    // Проверяем завершение цикла
    const isDone =
      updatedSession.missing_fields.length === 0 ||
      updatedSession.step >= updatedSession.max_steps ||
      this.hasRequiredFields(updatedSession.draft);

    if (isDone) {
      updatedSession.is_complete = true;
      return { session: updatedSession, next_question: null };
    }

    // Генерируем следующий вопрос
    const next_question = await this.generateQuestion(updatedSession);
    return { session: updatedSession, next_question };
  }

  // ── Пропуск вопроса (клиент нажал "пропустить") ─────────────────────────────

  async skip(
    session: ClarificationSession,
    fieldSkipped: ClarificationField,
  ): Promise<AnswerResult> {
    const updatedSession: ClarificationSession = {
      ...session,
      missing_fields: session.missing_fields.filter((f) => f !== fieldSkipped),
      step: session.step + 1,
    };

    // Если пропустили обязательное поле — продолжаем спрашивать следующее
    const isDone =
      updatedSession.missing_fields.length === 0 ||
      updatedSession.step >= updatedSession.max_steps;

    if (isDone) {
      // Завершаем даже если обязательные поля не заполнены — клиент всё
      // равно увидит форму подтверждения где сможет заполнить вручную
      updatedSession.is_complete = true;
      return { session: updatedSession, next_question: null };
    }

    const next_question = await this.generateQuestion(updatedSession);
    return { session: updatedSession, next_question };
  }

  // ── Принудительное завершение (лимит вопросов исчерпан) ─────────────────────

  forceComplete(session: ClarificationSession): ClarificationSession {
    return { ...session, is_complete: true };
  }

  // ── Приватные методы ─────────────────────────────────────────────────────────

  private async generateQuestion(
    session: ClarificationSession,
  ): Promise<ClarificationQuestionDTO> {
    const nextField = session.missing_fields[0];
    if (!nextField) throw new Error('Нет полей для уточнения');

    const taskContext = this.buildContext(session.draft);
    const step = session.step + 1;
    const totalSteps = Math.min(session.missing_fields.length, session.max_steps - session.step);

    return this.ai.generateClarification(nextField, taskContext, step, totalSteps);
  }

  private applyAnswer(draft: TaskDraft, field: ClarificationField, answer: string): TaskDraft {
    const updated = { ...draft };

    switch (field) {
      case 'to_location':
        updated.to_location = { address: answer };
        break;
      case 'from_location':
        updated.from_location = { address: answer };
        break;
      case 'item_description':
        updated.item_description = answer;
        break;
      case 'price':
        updated.price_suggested = parseFloat(answer) || null;
        break;
      case 'category':
        if (answer === 'buy_deliver' || answer === 'pickup_drop' || answer === 'simple_errand') {
          updated.category = answer;
        }
        break;
    }

    return updated;
  }

  private buildContext(draft: TaskDraft): string {
    const parts: string[] = [];
    if (draft.item_description) parts.push(`Товар: ${draft.item_description}`);
    if (draft.from_location) parts.push(`Откуда: ${draft.from_location.address}`);
    if (draft.to_location) parts.push(`Куда: ${draft.to_location.address}`);
    if (draft.price_suggested) parts.push(`Цена: ${draft.price_suggested} RSD`);
    return parts.join(', ') || 'задание без деталей';
  }

  private sortByPriority(fields: ClarificationField[]): ClarificationField[] {
    return [...fields].sort(
      (a, b) => FIELD_PRIORITY.indexOf(a) - FIELD_PRIORITY.indexOf(b),
    );
  }

  private hasRequiredFields(draft: TaskDraft): boolean {
    return REQUIRED_FIELDS.every((field) => {
      switch (field) {
        case 'to_location':      return draft.to_location !== null;
        case 'item_description': return draft.item_description !== null;
        default:                 return true;
      }
    });
  }
}
