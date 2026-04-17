import { create } from 'zustand';
import { api, uploadAudio, uploadPhoto } from '../services/api';
import type { Task, ClarificationQuestion, ParsedTask } from '../services/api';
import type { Socket } from 'socket.io-client';

interface TaskCreationState {
  taskId: string | null;
  parsed: ParsedTask | null;
  nextQuestion: ClarificationQuestion | null;
  state: string | null;
}

interface TaskState {
  // Создание задания
  creation: TaskCreationState;
  isCreating: boolean;

  // Мои задания
  myTasks: Task[];
  activeTask: Task | null;
  isLoading: boolean;

  // Лента (исполнитель)
  feed: Task[];
  isFeedLoading: boolean;

  // Actions — создание
  parseVoice: (uri: string) => Promise<void>;
  parseText: (text: string) => Promise<void>;
  answerClarification: (field: string, answer: string | null, skip?: boolean) => Promise<void>;
  confirmTask: (priceFinal: number, paymentMethod: string) => Promise<void>;
  resetCreation: () => void;

  // Actions — выполнение
  loadMyTasks: () => Promise<void>;
  loadTask: (taskId: string) => Promise<void>;
  loadFeed: (lat: number, lng: number) => Promise<void>;
  acceptTask: (taskId: string) => Promise<void>;
  startTask: (taskId: string) => Promise<void>;
  reportProblem: (taskId: string, data: ProblemData) => Promise<{ message_id: string; expires_at: string }>;
  respondToProblem: (taskId: string, messageId: string, responseType: 'accept' | 'reject' | 'select_option') => Promise<void>;
  completeTask: (taskId: string, photoUri?: string) => Promise<void>;
  completeTaskWithQr: (taskId: string, token: string, photoUri?: string) => Promise<void>;
  cancelTask: (taskId: string, reason: string) => Promise<void>;
  rateTask: (taskId: string, rating: number, comment?: string, rateeId?: string) => Promise<void>;

  // Утилиты
  setActiveTask: (task: any) => void;
  updateTaskState: (taskId: string, newState: string) => void;
  initSocket: (socket: Socket) => void;
}

export interface ProblemData {
  problem_type: 'item_not_available' | 'need_clarification' | 'price_change';
  content?: string;
  photo_url?: string;
  price_proposed?: number;
  options?: string[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  creation:      { taskId: null, parsed: null, nextQuestion: null, state: null },
  isCreating:    false,
  myTasks:       [],
  activeTask:    null,
  isLoading:     false,
  feed:          [],
  isFeedLoading: false,

  // ── Создание ──────────────────────────────────────────────────────────────────

  parseVoice: async (uri) => {
    set({ isCreating: true });
    try {
      const data = await uploadAudio(uri);
      set({ creation: { taskId: data.task_id, parsed: data.parsed, nextQuestion: data.next_question, state: data.state } });
    } finally {
      set({ isCreating: false });
    }
  },

  parseText: async (text) => {
    set({ isCreating: true });
    try {
      const { data } = await api.post('/task/parse', { text });
      set({ creation: { taskId: data.task_id, parsed: data.parsed, nextQuestion: data.next_question, state: data.state } });
    } finally {
      set({ isCreating: false });
    }
  },

  answerClarification: async (field, answer, skip = false) => {
    const { taskId } = get().creation;
    if (!taskId) return;
    const { data } = await api.post('/task/clarify', { task_id: taskId, field_answered: field, answer: skip ? null : answer, skip });
    set({ creation: { ...get().creation, nextQuestion: data.next_question, state: data.state } });
  },

  confirmTask: async (priceFinal, paymentMethod) => {
    const { taskId } = get().creation;
    if (!taskId) return;
    await api.post('/task/confirm', { task_id: taskId, price_final: priceFinal, payment_method: paymentMethod });
  },

  resetCreation: () => {
    set({ creation: { taskId: null, parsed: null, nextQuestion: null, state: null } });
  },

  // ── Загрузка ──────────────────────────────────────────────────────────────────

  loadMyTasks: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/tasks/my');
      set({ myTasks: data.tasks });
    } catch {
      // API недоступен — UI показывает mock
    } finally {
      set({ isLoading: false });
    }
  },

  loadTask: async (taskId) => {
    try {
      const { data } = await api.get(`/task/${taskId}`);
      set({ activeTask: data.task });
      set((s) => ({ myTasks: s.myTasks.map((t) => t.id === taskId ? data.task : t) }));
    } catch {
      // ignore
    }
  },

  loadFeed: async (lat, lng) => {
    set({ isFeedLoading: true });
    try {
      const { data } = await api.get('/tasks/feed', { params: { lat, lng } });
      set({ feed: data.tasks });
    } catch {
      // offline — UI показывает mock
    } finally {
      set({ isFeedLoading: false });
    }
  },

  // ── Выполнение ────────────────────────────────────────────────────────────────

  acceptTask: async (taskId) => {
    try {
      const { data } = await api.post(`/task/${taskId}/accept`);
      set({ activeTask: data.task_detail });
      set((s) => ({
        myTasks: s.myTasks.some(t => t.id === taskId)
          ? s.myTasks.map(t => t.id === taskId ? data.task_detail : t)
          : [data.task_detail, ...s.myTasks],
        feed: s.feed.filter(t => t.id !== taskId),
      }));
    } catch {
      // Offline / mock — переводим локально
      const task = get().feed.find(t => t.id === taskId) ?? get().activeTask;
      if (task) {
        const accepted = { ...task, state: 'accepted' };
        set((s) => ({
          activeTask: accepted,
          myTasks: s.myTasks.some(t => t.id === taskId)
            ? s.myTasks.map(t => t.id === taskId ? accepted : t)
            : [accepted as Task, ...s.myTasks],
          feed: s.feed.filter(t => t.id !== taskId),
        }));
      }
    }
  },

  startTask: async (taskId) => {
    try {
      await api.post(`/task/${taskId}/start`);
    } catch {
      // Offline / mock — переводим локально
    }
    get().updateTaskState(taskId, 'in_progress');
  },

  reportProblem: async (taskId, problemData) => {
    const { data } = await api.post(`/task/${taskId}/problem`, problemData);
    get().loadTask(taskId);
    return { message_id: data.message_id, expires_at: data.expires_at };
  },

  respondToProblem: async (taskId, messageId, responseType) => {
    await api.post(`/task/${taskId}/respond`, { message_id: messageId, response_type: responseType });
    get().loadTask(taskId);
  },

  completeTask: async (taskId, photoUri) => {
    let photoUrl: string | undefined;
    if (photoUri) {
      const result = await uploadPhoto(photoUri);
      if (result?.url) photoUrl = result.url;
    }
    await api.post(`/task/${taskId}/complete`, { completion_photo_url: photoUrl ?? null });
    get().loadTask(taskId);
  },

  completeTaskWithQr: async (taskId, token, photoUri) => {
    let photoUrl: string | undefined;
    if (photoUri) {
      const result = await uploadPhoto(photoUri);
      if (result?.url) photoUrl = result.url;
    }
    try {
      await api.post(`/task/${taskId}/complete-qr`, {
        token,
        completion_photo_url: photoUrl ?? null,
      });
      get().updateTaskState(taskId, 'completed');
      get().loadTask(taskId);
    } catch (err) {
      throw err;
    }
  },

  cancelTask: async (taskId, reason) => {
    try {
      await api.post(`/task/${taskId}/cancel`, { reason });
    } catch {
      // Offline / mock — убираем из списков локально
    }
    set((s) => ({
      myTasks: s.myTasks.filter(t => t.id !== taskId),
      activeTask: s.activeTask?.id === taskId ? null : s.activeTask,
    }));
  },

  rateTask: async (taskId, rating, comment, rateeId) => {
    await api.post('/rating', {
      task_id: taskId,
      ratee_id: rateeId,
      stars: rating,
      comment: comment ?? null,
    });
    get().loadTask(taskId);
  },

  // ── Утилиты ──────────────────────────────────────────────────────────────────

  setActiveTask: (task) => {
    set({ activeTask: task });
  },

  updateTaskState: (taskId, newState) => {
    set((s) => ({
      activeTask: s.activeTask?.id === taskId ? { ...s.activeTask, state: newState } : s.activeTask,
      myTasks: s.myTasks.map((t) => t.id === taskId ? { ...t, state: newState } : t),
    }));
  },

  initSocket: (socket: Socket) => {
    // Убираем дубли при повторной инициализации
    socket.off('task_state_changed');
    socket.off('task_feed_new');
    socket.off('task_feed_removed');
    socket.off('task_completed');

    // Лента — новое задание появилось
    socket.on('task_feed_new', (payload: Task) => {
      set((s) => ({
        feed: s.feed.some(t => t.id === payload.id)
          ? s.feed
          : [payload, ...s.feed],
      }));
    });

    // Лента — задание взяли, убираем из ленты
    socket.on('task_feed_removed', (payload: { task_id: string }) => {
      set((s) => ({ feed: s.feed.filter(t => t.id !== payload.task_id) }));
    });

    // Изменение статуса задания (для комнаты task:{id})
    socket.on('task_state_changed', (payload: { task_id: string; new_state: string }) => {
      get().updateTaskState(payload.task_id, payload.new_state);
    });

    // Задание завершено
    socket.on('task_completed', (payload: { task_id: string }) => {
      get().updateTaskState(payload.task_id, 'completed');
    });
  },
}));
