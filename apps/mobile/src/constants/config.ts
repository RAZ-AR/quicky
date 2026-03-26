import Constants from 'expo-constants';

const RENDER_URL = 'https://quicky-api.onrender.com';
export const API_URL    = RENDER_URL;
export const SOCKET_URL = API_URL;

// ─── Aurora Glass – Dark Cosmos ───────────────────────────────────────────────
export const DARK_COLORS = {
  primary:        '#8B5CF6',
  primaryLight:   '#A78BFA',
  primaryDark:    '#7C3AED',
  primaryGlow:    'rgba(139,92,246,0.35)',

  executor:       '#06B6D4',
  executorLight:  '#22D3EE',
  executorGlow:   'rgba(6,182,212,0.35)',

  success:        '#10B981',
  successLight:   '#34D399',
  successGlow:    'rgba(16,185,129,0.30)',

  danger:         '#F43F5E',
  dangerLight:    '#FB7185',
  dangerGlow:     'rgba(244,63,94,0.18)',

  warning:        '#F59E0B',
  warningLight:   '#FCD34D',
  warningGlow:    'rgba(245,158,11,0.18)',

  hot:            '#F43F5E',
  hotGlow:        'rgba(244,63,94,0.40)',

  bg:             '#0D0B1E',
  bgLayer:        '#13112A',
  bgElevated:     '#1A1535',

  glass:          'rgba(255,255,255,0.07)',
  glassLight:     'rgba(255,255,255,0.12)',
  glassBorder:    'rgba(255,255,255,0.10)',
  glassViolet:    'rgba(139,92,246,0.15)',
  glassCyan:      'rgba(6,182,212,0.12)',

  text:           '#F0EEFF',
  textMuted:      'rgba(240,238,255,0.55)',
  textLight:      'rgba(240,238,255,0.30)',

  border:         'rgba(255,255,255,0.10)',
  divider:        'rgba(255,255,255,0.06)',
  card:           'rgba(255,255,255,0.07)',
  tabBar:         'rgba(13,11,30,0.90)',
  tabBarActive:   '#8B5CF6',
  tabBarInactive: 'rgba(240,238,255,0.35)',
};

// ─── Aurora Glass – Light Aura ────────────────────────────────────────────────
export const LIGHT_COLORS = {
  primary:        '#7C3AED',
  primaryLight:   '#8B5CF6',
  primaryDark:    '#6D28D9',
  primaryGlow:    'rgba(124,58,237,0.18)',

  executor:       '#0891B2',
  executorLight:  '#06B6D4',
  executorGlow:   'rgba(8,145,178,0.18)',

  success:        '#059669',
  successLight:   '#10B981',
  successGlow:    'rgba(5,150,105,0.15)',

  danger:         '#E11D48',
  dangerLight:    '#F43F5E',
  dangerGlow:     'rgba(225,29,72,0.10)',

  warning:        '#D97706',
  warningLight:   '#F59E0B',
  warningGlow:    'rgba(217,119,6,0.10)',

  hot:            '#E11D48',
  hotGlow:        'rgba(225,29,72,0.20)',

  bg:             '#F8F7FF',
  bgLayer:        '#FFFFFF',
  bgElevated:     '#F0EDFB',

  glass:          'rgba(255,255,255,0.75)',
  glassLight:     'rgba(255,255,255,0.92)',
  glassBorder:    'rgba(139,92,246,0.14)',
  glassViolet:    'rgba(124,58,237,0.07)',
  glassCyan:      'rgba(8,145,178,0.07)',

  text:           '#1A1040',
  textMuted:      'rgba(26,16,64,0.55)',
  textLight:      'rgba(26,16,64,0.32)',

  border:         'rgba(139,92,246,0.14)',
  divider:        'rgba(139,92,246,0.08)',
  card:           'rgba(255,255,255,0.75)',
  tabBar:         'rgba(248,247,255,0.92)',
  tabBarActive:   '#7C3AED',
  tabBarInactive: 'rgba(26,16,64,0.35)',
};

// ─── Градиенты ────────────────────────────────────────────────────────────────
export const DARK_GRADIENTS = {
  bg:       ['#0D0B1E', '#13112A', '#0D0B1E'] as const,
  hero:     ['rgba(139,92,246,0.40)', 'rgba(6,182,212,0.20)', 'transparent'] as const,
  card:     ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)'] as const,
  primary:  ['#8B5CF6', '#7C3AED'] as const,
  executor: ['#06B6D4', '#0891B2'] as const,
  success:  ['#10B981', '#059669'] as const,
  danger:   ['#F43F5E', '#E11D48'] as const,
  hot:      ['#F43F5E', '#F59E0B'] as const,
};

export const LIGHT_GRADIENTS = {
  bg:       ['#F8F7FF', '#EFF6FF', '#F8F7FF'] as const,
  hero:     ['rgba(124,58,237,0.15)', 'rgba(8,145,178,0.08)', 'transparent'] as const,
  card:     ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.75)'] as const,
  primary:  ['#8B5CF6', '#7C3AED'] as const,
  executor: ['#06B6D4', '#0891B2'] as const,
  success:  ['#10B981', '#059669'] as const,
  danger:   ['#F43F5E', '#E11D48'] as const,
  hot:      ['#F43F5E', '#F59E0B'] as const,
};

// ─── Типы ─────────────────────────────────────────────────────────────────────
export type AppColors    = typeof DARK_COLORS;
export type AppGradients = typeof DARK_GRADIENTS;

// ─── Статические константы (не зависят от темы) ───────────────────────────────
export const RADIUS = { sm: 10, md: 16, lg: 20, xl: 28, xxl: 36, full: 999 };

export const SHADOW = {
  sm:   { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.20, shadowRadius: 12, elevation: 3 },
  md:   { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 24, elevation: 6 },
  glow: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.60, shadowRadius: 20, elevation: 8 },
  cyan: { shadowColor: '#06B6D4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 6 },
};

export const FONT = {
  xs:   { fontSize: 11, lineHeight: 16 },
  sm:   { fontSize: 13, lineHeight: 18 },
  md:   { fontSize: 15, lineHeight: 22 },
  lg:   { fontSize: 17, lineHeight: 24 },
  xl:   { fontSize: 20, lineHeight: 28 },
  xxl:  { fontSize: 26, lineHeight: 34 },
  hero: { fontSize: 32, lineHeight: 40 },
};

export const TASK_STATE_LABELS: Record<string, string> = {
  draft:           'Создаётся',
  pending_confirm: 'Ожидает подтверждения',
  published:       'Опубликовано',
  accepted:        'Принято',
  in_progress:     'Выполняется',
  pending_client:  'Ожидает ответа',
  completed:       'Завершено',
  rated:           'Оценено',
  cancelled:       'Отменено',
  disputed:        'Спор',
};

export const TASK_STATE_COLORS: Record<string, string> = {
  draft:           '#9CA3AF',
  pending_confirm: '#F59E0B',
  published:       '#06B6D4',
  accepted:        '#8B5CF6',
  in_progress:     '#8B5CF6',
  pending_client:  '#F43F5E',
  completed:       '#10B981',
  rated:           '#10B981',
  cancelled:       '#9CA3AF',
  disputed:        '#F43F5E',
};

// ─── Обратная совместимость (для компонентов не обновлённых на хук) ────────────
export const COLORS    = DARK_COLORS;
export const GRADIENTS = DARK_GRADIENTS;
