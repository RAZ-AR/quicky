import { useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, SHADOW, NEO, CATEGORIES, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import type { Task } from '../../src/services/api';

// ─── Mock data shown when real tasks list is empty ───────────────────────────
const MOCK_TASKS = [
  {
    id: 'mock-1',
    state: 'in_progress',
    item_description: 'Купить продукты: молоко, хлеб, яйца',
    category: 'shopping',
    to_location: { address: 'пр. Победы, 45, кв. 12' },
    price_final: 450,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'mock-2',
    state: 'completed',
    item_description: 'Доставить посылку из СДЭК в офис',
    category: 'delivery',
    to_location: { address: 'БЦ Альфа, пр. Маркса, 1' },
    price_final: 600,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'mock-3',
    state: 'published',
    item_description: 'Забрать вещи из химчистки',
    category: 'errand',
    to_location: { address: 'ул. Гагарина, 100, кв. 5' },
    price_final: 350,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'mock-4',
    state: 'rated',
    item_description: 'Клининг квартиры 2 комнаты',
    category: 'cleaning',
    to_location: { address: 'ул. Мира, 15, кв. 8' },
    price_final: 1800,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCatMeta(categoryKey?: string) {
  const found = CATEGORIES.find(c => c.key === categoryKey);
  return found ?? CATEGORIES[CATEGORIES.length - 1]; // fallback to 'other'
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ item, onPress, styles, COLORS }: { item: Task | typeof MOCK_TASKS[number]; onPress: () => void; styles: any; COLORS: any }) {
  const cat = getCatMeta((item as any).category);
  const stateColor = TASK_STATE_COLORS[(item as any).state] ?? COLORS.textMuted;
  const stateLabel = TASK_STATE_LABELS[(item as any).state] ?? (item as any).state;
  const accentColor = cat.dark as string;
  const chipBg = accentColor + '22';

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: accentColor }]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      {/* Top row: icon chip + title area */}
      <View style={styles.cardTop}>
        {/* Category icon chip */}
        <View style={[styles.iconChip, { backgroundColor: chipBg }]}>
          <Ionicons name={(cat as any).icon} size={16} color={accentColor} />
        </View>

        {/* Title + subtitle */}
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {(item as any).item_description ?? 'Заказ'}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {cat.label}
            {(item as any).price_final ? ` · ${(item as any).price_final} ₽` : ''}
          </Text>
        </View>
      </View>

      {/* Bottom row: state badge + date */}
      <View style={styles.cardBottom}>
        {/* State badge */}
        <View style={[styles.badge, { backgroundColor: stateColor + '20' }]}>
          <Text style={[styles.badgeText, { color: stateColor }]}>{stateLabel}</Text>
        </View>

        {/* Address row */}
        {(item as any).to_location?.address ? (
          <View style={styles.addrRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.textLight} />
            <Text style={styles.addrText} numberOfLines={1}>
              {(item as any).to_location.address}
            </Text>
          </View>
        ) : null}

        {/* Date */}
        <Text style={styles.cardDate}>
          {formatDate((item as any).created_at ?? '')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ClientTasksTab() {
  const router = useRouter();
  const { myTasks, isLoading, loadMyTasks } = useTaskStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  useEffect(() => { loadMyTasks(); }, []);

  // Show mock data when there are no real tasks yet
  const displayTasks = myTasks.length > 0 ? myTasks : MOCK_TASKS;
  const isMock = myTasks.length === 0;

  const handleCardPress = (id: string) => {
    if (isMock) return;
    router.push({ pathname: '/(client)/tasks/[id]', params: { id } });
  };

  const renderItem = ({ item }: { item: typeof displayTasks[number] }) => (
    <TaskCard
      item={item as any}
      onPress={() => handleCardPress(item.id)}
      styles={styles}
      COLORS={COLORS}
    />
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Мои заказы</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push('/(client)/voice')}
            activeOpacity={0.85}
          >
            <Text style={styles.newBtnText}>+ Новый</Text>
          </TouchableOpacity>
        </View>

        {isLoading && myTasks.length === 0 ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={displayTasks as any[]}
            keyExtractor={t => t.id}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.list,
              displayTasks.length === 0 && styles.listEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={loadMyTasks}
                tintColor={COLORS.primary}
              />
            }
            ListHeaderComponent={
              isMock && myTasks.length === 0 ? (
                <View style={styles.mockBanner}>
                  <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.35)" />
                  <Text style={styles.mockBannerText}>Примеры заказов — создайте свой первый</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={56} color="rgba(255,255,255,0.45)" />
                <Text style={styles.emptyText}>Заказов пока нет</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(client)/voice')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyBtnText}>Создать первый заказ</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C: typeof import('../../src/constants/config').DARK_COLORS, isDark: boolean) {
  return StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  safe:  { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.8,
  },
  newBtn: {
    borderRadius: RADIUS.full,
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── List ──
  list:      { paddingHorizontal: 16, paddingBottom: 110 },
  listEmpty: { flex: 1 },

  // ── Mock banner ──
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  mockBannerText: {
    fontSize: 12,
    color: C.textLight,
  },

  // ── Card ──
  card: {
    backgroundColor: C.bgLayer,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: C.border,
    marginBottom: 12,
    padding: 14,
    gap: 10,
    ...(isDark ? SHADOW.sm : {
      shadowColor: '#9BA3BC',
      shadowOffset: { width: 5, height: 5 },
      shadowOpacity: 0.40,
      shadowRadius: 10,
      elevation: 8,
    }),
  },

  // Card top row
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardMeta: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 3,
  },

  // Card bottom row
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addrRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addrText: {
    fontSize: 11,
    color: C.textLight,
    flexShrink: 1,
  },
  cardDate: {
    fontSize: 11,
    color: C.textLight,
    textAlign: 'right',
  },

  // ── Empty state ──
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
  },
  emptyBtn: {
    marginTop: 4,
    borderRadius: RADIUS.xl,
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  });
}
