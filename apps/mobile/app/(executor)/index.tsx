import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { getSocket, getSocketInstance } from '../../src/services/socket';
import {
  RADIUS, SHADOW, CATEGORIES, TASK_STATE_LABELS,
  type AppColors,
} from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_FEED: any[] = [
  {
    id: 'feed-1', state: 'published', category: 'shopping',
    item_description: 'Купить продукты: хлеб, молоко, творог, яйца в Дикси',
    from_location: { address: 'Дикси, ул. Садовая, 15' },
    to_location:   { address: 'ул. Мира, 23, кв. 7' },
    price_final: 380, created_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'feed-2', state: 'published', category: 'delivery',
    item_description: 'Доставить документы из офиса в нотариат на Пушкина',
    from_location: { address: 'БЦ Горизонт, пр. Ленина, 40' },
    to_location:   { address: 'Нотариус, ул. Пушкина, 12' },
    price_final: 550, created_at: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'feed-3', state: 'published', category: 'food',
    item_description: 'Заказать и привезти суши из Якитории',
    from_location: { address: 'Якитория, ул. Цветочная, 8' },
    to_location:   { address: 'пр. Победы, 100, кв. 33' },
    price_final: 700, created_at: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'feed-4', state: 'published', category: 'cleaning',
    item_description: 'Генеральная уборка квартиры 3 комнаты + кухня',
    to_location:   { address: 'ул. Гагарина, 55, кв. 12' },
    price_final: 2500, created_at: new Date(Date.now() - 900000).toISOString(),
  },
];

const MOCK_MY_TASKS: any[] = [
  {
    id: 'my-1', state: 'in_progress', category: 'shopping',
    item_description: 'Купить продукты: молоко, хлеб, яйца в Пятёрочке',
    to_location:   { address: 'пр. Победы, 45, кв. 12' },
    price_final: 450, created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'my-2', state: 'completed', category: 'delivery',
    item_description: 'Доставить посылку из СДЭК в офис',
    to_location:   { address: 'БЦ Альфа, пр. Маркса, 1' },
    price_final: 600, created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'my-3', state: 'rated', category: 'cleaning',
    item_description: 'Клининг квартиры 2 комнаты',
    to_location:   { address: 'ул. Мира, 15, кв. 8' },
    price_final: 1800, created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

function getStepIndex(state: string): number {
  const map: Record<string, number> = {
    draft: 0, pending_confirm: 0, published: 0,
    accepted: 1, in_progress: 2, pending_client: 3,
    completed: 4, rated: 4,
  };
  return map[state] ?? 0;
}

// ── Tracker pill (reuse from client style) ─────────────────────────────────────
function Tracker({ state }: { state: string }) {
  const idx   = getStepIndex(state);
  const STEPS = 5;
  return (
    <View style={tr.pill}>
      {Array.from({ length: STEPS }).map((_, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <View style={[tr.line, { backgroundColor: i <= idx ? '#D6F24A' : 'rgba(255,255,255,0.12)' }]} />
          )}
          <View style={[tr.dot, i <= idx ? tr.dotFill : tr.dotEmpty]} />
        </React.Fragment>
      ))}
    </View>
  );
}

const tr = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0E0E10', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 10,
    marginVertical: 12,
  },
  line:     { flex: 1, height: 3, borderRadius: 2 },
  dot:      { width: 20, height: 20, borderRadius: 10 },
  dotFill:  { backgroundColor: '#D6F24A' },
  dotEmpty: { backgroundColor: 'rgba(255,255,255,0.15)' },
});

// ── Feed card ──────────────────────────────────────────────────────────────────
function FeedCard({ task, onPress, onAccept, styles }: {
  task: any; onPress: () => void; onAccept: () => void; styles: ReturnType<typeof makeStyles>;
}) {
  const cat = CATEGORIES.find(c => c.key === task.category) ?? CATEGORIES[CATEGORIES.length - 1];
  return (
    <TouchableOpacity
      style={[styles.feedCard, { borderLeftColor: cat.color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.feedRow}>
        <View style={[styles.catIcon, { backgroundColor: cat.color }]}>
          <Ionicons name={cat.icon as any} size={16} color={cat.textColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedTitle} numberOfLines={2}>{task.item_description ?? 'Задание'}</Text>
          <Text style={styles.feedMeta}>
            {cat.label}
            {task.to_location?.address ? ` · ${task.to_location.address}` : ''}
          </Text>
        </View>
        <Text style={styles.feedPrice}>{task.price_final ?? task.price_suggested ?? '?'} ₽</Text>
      </View>
      <TouchableOpacity style={styles.takeBtn} onPress={onAccept} activeOpacity={0.8}>
        <Text style={styles.takeBtnTxt}>Взять →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ExecutorHomeScreen() {
  const router = useRouter();
  const { feed, myTasks, isFeedLoading, loadFeed, loadMyTasks, acceptTask, setActiveTask } = useTaskStore();
  const { user, token } = useAuthStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    loadMyTasks();
    await loadFeed(55.7558, 37.6176);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll().catch(() => {});
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAll();
    const socket = token ? getSocket(token) : getSocketInstance();
    if (!socket) return;
    socket.on('task_feed_new',     fetchAll);
    socket.on('task_feed_removed', fetchAll);
    socket.on('task_state_changed', fetchAll);
    return () => {
      socket.off('task_feed_new',     fetchAll);
      socket.off('task_feed_removed', fetchAll);
      socket.off('task_state_changed', fetchAll);
    };
  }, [token]);

  const displayFeed    = feed.length > 0    ? feed    : MOCK_FEED;
  const displayMyTasks = myTasks.length > 0 ? myTasks : MOCK_MY_TASKS;

  const activeTask = displayMyTasks.find((t: any) =>
    ['accepted', 'in_progress', 'pending_client'].includes(t.state));
  const completedCount = displayMyTasks.filter((t: any) =>
    ['completed', 'rated'].includes(t.state)).length;
  const totalEarned = displayMyTasks
    .filter((t: any) => ['completed', 'rated'].includes(t.state))
    .reduce((sum: number, t: any) => sum + (Number(t.price_final) || 0), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Доброе утро,' : hour < 18 ? 'Добрый день,' : 'Добрый вечер,';
  const firstName = (user?.name ?? 'Исполнитель').split(' ')[0];

  const handleAccept = async (taskId: string) => {
    const taskObj = displayFeed.find((t: any) => t.id === taskId);
    if (taskObj) setActiveTask(taskObj);
    try { await acceptTask(taskId); } catch {}
    router.push({ pathname: '/(executor)/task/[id]', params: { id: taskId } });
  };

  const activeTaskCat = activeTask
    ? CATEGORIES.find(c => c.key === (activeTask as any).category) ?? CATEGORIES[CATEGORIES.length - 1]
    : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name}>{firstName}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/(executor)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarTxt}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Stats ── */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: '#0E8B4A' }]}>{displayFeed.length}</Text>
              <Text style={styles.statLbl}>НОВЫХ</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: '#0E8B4A' }]}>{completedCount}</Text>
              <Text style={styles.statLbl}>СДЕЛАНО</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statCell}>
              <Text style={[styles.statVal, { color: COLORS.text }]}>
                {totalEarned > 0 ? `${totalEarned.toLocaleString('ru')}₽` : '—'}
              </Text>
              <Text style={styles.statLbl}>ЗАРАБОТАНО</Text>
            </View>
          </View>

          {/* ── Active task ── */}
          {activeTask && activeTaskCat ? (
            <TouchableOpacity
              style={[styles.activeCard, { backgroundColor: activeTaskCat.color }]}
              onPress={() => {
                setActiveTask(activeTask);
                router.push({ pathname: '/(executor)/task/[id]', params: { id: activeTask.id } });
              }}
              activeOpacity={0.85}
            >
              <View style={styles.activeTop}>
                <View style={[styles.activePill, { backgroundColor: `${activeTaskCat.textColor}18` }]}>
                  <Ionicons name={activeTaskCat.icon as any} size={11} color={activeTaskCat.textColor} />
                  <Text style={[styles.activePillTxt, { color: activeTaskCat.textColor }]}>
                    В РАБОТЕ
                  </Text>
                </View>
                <View style={[styles.activePill, { backgroundColor: `${activeTaskCat.textColor}18` }]}>
                  <View style={[styles.activeDot, { backgroundColor: activeTaskCat.textColor }]} />
                  <Text style={[styles.activePillTxt, { color: activeTaskCat.textColor }]}>
                    {TASK_STATE_LABELS[(activeTask as any).state] ?? 'В работе'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.activeTitle, { color: activeTaskCat.textColor }]} numberOfLines={2}>
                {(activeTask as any).item_description ?? 'Задание'}
              </Text>

              {(activeTask as any).to_location?.address ? (
                <View style={styles.addrRow}>
                  <Ionicons name="location-outline" size={12} color={`${activeTaskCat.textColor}80`} />
                  <Text style={[styles.addrTxt, { color: `${activeTaskCat.textColor}80` }]} numberOfLines={1}>
                    {(activeTask as any).to_location.address}
                  </Text>
                </View>
              ) : null}

              <Tracker state={(activeTask as any).state} />

              <View style={styles.activeFooter}>
                <Text style={[styles.activePrice, { color: activeTaskCat.textColor }]}>
                  {(activeTask as any).price_final} ₽
                </Text>
                <Text style={[styles.activeLink, { color: activeTaskCat.textColor }]}>Детали →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noActive}>
              <Ionicons name="flash-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.noActiveTxt}>Нет активных заданий</Text>
              <Text style={styles.noActiveSub}>Возьмите задание из ленты</Text>
            </View>
          )}

          {/* ── Feed ── */}
          <View style={styles.secHeader}>
            <Text style={styles.secTitle}>Новые задания</Text>
            <TouchableOpacity onPress={() => router.push('/(executor)/orders')}>
              <Text style={styles.seeAll}>Все →</Text>
            </TouchableOpacity>
          </View>

          {displayFeed.slice(0, 5).map((task: any) => (
            <FeedCard
              key={task.id}
              task={task}
              onPress={() => {
                setActiveTask(task);
                router.push({ pathname: '/(executor)/task/[id]', params: { id: task.id } });
              }}
              onAccept={() => handleAccept(task.id)}
              styles={styles}
            />
          ))}

          {displayFeed.length === 0 && (
            <View style={styles.emptyFeed}>
              <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTxt}>Заданий рядом нет</Text>
              <Text style={styles.emptySub}>Потяните вниз чтобы обновить</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, isDark: boolean) {
  const card = {
    shadowColor: '#14141A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.06, shadowRadius: 16, elevation: 4,
  };
  return StyleSheet.create({
    root:  { flex: 1, backgroundColor: C.bg },
    safe:  { flex: 1 },
    scroll:{ paddingHorizontal: 20, paddingTop: 8 },

    // Header
    header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting:  { fontSize: 13, color: C.textMuted, fontWeight: '500', marginBottom: 2 },
    name:      { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.8 },
    avatarBtn: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: '#0E0E10',
      alignItems: 'center', justifyContent: 'center',
      ...SHADOW.md,
    },
    avatarTxt: { color: '#D6F24A', fontWeight: '800', fontSize: 17 },

    // Stats
    statsRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgLayer, borderRadius: RADIUS.xl,
      paddingVertical: 18, paddingHorizontal: 20, marginBottom: 24,
      ...card,
    },
    statCell:  { flex: 1, alignItems: 'center' },
    statDiv:   { width: 1, height: 36, backgroundColor: C.divider },
    statVal:   { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    statLbl:   { fontSize: 9, color: C.textMuted, fontWeight: '700', letterSpacing: 0.5 },

    // Active task card
    activeCard: {
      borderRadius: 22, padding: 18,
      marginBottom: 24,
      shadowColor: '#14141A', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10, shadowRadius: 20, elevation: 8,
    },
    activeTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    activePill:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    activePillTxt:{ fontSize: 11, fontWeight: '700' },
    activeDot:    { width: 6, height: 6, borderRadius: 3 },
    activeTitle:  { fontSize: 18, fontWeight: '800', lineHeight: 24, letterSpacing: -0.3, marginBottom: 6 },
    addrRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addrTxt:      { fontSize: 13, flex: 1 },
    activeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    activePrice:  { fontSize: 24, fontWeight: '800' },
    activeLink:   { fontSize: 13, fontWeight: '600' },

    // No active
    noActive: {
      backgroundColor: C.bgLayer, borderRadius: RADIUS.xl,
      padding: 24, marginBottom: 24, alignItems: 'center', gap: 6,
      ...card,
    },
    noActiveTxt: { fontSize: 15, fontWeight: '700', color: C.text },
    noActiveSub: { fontSize: 13, color: C.textMuted },

    // Section header
    secHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    secTitle:  { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    seeAll:    { fontSize: 14, color: '#0E8B4A', fontWeight: '600' },

    // Feed card
    feedCard: {
      backgroundColor: C.bgLayer, borderRadius: 16,
      borderLeftWidth: 4, borderLeftColor: 'transparent',
      marginBottom: 10, padding: 14, gap: 10,
      ...card,
    },
    feedRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    catIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    feedTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
    feedMeta:  { fontSize: 12, color: C.textMuted },
    feedPrice: { fontSize: 16, fontWeight: '800', color: C.text, marginLeft: 8 },
    takeBtn:   { backgroundColor: '#0E0E10', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start' },
    takeBtnTxt:{ color: '#D6F24A', fontWeight: '700', fontSize: 13 },

    // Empty
    emptyFeed: { alignItems: 'center', paddingTop: 48 },
    emptyTxt:  { fontSize: 16, fontWeight: '600', color: C.text, marginTop: 12, marginBottom: 4 },
    emptySub:  { fontSize: 13, color: C.textMuted },
  });
}
