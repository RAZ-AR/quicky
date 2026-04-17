import Constants from 'expo-constants';

const RENDER_URL = 'https://quicky-api.onrender.com';
export const API_URL = process.env.EXPO_PUBLIC_API_URL
  ?? Constants.expoConfig?.extra?.apiUrl
  ?? RENDER_URL;
export const SOCKET_URL = API_URL;

// ─── Quicky Design System ─────────────────────────────────────────────────────
// Acid yellow #D6F24A · Warm canvas #F3F1EC · Ink dark #0E0E10

export const LIGHT_COLORS = {
  primary:        '#D6F24A',   // acid yellow — Quicky signature
  primaryLight:   '#E9F7A8',   // acidSoft
  primaryDark:    '#B6D330',   // acidDeep
  primaryGlow:    'rgba(214,242,74,0.22)',

  executor:       '#C9E9D0',   // mint
  executorLight:  '#E0F5E4',
  executorGlow:   'rgba(201,233,208,0.35)',

  success:        '#0E8B4A',
  successLight:   '#2AA060',
  successGlow:    'rgba(14,139,74,0.12)',

  danger:         '#D93838',
  dangerLight:    '#E55555',
  dangerGlow:     'rgba(217,56,56,0.10)',

  warning:        '#E8A53A',
  warningLight:   '#F0C060',
  warningGlow:    'rgba(232,165,58,0.15)',

  hot:            '#D93838',
  hotGlow:        'rgba(217,56,56,0.15)',

  // ── Card accents (category colors) ──
  cardYellow:     '#E9F7A8',
  cardMint:       '#C9E9D0',
  cardBlue:       '#C7E6FF',
  cardPeach:      '#FFD9C2',
  cardLavender:   '#E8E4F0',

  // ── Backgrounds ──
  bg:             '#F3F1EC',   // warm canvas
  bgLayer:        '#FFFFFF',   // card surface
  bgElevated:     '#FFFFFF',
  bgInk:          '#0E0E10',   // for tab bar / dark pills

  // ── Glass ──
  glass:          'rgba(255,255,255,0.80)',
  glassLight:     'rgba(255,255,255,0.96)',
  glassBorder:    'rgba(20,20,26,0.06)',
  glassBorderSubtle: 'rgba(20,20,26,0.03)',
  glassViolet:    'rgba(214,242,74,0.15)',
  glassCyan:      'rgba(201,233,208,0.20)',

  // ── Ink text ──
  text:           '#14141A',
  textMuted:      'rgba(20,20,26,0.52)',
  textLight:      'rgba(20,20,26,0.28)',
  border:         'rgba(20,20,26,0.08)',
  divider:        'rgba(20,20,26,0.05)',

  // ── Components ──
  card:           '#FFFFFF',
  tabBar:         '#0E0E10',    // dark floating dock
  tabBarActive:   '#D6F24A',    // acid yellow active pill
  tabBarInactive: 'rgba(255,255,255,0.55)',
  surface:        'rgba(255,255,255,0.95)',
  overlay:        'rgba(14,14,16,0.50)',
};

export const DARK_COLORS = {
  primary:        '#D6F24A',
  primaryLight:   '#E9F7A8',
  primaryDark:    '#B6D330',
  primaryGlow:    'rgba(214,242,74,0.20)',

  executor:       '#A8F0B0',
  executorLight:  '#C8F8D0',
  executorGlow:   'rgba(168,240,176,0.18)',

  success:        '#A8F0B0',
  successLight:   '#C8F8D0',
  successGlow:    'rgba(168,240,176,0.15)',

  danger:         '#FF6B6B',
  dangerLight:    '#FF9090',
  dangerGlow:     'rgba(255,107,107,0.18)',

  warning:        '#E8A53A',
  warningLight:   '#F0C060',
  warningGlow:    'rgba(232,165,58,0.18)',

  hot:            '#FF6B6B',
  hotGlow:        'rgba(255,107,107,0.22)',

  cardYellow:     '#E9F7A8',
  cardMint:       '#A8F0B0',
  cardBlue:       '#C7E6FF',
  cardPeach:      '#FFD9C2',
  cardLavender:   '#D4C8F0',

  bg:             '#0E0E10',
  bgLayer:        '#1A1A1E',
  bgElevated:     '#242428',
  bgInk:          '#0E0E10',

  glass:          'rgba(255,255,255,0.05)',
  glassLight:     'rgba(255,255,255,0.08)',
  glassBorder:    'rgba(255,255,255,0.08)',
  glassBorderSubtle: 'rgba(255,255,255,0.04)',
  glassViolet:    'rgba(214,242,74,0.12)',
  glassCyan:      'rgba(168,240,176,0.12)',

  text:           '#FFFFFF',
  textMuted:      'rgba(255,255,255,0.45)',
  textLight:      'rgba(255,255,255,0.25)',
  border:         'rgba(255,255,255,0.08)',
  divider:        'rgba(255,255,255,0.06)',

  card:           '#1A1A1E',
  tabBar:         '#0E0E10',
  tabBarActive:   '#D6F24A',
  tabBarInactive: 'rgba(255,255,255,0.50)',
  surface:        'rgba(26,26,30,0.95)',
  overlay:        'rgba(0,0,0,0.70)',
};

export const DARK_GRADIENTS = {
  bg:       ['#0E0E10', '#1A1A1E', '#0E0E10'] as const,
  hero:     ['rgba(214,242,74,0.15)', 'rgba(201,233,208,0.08)', 'transparent'] as const,
  card:     ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)'] as const,
  primary:  ['#E9F7A8', '#D6F24A'] as const,
  executor: ['#C8F8D0', '#A8F0B0'] as const,
  success:  ['#88C4A0', '#68A882'] as const,
  danger:   ['#E89A9A', '#D97A7A'] as const,
  hot:      ['#E89A9A', '#D4B060'] as const,
};

export const LIGHT_GRADIENTS = {
  bg:       ['#F3F1EC', '#F3F1EC', '#F3F1EC'] as const,
  hero:     ['rgba(214,242,74,0.18)', 'rgba(201,233,208,0.10)', 'transparent'] as const,
  card:     ['#FFFFFF', '#F8F7F3'] as const,
  primary:  ['#E9F7A8', '#D6F24A'] as const,
  executor: ['#C9E9D0', '#A8E0B8'] as const,
  success:  ['#60D890', '#34C759'] as const,
  danger:   ['#FF6B62', '#FF3B30'] as const,
  hot:      ['#FF6B62', '#FF9500'] as const,
};

export type AppColors    = typeof DARK_COLORS;
export type AppGradients = typeof DARK_GRADIENTS | typeof LIGHT_GRADIENTS;

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 22, xxl: 30, full: 999 };

export const SHADOW = {
  sm: {
    shadowColor: '#14141A', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  md: {
    shadowColor: '#14141A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  lg: {
    shadowColor: '#14141A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 8,
  },
  orange: {
    // kept for backward compat — points to acid
    shadowColor: '#D6F24A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40, shadowRadius: 10, elevation: 8,
  },
  acid: {
    shadowColor: '#B6D330', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
};

export const NEO = {
  card: {
    shadowColor:   '#14141A',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  16,
    elevation:     4,
  },
  btn: {
    shadowColor:   '#14141A',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     3,
  },
  pressed: {
    shadowColor:   '#14141A',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius:  4,
    elevation:     1,
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
  draft:           '#B8B2A3',
  pending_confirm: '#E8A53A',
  published:       '#D6F24A',
  accepted:        '#0E8B4A',
  in_progress:     '#C7E6FF',
  pending_client:  '#E8A53A',
  completed:       '#0E8B4A',
  rated:           '#0E8B4A',
  cancelled:       '#D93838',
  disputed:        '#D93838',
};

export const CATEGORIES = [
  { key: 'shopping',  label: 'Покупки',    icon: 'cart-outline',         color: '#FFD9C2', dark: '#E8A53A', textColor: '#7A3010',  darkText: '#3A1800' },
  { key: 'delivery',  label: 'Доставка',   icon: 'cube-outline',         color: '#C7E6FF', dark: '#5BAAD6', textColor: '#0A2A40',  darkText: '#001830' },
  { key: 'food',      label: 'Еда',        icon: 'restaurant-outline',   color: '#C9E9D0', dark: '#4CAF78', textColor: '#0E3A1A',  darkText: '#002A10' },
  { key: 'cleaning',  label: 'Клининг',    icon: 'sparkles-outline',     color: '#E8E4F0', dark: '#9B8DC8', textColor: '#2A1A44',  darkText: '#1A0A30' },
  { key: 'errand',    label: 'Поручение',  icon: 'list-outline',         color: '#E9F7A8', dark: '#B6D330', textColor: '#2A3800',  darkText: '#1A2800' },
  { key: 'courier',   label: 'Курьер',     icon: 'bicycle-outline',      color: '#FFD9C2', dark: '#E8783A', textColor: '#402A00',  darkText: '#2A1800' },
  { key: 'other',     label: 'Другое',     icon: 'ellipsis-horizontal',  color: '#F0EDE8', dark: '#B8B2A3', textColor: '#2A2A22',  darkText: '#1A1A14' },
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

// Default theme — warm Quicky light palette
export const COLORS    = LIGHT_COLORS;
export const GRADIENTS = LIGHT_GRADIENTS;
