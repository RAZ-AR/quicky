import { useColorScheme } from 'react-native';
import { useThemeStore, type ThemePreference } from '../stores/themeStore';
import {
  DARK_COLORS, LIGHT_COLORS,
  DARK_GRADIENTS, LIGHT_GRADIENTS,
  RADIUS, SHADOW, FONT,
  type AppColors, type AppGradients,
} from '../constants/config';

export interface AppTheme {
  isDark:       boolean;
  blurTint:     'dark' | 'light';
  COLORS:       AppColors;
  GRADIENTS:    AppGradients;
  RADIUS:       typeof RADIUS;
  SHADOW:       typeof SHADOW;
  FONT:         typeof FONT;
  preference:   ThemePreference;
  setPreference:(p: ThemePreference) => void;
}

export function useAppTheme(): AppTheme {
  const systemScheme = useColorScheme();          // 'light' | 'dark' | null
  const { preference, setPreference } = useThemeStore();

  const isDark =
    preference === 'system'
      ? systemScheme !== 'light'   // default dark when system unknown
      : preference === 'dark';

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const gradients = isDark ? DARK_GRADIENTS : LIGHT_GRADIENTS;

  return {
    isDark,
    blurTint:     isDark ? 'dark' : 'light',
    COLORS:       colors,
    GRADIENTS:    gradients as AppGradients,
    RADIUS,
    SHADOW,
    FONT,
    preference,
    setPreference,
  };
}
