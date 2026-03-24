import Constants from 'expo-constants';

const LOCAL_IP = '192.168.0.52';

export const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  (__DEV__ ? `http://${LOCAL_IP}:3000` : 'https://api.quicky.app');

export const SOCKET_URL = API_URL;

export const COLORS = {
  primary:       '#6C5CE7',
  primaryLight:  '#EDE9FF',
  primaryDark:   '#5A4BD1',
  success:       '#00B894',
  successLight:  '#E0F9F4',
  danger:        '#FF6B6B',
  dangerLight:   '#FFE8E8',
  warning:       '#FDCB6E',
  warningLight:  '#FFF8E6',
  info:          '#74B9FF',
  infoLight:     '#E8F4FF',
  bg:            '#F5F6FA',
  card:          '#FFFFFF',
  border:        '#EBEBF0',
  divider:       '#F0F0F5',
  text:          '#1A1A2E',
  textMuted:     '#8E8E9A',
  textLight:     '#B8B8C4',
  tabBar:        '#1A1A2E',
  tabBarActive:  '#6C5CE7',
  tabBarInactive:'#5A5A6E',
  hot:           '#FF4757',
  hotLight:      '#FFE8EA',
};

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };

export const SHADOW = {
  sm: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
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
  draft:           '#B8B8C4',
  pending_confirm: '#FDCB6E',
  published:       '#74B9FF',
  accepted:        '#6C5CE7',
  in_progress:     '#6C5CE7',
  pending_client:  '#FF6B6B',
  completed:       '#00B894',
  rated:           '#00B894',
  cancelled:       '#B8B8C4',
  disputed:        '#FF4757',
};
