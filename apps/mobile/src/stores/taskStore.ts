import { create } from 'zustand';
import { api, uploadAudio } from '../services/api';
import type { Task, ClarificationQuestion, ParsedTask } from '../services/api';

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
  respondToProblem: (taskId: string, messageId: string, response: string) => Promise<void>;
  completeTask: (taskId: string, photoUrl?: string) => Promise<void>;
  cancelTask: (taskId: string, reason: string) => Promise<void>;

  // Real-time обновление из Socket.io
  updateTaskState: (taskId: string, newState: string) => void;
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

  parseVoice: async (uri) => {
    set({ isCreating: true });
    try {
      const data = await uploadAudio(uri);
      set({
        creation: {
          taskId:       data.task_id,
          parsed:       data.parsed,
          nextQuestion: data.next_question,
          state:        data.state,
        },
      });
    } finally {
      set({ isCreating: false });
    }
  },

  parseText: async (text) => {
    set({ isCreating: true });
    try {
      const { data } = await api.post('/task/parse', { text });
      set({
        creation: {
          taskId:       data.task_id,
          parsed:       data.parsed,
          nextQuestion: data.next_question,
          state:        data.state,
        },
      });
    } finally {
      set({ isCreating: false });
    }
  },

  answerClarification: async (field, answer, skip = false) => {
    const { taskId } = get().creation;
    if (!taskId) return;

    const { data } = await api.post('/task/clarify', {
      task_id:        taskId,
      field_answered: field,
      answer:         skip ? null : answer,
      skip,
    });

    set({
      creation: {
        ...get().creation,
        nextQuestion: data.next_question,
        state:        data.state,
      },
    });
  },

  confirmTask: async (priceFinal, paymentMethod) => {
    const { taskId } = get().creation;
    if (!taskId) return;

    await api.post('/task/confirm', {
      task_id:        taskId,
      price_final:    priceFinal,
      payment_method: paymentMethod,
    });
  },

  resetCreation: () => {
    set({ creation: { taskId: null, parsed: null, nextQuestion: null, state: null } });
  },

  loadMyTasks: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/tasks/my');
      set({ myTasks: data.tasks });
    } catch {
      // API unavailable — mock data shown as fallback in UI
    } finally {
      set({ isLoading: false });
    }
  },

  loadTask: async (taskId) => {
    try {
      const { data } = await api.get(`/task/${taskId}`);
      set({ activeTask: data.task });
      set((s) => ({
        myTasks: s.myTasks.map((t) => t.id === taskId ? data.task : t),
      }));
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
      // ignore — no feed available offline
    } finally {
      set({ isFeedLoading: false });
    }
  },

  acceptTask: async (taskId) => {
    const { data } = await api.post(`/task/${taskId}/accept`);
    set({ activeTask: data.task_detail });
  },

  startTask: async (taskId) => {
    await api.post(`/task/${taskId}/start`);
    get().loadTask(taskId);
  },

  reportProblem: async (taskId, problemData) => {
    const { data } = await api.post(`/task/${taskId}/problem`, problemData);
    get().loadTask(taskId);
    return { message_id: data.message_id, expires_at: data.expires_at };
  },

  respondToProblem: async (taskId, messageId, response) => {
    await api.post(`/task/${taskId}/respond`, {
      message_id:    messageId,
      response_type: response,
    });
    get().loadTask(taskId);
  },

  completeTask: async (taskId, photoUrl) => {
    await api.post(`/task/${taskId}/complete`, {
      completion_photo_url: photoUrl ?? null,
    });
    get().loadTask(taskId);
  },

  cancelTask: async (taskId, reason) => {
    await api.post(`/task/${taskId}/cancel`, { reason });
    get().loadMyTasks();
  },

  updateTaskState: (taskId, newState) => {
    set((s) => ({
      activeTask: s.activeTask?.id === taskId
        ? { ...s.activeTask, state: newState }
        : s.activeTask,
      myTasks: s.myTasks.map((t) =>
        t.id === taskId ? { ...t, state: newState } : t,
      ),
    }));
  },
}));
