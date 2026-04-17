import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '../../src/stores/taskStore';
import { useAuthStore } from '../../src/stores/authStore';
import { getSocketInstance } from '../../src/services/socket';
import {
  RADIUS, SHADOW, NEO, CATEGORIES, TASK_STATE_COLORS, TASK_STATE_LABELS,
  type AppColors,
} from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import GradBtn from '../../src/components/GradBtn';

// ── Mock data (fallback когда API недоступен) ──────────────────────────────────
const MOCK_FEED: any[] = [
  {
    id: 'feed-1', state: 'published', category: 'shopping',
    item_description: 'Купить продукты: хлеб, молоко, творог, яйца в Дикси',
    from_location: { address: 'Дикси, ул. Садовая, 15' },
    to_location:   { address: 'ул. Мира, 23, кв. 7' },
    price_final: 380, payment_method: 'cash',
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'feed-2', state: 'published', category: 'delivery',
    item_description: 'Доставить документы из офиса в нотариат на Пушкина',
    from_location: { address: 'БЦ Горизонт, пр. Ленина, 40' },
    to_location:   { address: 'Нотариус, ул. Пушкина, 12' },
    price_final: 550, payment_method: 'card',
    created_at: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'feed-3', state: 'published', category: 'food',
    item_description: 'Заказать и привезти суши из Якитории',
    from_location: { address: 'Якитория, ул. Цветочная, 8' },
    to_location:   { address: 'пр. Победы, 100, кв. 33' },
    price_final: 700, payment_method: 'cash',
    created_at: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'feed-4', state: 'published', category: 'cleaning',
    item_description: 'Генеральная уборка квартиры 3 комнаты + кухня',
    from_location: null,
    to_location:   { address: 'ул. Гагарина, 55, кв. 12' },
    price_final: 2500, payment_method: 'card',
    created_at: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'feed-5', state: 'published', category: 'errand',
    item_description: 'Забрать посылку из Почты России и привезти домой',
    from_location: { address: 'Почта России, ул. Советская, 1' },
    to_location:   { address: 'ул. Строителей, 78, кв. 4' },
    price_final: 420, payment_method: 'cash',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

const MOCK_MY_TASKS: any[] = [
  {
    id: 'my-1', state: 'in_progress', category: 'shopping',
    item_description: 'Купить продукты: молоко, хлеб, яйца в Пятёрочке',
    from_location: { address: 'Пятёрочка, ул. Ленина, 10' },
    to_location:   { address: 'пр. Победы, 45, кв. 12' },
    price_final: 450, payment_method: 'cash',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'my-2', state: 'accepted', category: 'delivery',
    item_description: 'Доставить посылку из СДЭК в офис',
    from_location: { address: 'СДЭК, ул. Садовая, 23' },
    to_location:   { address: 'БЦ Альфа, пр. Маркса, 1' },
    price_final: 600, payment_method: 'card',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'my-3', state: 'completed', category: 'cleaning',
    item_description: 'Клининг квартиры 2 комнаты',
    from_location: null,
    to_location:   { address: 'ул. Мира, 15, кв. 8' },
    price_final: 1800, payment_method: 'card',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'my-4', state: 'rated', category: 'food',
    item_description: 'Доставка пиццы из Додо',
    from_location: { address: 'Додо Пицца, ул. Центральная, 5' },
    to_location:   { address: 'пр. Мира, 88, кв. 201' },
    price_final: 650, payment_method: 'cash',
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];
// ──────────────────────────────────────────────────────────────────────────────

// ── OrderCard ─────────────────────────────────────────────────────────────────
function OrderCard({ task, isNew, onPress, onAccept, COLORS, styles, isDark }: {
  task: any;
  isNew: boolean;
  onPress: () => void;
  onAccept?: () => void;
  COLORS: AppColors;
  styles: ReturnType<typeof makeStyles>;
  isDark: boolean;
}) {
  const cat = CATEGORIES.find(c => c.key === task.category) ?? CATEGORIES[CATEGORIES.length - 1];
  const stateLabel = TASK_STATE_LABELS[task.state] ?? task.state;
  const stateColor = TASK_STATE_COLORS[task.state] ?? COLORS.textMuted;

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: cat.dark }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={[styles.iconChip, { backgroundColor: cat.dark + '22' }]}>
          <Ionicons name={cat.icon as any} size={16} color={cat.dark} />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle} numberOfLines={2}>{task.item_description ?? 'Задание'}</Text>
          <Text style={styles.cardSub}>
            {cat.label}{task.price_final ? ` · ${task.price_final} ₽` : ''}
          </Text>
        </View>
        {isNew && (
          <Text style={styles.cardPrice}>{task.price_final ?? task.price_suggested ?? '?'} ₽</Text>
        )}
      </View>

      <View style={styles.cardBottom}>
        {!isNew && (
          <View style={[styles.badge, { backgroundColor: stateColor + '20' }]}>
            <Text style={[styles.badgeText, { color: stateColor }]}>{stateLabel}</Text>
          </View>
        )}
        {task.to_location?.address && (
          <View style={styles.addrRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.textLight} />
            <Text style={styles.addrText} numberOfLines={1}>{task.to_location.address}</Text>
          </View>
        )}
        {isNew && onAccept && (
          <GradBtn label="Взять" onPress={onAccept} isDark={isDark} size="sm" style={styles.acceptBtnWrap} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function ExecutorOrdersScreen() {
  const [segment, setSegment] = useState<'new' | 'my'>('new');
  const [catFilter, setCatFilter] = useState<string>('all');
  const { feed, myTasks, isFeedLoading, isLoading, loadFeed, loadMyTasks, acceptTask, setActiveTask } = useTaskStore();
  const { token } = useAuthStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);
  const router = useRouter();

  const refresh = async () => {
    await Promise.all([loadFeed(55.7558, 37.6176), loadMyTasks()]);
  };

  useEffect(() => {
    refresh();
    // Real-time socket listeners — дублируем на случай если открыт этот экран
    const socket = getSocketInstance();
    if (!socket) return;
    socket.on('task_feed_new',     refresh);
    socket.on('task_feed_removed', refresh);
    socket.on('task_state_changed', refresh);
    return () => {
      socket.off('task_feed_new',     refresh);
      socket.off('task_feed_removed', refresh);
      socket.off('task_state_changed', refresh);
    };
  }, []);

  const activeFeed    = feed.length > 0    ? feed    : MOCK_FEED;
  const activeMyTasks = myTasks.length > 0 ? myTasks : MOCK_MY_TASKS;

  const displayData = segment === 'new'
    ? (catFilter === 'all' ? activeFeed    : activeFeed.filter(t => (t as any).category === catFilter))
    : (catFilter === 'all' ? activeMyTasks : activeMyTasks.filter(t => (t as any).category === catFilter));

  const CATS = [
    { key: 'all', label: 'Все', icon: 'apps-outline', dark: COLORS.textMuted },
    ...CATEGORIES,
  ] as const;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Задания</Text>
        </View>

        {/* Segment: Новые / Мои */}
        <View style={styles.segmentRow}>
          {(['new', 'my'] as const).map(seg => (
            <TouchableOpacity
              key={seg}
              style={[styles.segBtn, segment === seg && styles.segBtnActive]}
              onPress={() => setSegment(seg)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segText, segment === seg && styles.segTextActive]}>
                {seg === 'new'
                  ? `Новые (${activeFeed.length})`
                  : `Мои (${activeMyTasks.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={styles.catContent}
        >
          {CATS.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.catChip,
                catFilter === cat.key && { backgroundColor: COLORS.executor + '22', borderColor: COLORS.executor },
              ]}
              onPress={() => setCatFilter(cat.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={cat.icon as any}
                size={13}
                color={catFilter === cat.key ? COLORS.executor : COLORS.textMuted}
              />
              <Text style={[styles.catLabel, catFilter === cat.key && { color: COLORS.executor, fontWeight: '700' }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List */}
        <FlatList
          data={displayData as any[]}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <OrderCard
              task={item}
              isNew={segment === 'new'}
              onPress={() => {
                setActiveTask(item);
                router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } });
              }}
              onAccept={segment === 'new' ? async () => {
                setActiveTask(item);
                try { await acceptTask(item.id); } catch {}
                router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } });
              } : undefined}
              COLORS={COLORS}
              styles={styles}
              isDark={isDark}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFeedLoading || isLoading}
              onRefresh={refresh}
              tintColor={COLORS.executor}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {segment === 'new' ? 'Нет доступных заданий' : 'Нет активных заданий'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    },
    title: { flex: 1, fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.6 },

    // Segment
    segmentRow: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: C.bgLayer,
      borderRadius: RADIUS.xl,
      padding: 4,
      gap: 4,
      ...(isDark ? SHADOW.sm : NEO.card),
    },
    segBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: RADIUS.lg,
    },
    segBtnActive: {
      backgroundColor: C.executor,
      ...(isDark ? SHADOW.sm : NEO.btn),
    },
    segText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
    segTextActive: { color: '#fff', fontWeight: '700' },

    // Category scroll
    catScroll:   { flexGrow: 0, marginBottom: 10 },
    catContent:  { paddingHorizontal: 20, gap: 8 },
    catChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: RADIUS.full,
      borderWidth: 1.5, borderColor: C.border,
      backgroundColor: C.bgLayer,
    },
    catLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted },

    // List
    list: { paddingHorizontal: 20, paddingBottom: 120 },

    // Card
    card: {
      backgroundColor: C.bgLayer,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: 'transparent',
      marginBottom: 10,
      padding: 14,
      gap: 8,
      ...(isDark ? SHADOW.sm : {
        shadowColor: '#9BA3BC',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.40,
        shadowRadius: 10,
        elevation: 8,
      }),
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    iconChip: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    cardMeta:  { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
    cardSub:   { fontSize: 12, color: C.textMuted },
    cardPrice: { fontSize: 16, fontWeight: '800', color: C.text },

    cardBottom: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    badge:      { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText:  { fontSize: 11, fontWeight: '600' },

    addrRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    addrText: { fontSize: 11, color: C.textLight, flex: 1 },

    acceptBtnWrap: { borderRadius: RADIUS.md, marginLeft: 'auto' },

    // Empty
    empty:     { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.text, marginTop: 12 },
  });
}
