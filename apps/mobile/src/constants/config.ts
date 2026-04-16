import Constants from 'expo-constants';

const RENDER_URL = 'https://quicky-api.onrender.com';
export const API_URL    = RENDER_URL;
export const SOCKET_URL = API_URL;

// ─── Spectrum Cards – Light ───────────────────────────────────────────────────
export const LIGHT_COLORS = {
  primary:        '#1A1714',
  primaryLight:   '#3A3530',
  primaryDark:    '#0A0704',
  primaryGlow:    'rgba(26,23,20,0.10)',

  executor:       '#3D7A5E',
  executorLight:  '#5A9A78',
  executorGlow:   'rgba(61,122,94,0.15)',

  success:        '#3D7A5E',
  successLight:   '#5A9A78',
  successGlow:    'rgba(61,122,94,0.12)',

  danger:         '#C85050',
  dangerLight:    '#D97878',
  dangerGlow:     'rgba(200,80,80,0.12)',

  warning:        '#C89640',
  warningLight:   '#D4B060',
  warningGlow:    'rgba(200,150,64,0.12)',

  hot:            '#C85050',
  hotGlow:        'rgba(200,80,80,0.18)',

  bg:             '#EDEBE7',
  bgLayer:        '#F5F3EF',
  bgElevated:     '#E0DDD7',

  glass:          '#F5F3EF',
  glassLight:     '#FFFFFF',
  glassBorder:    'rgba(26,23,20,0.09)',
  glassBorderSubtle: 'rgba(26,23,20,0.05)',
  glassViolet:    '#D4B96A',
  glassCyan:      '#A8C5BE',

  text:           '#1A1714',
  textMuted:      'rgba(26,23,20,0.48)',
  textLight:      'rgba(26,23,20,0.28)',

  border:         'rgba(26,23,20,0.09)',
  divider:        'rgba(26,23,20,0.05)',
  card:           '#F5F3EF',
  tabBar:         '#EDEBE7',
  tabBarActive:   '#1A1714',
  tabBarInactive: 'rgba(26,23,20,0.30)',

  surface:        '#E4E1DB',
  overlay:        'rgba(26,23,20,0.25)',
};

// ─── Spectrum Cards – Dark ────────────────────────────────────────────────────
export const DARK_COLORS = {
  primary:        '#E8D090',
  primaryLight:   '#F0DFA8',
  primaryDark:    '#C8A860',
  primaryGlow:    'rgba(232,208,144,0.20)',

  executor:       '#68A882',
  executorLight:  '#88C4A0',
  executorGlow:   'rgba(104,168,130,0.20)',

  success:        '#68A882',
  successLight:   '#88C4A0',
  successGlow:    'rgba(104,168,130,0.18)',

  danger:         '#D97A7A',
  dangerLight:    '#E89A9A',
  dangerGlow:     'rgba(217,122,122,0.22)',

  warning:        '#D4B060',
  warningLight:   '#E0C880',
  warningGlow:    'rgba(212,176,96,0.20)',

  hot:            '#D97A7A',
  hotGlow:        'rgba(217,122,122,0.28)',

  bg:             '#1C1A18',
  bgLayer:        '#242220',
  bgElevated:     '#2E2C28',

  glass:          'rgba(245,243,239,0.07)',
  glassLight:     'rgba(245,243,239,0.11)',
  glassBorder:    'rgba(245,243,239,0.09)',
  glassBorderSubtle: 'rgba(245,243,239,0.05)',
  glassViolet:    'rgba(212,185,106,0.18)',
  glassCyan:      'rgba(168,197,190,0.15)',

  text:           '#F5F3EF',
  textMuted:      'rgba(245,243,239,0.48)',
  textLight:      'rgba(245,243,239,0.28)',

  border:         'rgba(245,243,239,0.09)',
  divider:        'rgba(245,243,239,0.05)',
  card:           'rgba(245,243,239,0.07)',
  tabBar:         '#1C1A18',
  tabBarActive:   '#E8D090',
  tabBarInactive: 'rgba(245,243,239,0.32)',

  surface:        'rgba(46,44,40,0.90)',
  overlay:        'rgba(0,0,0,0.45)',
};

// ─── Градиенты ────────────────────────────────────────────────────────────────
export const DARK_GRADIENTS = {
  bg:       ['#1C1A18', '#242220', '#1C1A18'] as const,
  hero:     ['rgba(232,208,144,0.20)', 'rgba(104,168,130,0.10)', 'transparent'] as const,
  card:     ['rgba(245,243,239,0.09)', 'rgba(245,243,239,0.04)'] as const,
  primary:  ['#F0DFA8', '#E8D090'] as const,
  executor: ['#88C4A0', '#68A882'] as const,
  success:  ['#88C4A0', '#68A882'] as const,
  danger:   ['#E89A9A', '#D97A7A'] as const,
  hot:      ['#E89A9A', '#D4B060'] as const,
};

export const LIGHT_GRADIENTS = {
  bg:       ['#EDEBE7', '#EDEBE7', '#EDEBE7'] as const,
  hero:     ['rgba(212,185,106,0.10)', 'rgba(61,122,94,0.06)', 'transparent'] as const,
  card:     ['#F5F3EF', '#E4E1DB'] as const,
  primary:  ['#3A3530', '#1A1714'] as const,
  executor: ['#5A9A78', '#3D7A5E'] as const,
  success:  ['#5A9A78', '#3D7A5E'] as const,
  danger:   ['#D97878', '#C85050'] as const,
  hot:      ['#D97878', '#C89640'] as const,
};

// ─── Типы ─────────────────────────────────────────────────────────────────────
export type AppColors    = typeof DARK_COLORS;
export type AppGradients = typeof DARK_GRADIENTS | typeof LIGHT_GRADIENTS;

// ─── Статические константы (не зависят от темы) ───────────────────────────────
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, xxl: 30, full: 999 };

export const SHADOW = {
  sm:   { shadowColor: '#1A1714', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,  elevation: 2 },
  md:   { shadowColor: '#1A1714', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
  glow: { shadowColor: '#1A1714', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 6 },
  cyan: { shadowColor: '#3D7A5E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 4 },
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
  published:       '#3D7A5E',
  accepted:        '#C89640',
  in_progress:     '#C89640',
  pending_client:  '#C85050',
  completed:       '#3D7A5E',
  rated:           '#3D7A5E',
  cancelled:       '#9B8E7A',
  disputed:        '#C85050',
};

// ─── Service Categories ─────────────────────────────────────────────────────
export const CATEGORIES = [
  { key: 'shopping',  label: 'Покупки',    icon: '🛒', color: '#D4B96A', dark: '#C4A858', textColor: '#4A3808' },
  { key: 'delivery',  label: 'Доставка',   icon: '📦', color: '#A8C5BE', dark: '#8EB0A8', textColor: '#0E3A34' },
  { key: 'food',      label: 'Еда',        icon: '🍕', color: '#B8C8A8', dark: '#A0B490', textColor: '#1A3A0A' },
  { key: 'cleaning',  label: 'Клининг',    icon: '🧹', color: '#C8B4A8', dark: '#B8A090', textColor: '#2A1810' },
  { key: 'errand',    label: 'Поручение',  icon: '📋', color: '#C4B8D0', dark: '#B0A4C0', textColor: '#1A0A30' },
  { key: 'courier',   label: 'Курьер',     icon: '🚴', color: '#B8C4D8', dark: '#A0B0C8', textColor: '#0A1A30' },
  { key: 'other',     label: 'Другое',     icon: '⚡', color: '#C8C4BC', dark: '#B4B0A8', textColor: '#1A1814' },
] as const;
export type CategoryKey = typeof CATEGORIES[number]['key'];

// ─── Recommended prices by category ─────────────────────────────────────────
export const RECOMMENDED_PRICES: Record<string, { min: number; max: number }> = {
  shopping:  { min: 300,  max: 600 },
  delivery:  { min: 400,  max: 800 },
  food:      { min: 250,  max: 500 },
  cleaning:  { min: 800,  max: 2000 },
  errand:    { min: 200,  max: 400 },
  courier:   { min: 350,  max: 700 },
  other:     { min: 300,  max: 500 },
};

// ─── Обратная совместимость (для компонентов не обновлённых на хук) ────────────
export const COLORS    = DARK_COLORS;
export const GRADIENTS = DARK_GRADIENTS;
