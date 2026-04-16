import { create } from 'zustand';
import type { Lang } from '../i18n/translations';

interface LangState {
  language: Lang;
  setLanguage: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  language: 'ru',
  setLanguage: (language) => set({ language }),
}));
