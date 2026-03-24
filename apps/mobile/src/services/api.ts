import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

// ─── Axios клиент ─────────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Автоматически добавляем JWT-токен
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Обрабатываем 401 — выкидываем из приложения
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      // Навигация к логину обрабатывается в authStore
    }
    return Promise.reject(error);
  },
);

// ─── Хелперы для загрузки файлов ──────────────────────────────────────────────

export interface VoiceParseResult {
  task_id: string;
  transcript: string;
  parsed: ParsedTask;
  state: string;
  next_question: ClarificationQuestion | null;
}

export async function uploadAudio(uri: string): Promise<VoiceParseResult> {
  const form = new FormData();
  form.append('file', { uri, name: 'audio.m4a', type: 'audio/m4a' } as never);
  const { data } = await api.post('/task/voice', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30_000,
  });
  return data;
}

export async function uploadPhoto(uri: string): Promise<{ url: string } | null> {
  try {
    const form = new FormData();
    form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as never);
    form.append('context', 'task_problem');
    const { data } = await api.post('/upload/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30_000,
    });
    return data;
  } catch (err) {
    console.warn('[uploadPhoto] не удалось загрузить фото:', err);
    return null;
  }
}

// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface LocationDTO {
  address: string;
  lat?: number;
  lng?: number;
}

export interface ParsedTask {
  category: string | null;
  title: string | null;
  item_description: string | null;
  from_location: LocationDTO | null;
  to_location: LocationDTO | null;
  price_suggested: number | null;
  missing_fields: string[];
  confidence: number;
}

export interface ClarificationQuestion {
  question_text: string;
  field: string;
  input_type: 'text' | 'location' | 'number' | 'select';
  options: string[] | null;
  step: number;
  total_steps: number;
}

export interface Task {
  id: string;
  state: string;
  category: string | null;
  title: string | null;
  item_description: string | null;
  from_location: LocationDTO | null;
  to_location: LocationDTO | null;
  price_suggested: number | null;
  price_final: number | null;
  payment_method: string | null;
  notes: string | null;
  client_id: string;
  executor_id: string | null;
  executor: { name: string; rating_avg: number | null } | null;
  scheduled_for: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  role: 'client' | 'executor';
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
}
