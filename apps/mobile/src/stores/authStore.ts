import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { getSocket, disconnectSocket } from '../services/socket';
import type { User } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<{ is_new_user: boolean }>;
  register: (phone: string, name: string, role: 'client' | 'executor') => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:        null,
  token:       null,
  isLoading:   false,
  isHydrated:  false,

  // Восстановить сессию при запуске приложения
  hydrate: async () => {
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

  sendOtp: async (phone) => {
    set({ isLoading: true });
    try {
      await api.post('/auth/send-otp', { phone });
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp });
      if (!data.is_new_user && data.token) {
        await AsyncStorage.setItem('auth_token', data.token);
        set({ user: data.user, token: data.token });
        getSocket(data.token);
      }
      return { is_new_user: data.is_new_user };
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (phone, name, role) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/register-new', { phone, name, role });
      await AsyncStorage.setItem('auth_token', data.token);
      set({ user: data.user, token: data.token });
      getSocket(data.token);
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
