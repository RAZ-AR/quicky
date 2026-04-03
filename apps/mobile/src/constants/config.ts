import Constants from 'expo-constants';

const RENDER_URL = 'https://quicky-api.onrender.com';
export const API_URL    = RENDER_URL;
export const SOCKET_URL = API_URL;

// ─── Warm Editorial – Dark Charcoal ──────────────────────────────────────────
export const DARK_COLORS = {
  primary:        '#D49060',
  primaryLight:   '#E0AA80',
  primaryDark:    '#B87040',
  primaryGlow:    'rgba(212,144,96,0.22)',

  executor:       '#68A882',
  executorLight:  '#8EC4A0',
  executorGlow:   'rgba(104,168,130,0.20)',

  success:        '#68A882',
  successLight:   '#8EC4A0',
  successGlow:    'rgba(104,168,130,0.18)',

  danger:         '#D97A7A',
  dangerLight:    '#E89A9A',
  dangerGlow:     'rgba(217,122,122,0.22)',

  warning:        '#D4B060',
  warningLight:   '#E0C880',
  warningGlow:    'rgba(212,176,96,0.20)',

  hot:            '#D97A7A',
  hotGlow:        'rgba(217,122,122,0.28)',

  bg:             '#1C1610',
  bgLayer:        '#262018',
  bgElevated:     '#302A22',

  glass:          'rgba(255,253,246,0.07)',
  glassLight:     'rgba(255,253,246,0.11)',
  glassBorder:    'rgba(255,253,246,0.09)',
  glassBorderSubtle: 'rgba(255,253,246,0.05)',
  glassViolet:    'rgba(232,223,176,0.14)',
  glassCyan:      'rgba(196,212,190,0.12)',

  text:           '#F5EFE0',
  textMuted:      'rgba(245,239,224,0.48)',
  textLight:      'rgba(245,239,224,0.28)',

  border:         'rgba(255,253,246,0.09)',
  divider:        'rgba(255,253,246,0.05)',
  card:           'rgba(255,253,246,0.07)',
  tabBar:         '#1C1610',
  tabBarActive:   '#D49060',
  tabBarInactive: 'rgba(245,239,224,0.32)',

  surface:        'rgba(48,42,34,0.90)',
  overlay:        'rgba(0,0,0,0.45)',
};

// ─── Warm Editorial – Light Cream ────────────────────────────────────────────
export const LIGHT_COLORS = {
  primary:        '#B87040',
  primaryLight:   '#C88A60',
  primaryDark:    '#A06030',
  primaryGlow:    'rgba(184,112,64,0.15)',

  executor:       '#4E8B6E',
  executorLight:  '#6DAA8A',
  executorGlow:   'rgba(78,139,110,0.15)',

  success:        '#4E8B6E',
  successLight:   '#6DAA8A',
  successGlow:    'rgba(78,139,110,0.12)',

  danger:         '#C85050',
  dangerLight:    '#D97878',
  dangerGlow:     'rgba(200,80,80,0.12)',

  warning:        '#C89640',
  warningLight:   '#D4B060',
  warningGlow:    'rgba(200,150,64,0.12)',

  hot:            '#C85050',
  hotGlow:        'rgba(200,80,80,0.18)',

  bg:             '#F5EFE0',
  bgLayer:        '#FFFDF6',
  bgElevated:     '#EDE6D4',

  glass:          '#FFFDF6',
  glassLight:     '#FFFFFF',
  glassBorder:    'rgba(26,20,16,0.09)',
  glassBorderSubtle: 'rgba(26,20,16,0.05)',
  glassViolet:    '#E8DFB0',
  glassCyan:      '#C4D4BE',

  text:           '#1A1410',
  textMuted:      'rgba(26,20,16,0.48)',
  textLight:      'rgba(26,20,16,0.28)',

  border:         'rgba(26,20,16,0.09)',
  divider:        'rgba(26,20,16,0.05)',
  card:           '#FFFDF6',
  tabBar:         '#F5EFE0',
  tabBarActive:   '#1A1410',
  tabBarInactive: 'rgba(26,20,16,0.30)',

  surface:        '#EDE6D4',
  overlay:        'rgba(26,20,16,0.25)',
};

// ─── Градиенты ────────────────────────────────────────────────────────────────
export const DARK_GRADIENTS = {
  bg:       ['#1C1610', '#262018', '#1C1610'] as const,
  hero:     ['rgba(212,144,96,0.20)', 'rgba(104,168,130,0.10)', 'transparent'] as const,
  card:     ['rgba(255,253,246,0.09)', 'rgba(255,253,246,0.04)'] as const,
  primary:  ['#D49060', '#B87040'] as const,
  executor: ['#68A882', '#4E8B6E'] as const,
  success:  ['#68A882', '#4E8B6E'] as const,
  danger:   ['#D97A7A', '#C85050'] as const,
  hot:      ['#D97A7A', '#D4B060'] as const,
};

export const LIGHT_GRADIENTS = {
  bg:       ['#F5EFE0', '#F5EFE0', '#F5EFE0'] as const,
  hero:     ['rgba(184,112,64,0.12)', 'rgba(78,139,110,0.08)', 'transparent'] as const,
  card:     ['#FFFDF6', '#EDE6D4'] as const,
  primary:  ['#C88A60', '#B87040'] as const,
  executor: ['#6DAA8A', '#4E8B6E'] as const,
  success:  ['#6DAA8A', '#4E8B6E'] as const,
  danger:   ['#D97878', '#C85050'] as const,
  hot:      ['#D97878', '#C89640'] as const,
};

// ─── Типы ─────────────────────────────────────────────────────────────────────
export type AppColors    = typeof DARK_COLORS;
export type AppGradients = typeof DARK_GRADIENTS | typeof LIGHT_GRADIENTS;

// ─── Статические константы (не зависят от темы) ───────────────────────────────
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, xxl: 30, full: 999 };

export const SHADOW = {
  sm:   { shadowColor: '#1A1410', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,  elevation: 2 },
  md:   { shadowColor: '#1A1410', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
  glow: { shadowColor: '#B87040', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 6 },
  cyan: { shadowColor: '#4E8B6E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 4 },
};

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, xxxxll: 48
};

export const FONT = {
  xs:   { fontSize: 11, lineHeight: 16 },
  sm:   { fontSize: 13, lineHeight: 18 },
  md:   { fontSize: 15, lineHeight: 22 },
  lg:   { fontSize: 17, lineHeight: 24 },
  xl:   { fontSize: 20, lineHeight: 28 },
  xxl:  { fontSize: 24, lineHeight: 32 },
  hero: { fontSize: 28, lineHeight: 36 },
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
  draft:           '#9B8E7A',
  pending_confirm: '#C89640',
  published:       '#4E8B6E',
  accepted:        '#B87040',
  in_progress:     '#B87040',
  pending_client:  '#C85050',
  completed:       '#4E8B6E',
  rated:           '#4E8B6E',
  cancelled:       '#9B8E7A',
  disputed:        '#C85050',
};

// ─── Обратная совместимость (для компонентов не обновлённых на хук) ────────────
export const COLORS    = DARK_COLORS;
export const GRADIENTS = DARK_GRADIENTS;
