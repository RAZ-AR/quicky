import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { getSocket, disconnectSocket } from '../services/socket';
import type { User } from '../services/api';

interface AuthState {
  user:        User | null;
  token:       string | null;
  isLoading:   boolean;
  isHydrated:  boolean;

  hydrate:                  () => Promise<void>;
  loginWithGoogle:          (idToken: string) => Promise<SocialResult>;
  loginWithApple:           (identityToken: string, fullName?: string) => Promise<SocialResult>;
  initTelegramLogin:        () => Promise<{ session_id: string; widget_url: string }>;
  pollTelegramLogin:        (sessionId: string) => Promise<SocialResult>;
  completeSocialRegistration: (tempToken: string, name: string, role: 'client' | 'executor') => Promise<void>;
  logout:                   () => Promise<void>;
}

export interface SocialResult {
  status?:        'pending' | 'done';
  is_new_user:    boolean;
  temp_token?:    string;
  suggested_name?: string;
}

// ── DEV MOCK ──────────────────────────────────────────────────────────────────
const DEV_ROLE: 'executor' | 'client' | null = 'executor';
const DEV_USER: User | null = DEV_ROLE ? {
  id: 'dev-1', name: 'Алексей И.', role: DEV_ROLE, phone: null,
} as unknown as User : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user:       DEV_USER,
  token:      DEV_USER ? 'dev-token' : null,
  isLoading:  false,
  isHydrated: !!DEV_USER,

  hydrate: async () => {
    if (DEV_USER) { set({ isHydrated: true }); return; }
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) { set({ isHydrated: true }); return; }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, token, isHydrated: true });
      getSocket(token);
    } catch {
      await AsyncStorage.removeItem('auth_token');
      set({ isHydrated: true });
    }
  },

  // ── Google ──────────────────────────────────────────────────────────────────
  loginWithGoogle: async (idToken) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/google', { id_token: idToken });
      if (!data.is_new_user && data.token) {
        await _saveSession(data.token, data.user, set);
      }
      return { is_new_user: data.is_new_user, temp_token: data.temp_token, suggested_name: data.suggested_name };
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Apple ───────────────────────────────────────────────────────────────────
  loginWithApple: async (identityToken, fullName) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/apple', { identity_token: identityToken, full_name: fullName });
      if (!data.is_new_user && data.token) {
        await _saveSession(data.token, data.user, set);
      }
      return { is_new_user: data.is_new_user, temp_token: data.temp_token, suggested_name: data.suggested_name };
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Telegram init ────────────────────────────────────────────────────────────
  initTelegramLogin: async () => {
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const apiUrl = (await import('../constants/config')).API_URL;
    const widgetUrl = `${apiUrl}/auth/telegram/widget?session_id=${sessionId}`;
    return { session_id: sessionId, widget_url: widgetUrl };
  },

  // ── Telegram poll ────────────────────────────────────────────────────────────
  pollTelegramLogin: async (sessionId) => {
    const { data } = await api.get(`/auth/telegram/poll?session_id=${sessionId}`);
    if (data.status === 'pending') {
      return { is_new_user: false }; // продолжаем поллить
    }
    if (!data.is_new_user && data.jwt) {
      await _saveSession(data.jwt, null, set);
      // Получаем пользователя
      const { data: meData } = await api.get('/auth/me');
      set({ user: meData.user });
    }
    return {
      is_new_user:    data.is_new_user,
      temp_token:     data.temp_token,
      suggested_name: data.suggested_name,
    };
  },

  // ── Complete registration ────────────────────────────────────────────────────
  completeSocialRegistration: async (tempToken, name, role) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/social-complete', { temp_token: tempToken, name, role });
      await _saveSession(data.token, data.user, set);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    disconnectSocket();
    set({ user: null, token: null });
  },
}));

// ─── helpers ─────────────────────────────────────────────────────────────────
async function _saveSession(
  token: string,
  user: User | null,
  set: (s: Partial<AuthState>) => void,
) {
  await AsyncStorage.setItem('auth_token', token);
  set({ token });
  if (user) set({ user });
  getSocket(token);
}
