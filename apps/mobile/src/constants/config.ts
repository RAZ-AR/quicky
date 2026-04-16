import Constants from 'expo-constants';

const RENDER_URL = 'https://quicky-api.onrender.com';
export const API_URL    = RENDER_URL;
export const SOCKET_URL = API_URL;

// ─── Dark Neon Bento ──────────────────────────────────────────────────────────
export const DARK_COLORS = {
  primary:        '#FF8C5A',
  primaryLight:   '#FFA07A',
  primaryDark:    '#E85A20',
  primaryGlow:    'rgba(255,140,90,0.18)',
  executor:       '#A8F0B0',
  executorLight:  '#C8F8D0',
  executorGlow:   'rgba(168,240,176,0.18)',
  success:        '#A8F0B0',
  successLight:   '#C8F8D0',
  successGlow:    'rgba(168,240,176,0.15)',
  danger:         '#FF6B6B',
  dangerLight:    '#FF9090',
  dangerGlow:     'rgba(255,107,107,0.18)',
  warning:        '#F0E440',
  warningLight:   '#F5EE70',
  warningGlow:    'rgba(240,228,64,0.18)',
  hot:            '#FF6B6B',
  hotGlow:        'rgba(255,107,107,0.22)',
  // ── Neon card accents ──
  cardYellow:     '#F0E440',
  cardMint:       '#A8F0B0',
  cardBlue:       '#B8DCF5',
  cardPeach:      '#F5C4A0',
  cardLavender:   '#D4C8F0',
  // ──────────────────────
  bg:             '#0F0F0F',
  bgLayer:        '#1A1A1A',
  bgElevated:     '#242424',
  glass:          'rgba(255,255,255,0.05)',
  glassLight:     'rgba(255,255,255,0.08)',
  glassBorder:    'rgba(255,255,255,0.08)',
  glassBorderSubtle: 'rgba(255,255,255,0.04)',
  glassViolet:    'rgba(212,200,240,0.15)',
  glassCyan:      'rgba(168,240,176,0.12)',
  text:           '#FFFFFF',
  textMuted:      'rgba(255,255,255,0.45)',
  textLight:      'rgba(255,255,255,0.25)',
  border:         'rgba(255,255,255,0.08)',
  divider:        'rgba(255,255,255,0.06)',
  card:           '#1A1A1A',
  tabBar:         '#1A1A1A',
  tabBarActive:   '#FF8C5A',
  tabBarInactive: 'rgba(255,255,255,0.50)',
  surface:        'rgba(26,26,26,0.95)',
  overlay:        'rgba(0,0,0,0.70)',
};

// ─── Light (Clean White + Orange) ────────────────────────────────────────────
export const LIGHT_COLORS = {
  primary:        '#FF6B2E',
  primaryLight:   '#FF8C5A',
  primaryDark:    '#E85A20',
  primaryGlow:    'rgba(255,107,46,0.15)',
  executor:       '#3D7A5E',
  executorLight:  '#5A9A78',
  executorGlow:   'rgba(61,122,94,0.15)',
  success:        '#34C759',
  successLight:   '#5DD879',
  successGlow:    'rgba(52,199,89,0.15)',
  danger:         '#FF3B30',
  dangerLight:    '#FF6B62',
  dangerGlow:     'rgba(255,59,48,0.12)',
  warning:        '#FF9500',
  warningLight:   '#FFAD33',
  warningGlow:    'rgba(255,149,0,0.12)',
  hot:            '#FF3B30',
  hotGlow:        'rgba(255,59,48,0.15)',
  // ── Card accents (light mode pastel equivalents) ──
  cardYellow:     '#FFF3CC',
  cardMint:       '#D5F0E0',
  cardBlue:       '#D5E8F5',
  cardPeach:      '#FFE5D5',
  cardLavender:   '#EDE0F8',
  // ──────────────────────────────────────────────────
  bg:             '#F2F2F7',
  bgLayer:        '#FFFFFF',
  bgElevated:     '#E8E8ED',
  glass:          '#FFFFFF',
  glassLight:     '#FFFFFF',
  glassBorder:    'rgba(28,28,30,0.08)',
  glassBorderSubtle: 'rgba(28,28,30,0.04)',
  glassViolet:    '#FFE5D5',
  glassCyan:      '#C8E6E0',
  text:           '#1C1C1E',
  textMuted:      'rgba(28,28,30,0.48)',
  textLight:      'rgba(28,28,30,0.28)',
  border:         'rgba(28,28,30,0.08)',
  divider:        'rgba(28,28,30,0.05)',
  card:           '#FFFFFF',
  tabBar:         '#FFFFFF',
  tabBarActive:   '#FF6B2E',
  tabBarInactive: 'rgba(28,28,30,0.30)',
  surface:        '#F2F2F7',
  overlay:        'rgba(28,28,30,0.25)',
};

export const DARK_GRADIENTS = {
  bg:       ['#1C1A18', '#242220', '#1C1A18'] as const,
  hero:     ['rgba(255,140,90,0.20)', 'rgba(104,168,130,0.10)', 'transparent'] as const,
  card:     ['rgba(245,243,239,0.09)', 'rgba(245,243,239,0.04)'] as const,
  primary:  ['#FFA07A', '#FF8C5A'] as const,
  executor: ['#88C4A0', '#68A882'] as const,
  success:  ['#88C4A0', '#68A882'] as const,
  danger:   ['#E89A9A', '#D97A7A'] as const,
  hot:      ['#E89A9A', '#D4B060'] as const,
};

export const LIGHT_GRADIENTS = {
  bg:       ['#F2F2F7', '#F2F2F7', '#F2F2F7'] as const,
  hero:     ['rgba(255,107,46,0.10)', 'rgba(61,122,94,0.06)', 'transparent'] as const,
  card:     ['#FFFFFF', '#F2F2F7'] as const,
  primary:  ['#FF8C5A', '#FF6B2E'] as const,
  executor: ['#5A9A78', '#3D7A5E'] as const,
  success:  ['#5DD879', '#34C759'] as const,
  danger:   ['#FF6B62', '#FF3B30'] as const,
  hot:      ['#FF6B62', '#FF9500'] as const,
};

export type AppColors    = typeof DARK_COLORS;
export type AppGradients = typeof DARK_GRADIENTS | typeof LIGHT_GRADIENTS;

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, xxl: 30, full: 999 };

export const SHADOW = {
  sm: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  md: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },
  lg: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 12, elevation: 8,
  },
  orange: {
    shadowColor: '#FF6B2E', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
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
  draft:           '#8E8E93',
  pending_confirm: '#FF9500',
  published:       '#FF6B2E',
  accepted:        '#34C759',
  in_progress:     '#007AFF',
  pending_client:  '#FF9500',
  completed:       '#34C759',
  rated:           '#34C759',
  cancelled:       '#FF3B30',
  disputed:        '#FF3B30',
};

export const CATEGORIES = [
  { key: 'shopping',  label: 'Покупки',    icon: 'cart-outline',         color: '#FFE5D5', dark: '#F5C4A0', textColor: '#7A3010',  darkText: '#2A1000' },
  { key: 'delivery',  label: 'Доставка',   icon: 'cube-outline',         color: '#D5EDE8', dark: '#A8F0B0', textColor: '#0E3A34',  darkText: '#003A10' },
  { key: 'food',      label: 'Еда',        icon: 'restaurant-outline',   color: '#DCF0D0', dark: '#C8F0A0', textColor: '#1A3A0A',  darkText: '#102800' },
  { key: 'cleaning',  label: 'Клининг',    icon: 'sparkles-outline',     color: '#E8E0F0', dark: '#D4C8F0', textColor: '#2A1040',  darkText: '#1A0A30' },
  { key: 'errand',    label: 'Поручение',  icon: 'list-outline',         color: '#E0EAF8', dark: '#B8DCF5', textColor: '#0A1A40',  darkText: '#001830' },
  { key: 'courier',   label: 'Курьер',     icon: 'bicycle-outline',      color: '#FFF0D5', dark: '#F0E440', textColor: '#402A00',  darkText: '#2A2000' },
  { key: 'other',     label: 'Другое',     icon: 'ellipsis-horizontal',  color: '#EBEBF0', dark: '#E0E0E0', textColor: '#2A2A30',  darkText: '#1A1A1A' },
] as const;
export type CategoryKey = typeof CATEGORIES[number]['key'];

export const RECOMMENDED_PRICES: Record<string, { min: number; max: number }> = {
  shopping:  { min: 300,  max: 600 },
  delivery:  { min: 400,  max: 800 },
  food:      { min: 250,  max: 500 },
  cleaning:  { min: 800,  max: 2000 },
  errand:    { min: 200,  max: 400 },
  courier:   { min: 350,  max: 700 },
  other:     { min: 300,  max: 500 },
};

export const COLORS    = DARK_COLORS;
export const GRADIENTS = DARK_GRADIENTS;
