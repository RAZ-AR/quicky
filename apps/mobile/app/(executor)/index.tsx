import { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { useTaskStore } from '../../src/stores/taskStore';
import { useAuthStore } from '../../src/stores/authStore';
import { getSocket } from '../../src/services/socket';
import { COLORS, RADIUS, GRADIENTS, SHADOW, TASK_STATE_COLORS, TASK_STATE_LABELS } from '../../src/constants/config';
import type { Task } from '../../src/services/api';

// ── Countdown timer ────────────────────────────────────────────────────────────
function Countdown({ expiresAt }: { expiresAt: string }) {
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
    <View style={[styles.countdown, isHot && styles.countdownHot]}>
      <Text style={[styles.countdownText, isHot && { color: '#fff' }]}>
        {m}:{String(s).padStart(2, '0')}
      </Text>
    </View>
  );
}

export default function ExecutorDashboard() {
  const router = useRouter();
  const { feed, isFeedLoading, loadFeed, myTasks, loadMyTasks } = useTaskStore();
  const { user, token } = useAuthStore();

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
  const newOrders  = feed.filter(t => !hotOrders.includes(t)).slice(0, 5);
  const completed  = myTasks.filter(t => t.state === 'completed' || t.state === 'rated').length;

  const greetHour = new Date().getHours();
  const greeting  = greetHour < 12 ? 'Доброе утро' : greetHour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />
      <View style={styles.glowRight} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFeedLoading} onRefresh={fetchAll} tintColor={COLORS.executor} />}
        >
          {/* ── Header ─────────────────────────── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting} 🚀</Text>
              <Text style={styles.name}>{user?.name ?? 'Исполнитель'}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(executor)/profile')}>
              <View style={styles.avatarWrap}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.avatarOverlay} />
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Stats bento ────────────────────── */}
          <View style={styles.statsRow}>
            <StatCard value={feed.length}  label="Новых"    color={COLORS.executor}  glow={COLORS.executorGlow} />
            <StatCard value={completed}    label="Выполнено" color={COLORS.success}   glow={COLORS.successGlow} />
            <StatCard value={hotOrders.length} label="Горящих" color={COLORS.danger}  glow={COLORS.dangerGlow} />
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
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['rgba(6,182,212,0.35)', 'rgba(139,92,246,0.20)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.activeBorder} />
                <View style={{ position: 'relative', padding: 20 }}>
                  <View style={styles.activeHeader}>
                    <Text style={styles.activeTitle} numberOfLines={2}>{activeTask.item_description ?? 'Заказ'}</Text>
                    <View style={[styles.badge, { backgroundColor: TASK_STATE_COLORS[activeTask.state] + '30' }]}>
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
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Hot orders ──────────────────────── */}
          {hotOrders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Горящие</Text>
                <View style={styles.hotPill}>
                  <Text style={styles.hotPillText}>🔥 горит</Text>
                </View>
              </View>
              {hotOrders.map(task => (
                <OrderCard
                  key={task.id} task={task} hot
                  onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: task.id } })}
                />
              ))}
            </View>
          )}

          {/* ── New orders ──────────────────────── */}
          {newOrders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Новые заказы</Text>
                <TouchableOpacity onPress={() => router.push('/(executor)/orders')}>
                  <Text style={styles.seeAll}>Все →</Text>
                </TouchableOpacity>
              </View>
              {newOrders.map(task => (
                <OrderCard
                  key={task.id} task={task}
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

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ value, label, color, glow }: { value: number; label: string; color: string; glow: string }) {
  return (
    <View style={styles.statCard}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.statOverlay, { backgroundColor: glow }]} />
      <View style={styles.statBorder} />
      <View style={{ position: 'relative', alignItems: 'center' }}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ── Order card ─────────────────────────────────────────────────────────────────
function OrderCard({ task, hot, onPress }: { task: Task; hot?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.8}>
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.orderBg} />
      {hot && <View style={[styles.orderAccent, { backgroundColor: COLORS.danger }]} />}
      {!hot && <View style={[styles.orderAccent, { backgroundColor: COLORS.executor }]} />}
      <View style={{ position: 'relative', flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.orderTitle} numberOfLines={2}>{task.item_description ?? 'Заказ'}</Text>
          <Text style={styles.orderAddr} numberOfLines={1}>📍 {task.to_location?.address ?? '—'}</Text>
          {task.category && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{task.category}</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.orderPrice, { color: hot ? COLORS.danger : COLORS.executor }]}>
            {task.price_final} ₽
          </Text>
          {hot && task.expires_at && <Countdown expiresAt={task.expires_at} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: COLORS.bg },
  safe:  { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  glowTop: {
    position: 'absolute', top: -100, right: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(6,182,212,0.15)',
  },
  glowRight: {
    position: 'absolute', bottom: 200, left: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(139,92,246,0.10)',
  },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginBottom: 24 },
  greeting:     { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  name:         { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  avatarWrap:   { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glassCyan, borderRadius: 22, borderWidth: 1, borderColor: COLORS.glassBorder },
  avatarText:   { color: COLORS.text, fontWeight: '700', fontSize: 16, position: 'relative' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', paddingVertical: 16 },
  statOverlay:  { ...StyleSheet.absoluteFillObject },
  statBorder:   { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder },
  statValue:    { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel:    { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase' },

  section:     { marginBottom: 24 },
  sectionRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle:{ flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  seeAll:      { fontSize: 14, color: COLORS.executor, fontWeight: '600' },

  hotPill:     { backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.danger + '40' },
  hotPillText: { color: COLORS.danger, fontSize: 12, fontWeight: '700' },

  activeCard:   { borderRadius: RADIUS.xxl, overflow: 'hidden' },
  activeBorder: { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: COLORS.glassBorder },
  activeHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  activeTitle:  { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  activeAddr:   { fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },
  activeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activePrice:  { fontSize: 26, fontWeight: '800', color: COLORS.text },
  activeAction: { fontSize: 14, color: COLORS.executor, fontWeight: '600' },

  badge:        { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText:    { fontSize: 11, fontWeight: '600' },

  orderCard:    { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 10 },
  orderBg:      { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  orderAccent:  { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
  orderTitle:   { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  orderAddr:    { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  orderPrice:   { fontSize: 18, fontWeight: '800', marginBottom: 4 },

  categoryPill: { alignSelf: 'flex-start', backgroundColor: COLORS.glassCyan, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  categoryText: { fontSize: 11, color: COLORS.executorLight, fontWeight: '600' },

  countdown:    { backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  countdownHot: { backgroundColor: COLORS.danger },
  countdownText:{ fontSize: 12, fontWeight: '700', color: COLORS.danger },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: COLORS.textMuted },
});
