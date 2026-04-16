import { useLangStore } from '../stores/langStore';
import { T } from '../i18n/translations';

export function useLang() {
  const { language, setLanguage } = useLangStore();
  return { t: T[language], language, setLanguage };
}
