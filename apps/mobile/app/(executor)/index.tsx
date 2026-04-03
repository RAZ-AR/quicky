import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useTaskStore } from '../../src/stores/taskStore';
import { useAuthStore } from '../../src/stores/authStore';
import { getSocket } from '../../src/services/socket';
import { RADIUS, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import type { Task } from '../../src/services/api';

// ── Countdown timer ────────────────────────────────────────────────────────────
function Countdown({ expiresAt, styles, COLORS }: { expiresAt: string; styles: any; COLORS: AppColors }) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ref.current = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const isHot = secs < 300;
  return (
    <View style={[styles.countdown, isHot && { backgroundColor: COLORS.dangerGlow }]}>
      <Text style={[styles.countdownText, isHot && { color: COLORS.danger }]}>
        {m}:{String(s).padStart(2, '0')}
      </Text>
    </View>
  );
}

// ── Stat pill ──────────────────────────────────────────────────────────────────
function StatPill({ value, label, color, styles }: {
  value: string | number; label: string; color: string; styles: any;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ExecutorDashboard() {
  const router = useRouter();
  const { feed, isFeedLoading, loadFeed, myTasks, loadMyTasks } = useTaskStore();
  const { user, token } = useAuthStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  const fetchAll = async () => {
    loadMyTasks();
    let lat = 44.8176, lng = 20.4569;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude; lng = loc.coords.longitude;
      }
    } catch {}
    await loadFeed(lat, lng);
  };

  useEffect(() => {
    fetchAll();
    if (token) {
      const socket = getSocket(token);
      socket.on('task_feed_new', fetchAll);
      socket.on('task_feed_removed', fetchAll);
      return () => { socket.off('task_feed_new', fetchAll); socket.off('task_feed_removed', fetchAll); };
    }
  }, [token]);

  const activeTask = myTasks.find(t => ['accepted', 'in_progress', 'pending_client'].includes(t.state));
  const hotOrders  = feed.filter(t => t.expires_at && new Date(t.expires_at).getTime() - Date.now() < 600_000).slice(0, 3);
  const newOrders  = feed.filter(t => !hotOrders.includes(t)).slice(0, 6);
  const completed  = myTasks.filter(t => t.state === 'completed' || t.state === 'rated').length;

  const greetHour = new Date().getHours();
  const greeting  = greetHour < 12 ? 'Доброе утро' : greetHour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFeedLoading} onRefresh={fetchAll} tintColor={COLORS.executor} />}
        >
          {/* ── Header ─────────────────────────── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name}>{user?.name ?? 'Исполнитель'}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/(executor)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </TouchableOpacity>
          </View>

          {/* ── Stats row ──────────────────────── */}
          <View style={styles.statsRow}>
            <StatPill value={feed.length}  label="Новых"     color={COLORS.executor} styles={styles} />
            <StatPill value={completed}    label="Выполнено" color={COLORS.success}  styles={styles} />
            <StatPill value={hotOrders.length} label="Горящих" color={COLORS.danger} styles={styles} />
          </View>

          {/* ── Active task ─────────────────────── */}
          {activeTask && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Текущий заказ</Text>
              <TouchableOpacity
                style={styles.activeCard}
                onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: activeTask.id } })}
                activeOpacity={0.85}
              >
                <View style={styles.activeHeader}>
                  <Text style={styles.activeTitle} numberOfLines={2}>{activeTask.item_description ?? 'Заказ'}</Text>
                  <View style={[styles.badge, { backgroundColor: TASK_STATE_COLORS[activeTask.state] + '20' }]}>
                    <Text style={[styles.badgeText, { color: TASK_STATE_COLORS[activeTask.state] }]}>
                      {TASK_STATE_LABELS[activeTask.state]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.activeAddr}>📍 {activeTask.to_location?.address ?? '—'}</Text>
                <View style={styles.activeFooter}>
                  <Text style={styles.activePrice}>{activeTask.price_final} ₽</Text>
                  <Text style={styles.activeAction}>Открыть →</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Hot orders ──────────────────────── */}
          {hotOrders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Горящие</Text>
                <View style={styles.hotPill}>
                  <Text style={styles.hotPillText}>🔥 горит</Text>
                </View>
              </View>
              {hotOrders.map(task => (
                <OrderCard
                  key={task.id} task={task} hot
                  styles={styles} COLORS={COLORS}
                  onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: task.id } })}
                />
              ))}
            </View>
          )}

          {/* ── New orders ──────────────────────── */}
          {newOrders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Новые заказы</Text>
                <TouchableOpacity onPress={() => router.push('/(executor)/orders')}>
                  <Text style={styles.seeAll}>Все →</Text>
                </TouchableOpacity>
              </View>
              {newOrders.map(task => (
                <OrderCard
                  key={task.id} task={task}
                  styles={styles} COLORS={COLORS}
                  onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: task.id } })}
                />
              ))}
            </View>
          )}

          {isFeedLoading && feed.length === 0 && (
            <ActivityIndicator size="large" color={COLORS.executor} style={{ marginTop: 60 }} />
          )}
          {!isFeedLoading && feed.length === 0 && !activeTask && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>Заказов пока нет</Text>
              <Text style={styles.emptyHint}>Потяните вниз для обновления</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Order card ─────────────────────────────────────────────────────────────────
function OrderCard({ task, hot, onPress, styles, COLORS }: {
  task: Task; hot?: boolean; onPress: () => void; styles: any; COLORS: AppColors;
}) {
  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.orderAccent, { backgroundColor: hot ? COLORS.danger : COLORS.executor }]} />
      <View style={styles.orderContent}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.orderTitle} numberOfLines={2}>{task.item_description ?? 'Заказ'}</Text>
          <Text style={styles.orderAddr} numberOfLines={1}>
            {task.to_location?.address ? `📍 ${task.to_location.address}` : '—'}
          </Text>
          {task.category && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{task.category}</Text>
            </View>
          )}
        </View>
        <View style={styles.orderRight}>
          <Text style={[styles.orderPrice, { color: hot ? COLORS.danger : COLORS.executor }]}>
            {task.price_final} ₽
          </Text>
          {hot && task.expires_at && <Countdown expiresAt={task.expires_at} styles={styles} COLORS={COLORS} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting: { fontSize: 13, color: C.textMuted, fontWeight: '500', marginBottom: 2 },
    name: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.8 },
    avatarBtn: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: C.glassCyan,
      borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: C.text, fontWeight: '700', fontSize: 17 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
    statPill: {
      flex: 1, borderRadius: R.full,
      backgroundColor: C.bgLayer,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    },
    statValue: { fontSize: 16, fontWeight: '800' },
    statLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600' },

    // Sections
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 12 },
    seeAll: { fontSize: 14, color: C.executor, fontWeight: '600' },
    hotPill: {
      backgroundColor: C.dangerGlow,
      borderRadius: R.full,
      paddingHorizontal: 10, paddingVertical: 3,
      borderWidth: 1, borderColor: C.danger + '25',
    },
    hotPillText: { color: C.danger, fontSize: 11, fontWeight: '700' },

    // Active task card — sage green
    activeCard: {
      borderRadius: R.xxl,
      backgroundColor: C.glassCyan,
      borderWidth: 1, borderColor: C.border,
      padding: 20,
    },
    activeHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    activeTitle:  { flex: 1, fontSize: 17, fontWeight: '700', color: C.text, marginRight: 8 },
    activeAddr:   { fontSize: 13, color: C.textMuted, marginBottom: 16 },
    activeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    activePrice:  { fontSize: 28, fontWeight: '800', color: C.text },
    activeAction: { fontSize: 14, color: C.executor, fontWeight: '600' },
    badge: { borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: '600' },

    // Order cards
    orderCard: {
      borderRadius: R.xl, marginBottom: 10, minHeight: 72,
      backgroundColor: C.glass,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', overflow: 'hidden',
    },
    orderAccent: { width: 4, borderTopLeftRadius: R.xl, borderBottomLeftRadius: R.xl },
    orderContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 },
    orderTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 },
    orderAddr:  { fontSize: 12, color: C.textMuted, marginBottom: 6 },
    orderRight: { alignItems: 'flex-end', paddingLeft: 8 },
    orderPrice: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    categoryPill: {
      alignSelf: 'flex-start',
      backgroundColor: C.glassCyan,
      borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 2,
    },
    categoryText: { fontSize: 11, color: C.executor, fontWeight: '600' },

    // Countdown
    countdown: {
      backgroundColor: C.bgLayer,
      borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 3,
    },
    countdownText: { fontSize: 12, fontWeight: '700', color: C.textMuted },

    // Empty
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 8 },
    emptyHint: { fontSize: 14, color: C.textMuted },
  });
}
