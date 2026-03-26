import Constants from 'expo-constants';

const RENDER_URL = 'https://quicky-api.onrender.com';

export const API_URL = RENDER_URL;

export const SOCKET_URL = API_URL;

// ─── Aurora Glass Design System ───────────────────────────────────────────────
// Dark cosmos base + liquid glass cards + violet/cyan accents

export const COLORS = {
  // ── Акценты ──────────────────────────────────────────────────────────────
  primary:        '#8B5CF6',   // violet — клиент
  primaryLight:   '#A78BFA',
  primaryDark:    '#7C3AED',
  primaryGlow:    'rgba(139,92,246,0.35)',

  executor:       '#06B6D4',   // cyan — исполнитель
  executorLight:  '#22D3EE',
  executorGlow:   'rgba(6,182,212,0.35)',

  success:        '#10B981',
  successLight:   '#34D399',
  successGlow:    'rgba(16,185,129,0.30)',

  danger:         '#F43F5E',
  dangerLight:    '#FB7185',
  dangerGlow:     'rgba(244,63,94,0.30)',

  warning:        '#F59E0B',
  warningLight:   '#FCD34D',
  warningGlow:    'rgba(245,158,11,0.30)',

  hot:            '#F43F5E',
  hotGlow:        'rgba(244,63,94,0.40)',

  // ── Фоны ──────────────────────────────────────────────────────────────────
  bg:             '#0D0B1E',   // deep cosmos
  bgLayer:        '#13112A',   // чуть светлее — для секций
  bgElevated:     '#1A1535',   // карточки без glass

  // ── Glass-слои (полупрозрачные) ────────────────────────────────────────────
  glass:          'rgba(255,255,255,0.07)',
  glassLight:     'rgba(255,255,255,0.12)',
  glassBorder:    'rgba(255,255,255,0.10)',
  glassViolet:    'rgba(139,92,246,0.15)',
  glassCyan:      'rgba(6,182,212,0.12)',

  // ── Текст ─────────────────────────────────────────────────────────────────
  text:           '#F0EEFF',   // почти белый с фиолетовым оттенком
  textMuted:      'rgba(240,238,255,0.55)',
  textLight:      'rgba(240,238,255,0.30)',

  // ── UI элементы ───────────────────────────────────────────────────────────
  border:         'rgba(255,255,255,0.10)',
  divider:        'rgba(255,255,255,0.06)',
  card:           'rgba(255,255,255,0.07)',  // алиас для совместимости
  tabBar:         'rgba(13,11,30,0.85)',
  tabBarActive:   '#8B5CF6',
  tabBarInactive: 'rgba(240,238,255,0.35)',
};

// ── Скругления ────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   10,
  md:   16,
  lg:   20,
  xl:   28,
  xxl:  36,
  full: 999,
};

// ── Тени / Glow ───────────────────────────────────────────────────────────────
export const SHADOW = {
  sm: {
    shadowColor:   '#8B5CF6',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius:  12,
    elevation:     3,
  },
  md: {
    shadowColor:   '#8B5CF6',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius:  24,
    elevation:     6,
  },
  glow: {
    shadowColor:   '#8B5CF6',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.60,
    shadowRadius:  20,
    elevation:     8,
  },
  cyan: {
    shadowColor:   '#06B6D4',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  20,
    elevation:     6,
  },
};

// ── Градиенты ─────────────────────────────────────────────────────────────────
export const GRADIENTS = {
  bg:        ['#0D0B1E', '#13112A', '#0D0B1E'] as const,
  hero:      ['rgba(139,92,246,0.40)', 'rgba(6,182,212,0.20)', 'transparent'] as const,
  card:      ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)'] as const,
  primary:   ['#8B5CF6', '#7C3AED'] as const,
  executor:  ['#06B6D4', '#0891B2'] as const,
  success:   ['#10B981', '#059669'] as const,
  danger:    ['#F43F5E', '#E11D48'] as const,
  hot:       ['#F43F5E', '#F59E0B'] as const,
};

// ── Типографика ───────────────────────────────────────────────────────────────
export const FONT = {
  xs:    { fontSize: 11, lineHeight: 16 },
  sm:    { fontSize: 13, lineHeight: 18 },
  md:    { fontSize: 15, lineHeight: 22 },
  lg:    { fontSize: 17, lineHeight: 24 },
  xl:    { fontSize: 20, lineHeight: 28 },
  xxl:   { fontSize: 26, lineHeight: 34 },
  hero:  { fontSize: 32, lineHeight: 40 },
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
  draft:           'rgba(240,238,255,0.30)',
  pending_confirm: '#F59E0B',
  published:       '#06B6D4',
  accepted:        '#8B5CF6',
  in_progress:     '#8B5CF6',
  pending_client:  '#F43F5E',
  completed:       '#10B981',
  rated:           '#10B981',
  cancelled:       'rgba(240,238,255,0.25)',
  disputed:        '#F43F5E',
};
