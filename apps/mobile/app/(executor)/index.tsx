import { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useTaskStore } from '../../src/stores/taskStore';
import { useAuthStore } from '../../src/stores/authStore';
import { getSocket } from '../../src/services/socket';
import { COLORS, SHADOW, TASK_STATE_COLORS, TASK_STATE_LABELS } from '../../src/constants/config';
import type { Task } from '../../src/services/api';

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [secs, setSecs] = useState(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });
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
      <Text style={[styles.countdownText, isHot && styles.countdownTextHot]}>
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
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
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
  const hotOrders = feed.filter(t => t.expires_at && new Date(t.expires_at).getTime() - Date.now() < 600_000).slice(0, 3);
  const newOrders = feed.filter(t => !hotOrders.includes(t)).slice(0, 5);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Доброе утро' : greetHour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFeedLoading} onRefresh={fetchAll} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{user?.name ?? 'Исполнитель'}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
            <Text style={styles.statValue}>{feed.length}</Text>
            <Text style={styles.statLabel}>Новых заказов</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.successLight }]}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{myTasks.filter(t => t.state === 'completed').length}</Text>
            <Text style={styles.statLabel}>Выполнено</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.hotLight }]}>
            <Text style={[styles.statValue, { color: COLORS.hot }]}>{hotOrders.length}</Text>
            <Text style={styles.statLabel}>Горящих</Text>
          </View>
        </View>

        {/* Active order */}
        {activeTask && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Текущий заказ</Text>
            <TouchableOpacity
              style={[styles.activeCard, { ...SHADOW.md }]}
              onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: activeTask.id } })}
            >
              <View style={styles.activeCardHeader}>
                <Text style={styles.activeCardTitle} numberOfLines={2}>{activeTask.item_description ?? 'Заказ'}</Text>
                <View style={[styles.badge, { backgroundColor: TASK_STATE_COLORS[activeTask.state] + '20' }]}>
                  <Text style={[styles.badgeText, { color: TASK_STATE_COLORS[activeTask.state] }]}>
                    {TASK_STATE_LABELS[activeTask.state]}
                  </Text>
                </View>
              </View>
              <Text style={styles.activeCardAddr}>📍 {activeTask.to_location?.address ?? '—'}</Text>
              <View style={styles.activeCardFooter}>
                <Text style={styles.activeCardPrice}>{activeTask.price_final} ₽</Text>
                <Text style={styles.activeCardAction}>Открыть →</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Hot orders */}
        {hotOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Горящие заказы</Text>
              <View style={styles.hotBadge}><Text style={styles.hotBadgeText}>горит</Text></View>
            </View>
            {hotOrders.map(task => (
              <TouchableOpacity
                key={task.id}
                style={[styles.orderCard, { ...SHADOW.sm }, styles.hotCard]}
                onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: task.id } })}
              >
                <View style={styles.orderCardLeft}>
                  <Text style={styles.orderCardTitle} numberOfLines={2}>{task.item_description ?? 'Заказ'}</Text>
                  <Text style={styles.orderCardAddr} numberOfLines={1}>📍 {task.to_location?.address ?? '—'}</Text>
                </View>
                <View style={styles.orderCardRight}>
                  <Text style={styles.orderCardPrice}>{task.price_final} ₽</Text>
                  {task.expires_at && <Countdown expiresAt={task.expires_at} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* New orders */}
        {newOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Новые заказы</Text>
              <TouchableOpacity onPress={() => router.push('/(executor)/orders')}>
                <Text style={styles.seeAll}>Все →</Text>
              </TouchableOpacity>
            </View>
            {newOrders.map(task => (
              <TouchableOpacity
                key={task.id}
                style={[styles.orderCard, { ...SHADOW.sm }]}
                onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: task.id } })}
              >
                <View style={styles.orderCardLeft}>
                  <Text style={styles.orderCardTitle} numberOfLines={2}>{task.item_description ?? 'Заказ'}</Text>
                  <Text style={styles.orderCardAddr} numberOfLines={1}>📍 {task.to_location?.address ?? '—'}</Text>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{task.category ?? '—'}</Text>
                  </View>
                </View>
                <Text style={styles.orderCardPrice}>{task.price_final} ₽</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isFeedLoading && feed.length === 0 && (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 48 }} />
        )}
        {!isFeedLoading && feed.length === 0 && !activeTask && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Заказов пока нет</Text>
            <Text style={styles.emptyHint}>Потяните вниз для обновления</Text>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary, marginBottom: 2 },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text },
  seeAll: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  hotBadge: { backgroundColor: COLORS.hot, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  hotBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  activeCard: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 20 },
  activeCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  activeCardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff', marginRight: 8 },
  activeCardAddr: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 14 },
  activeCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeCardPrice: { fontSize: 22, fontWeight: '800', color: '#fff' },
  activeCardAction: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  orderCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  hotCard: { borderLeftWidth: 3, borderLeftColor: COLORS.hot },
  orderCardLeft: { flex: 1, marginRight: 12 },
  orderCardRight: { alignItems: 'flex-end' },
  orderCardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  orderCardAddr: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  orderCardPrice: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  categoryPill: { alignSelf: 'flex-start', backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  categoryText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  countdown: { marginTop: 4, backgroundColor: COLORS.hotLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  countdownHot: { backgroundColor: COLORS.hot },
  countdownText: { fontSize: 13, fontWeight: '700', color: COLORS.hot },
  countdownTextHot: { color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: COLORS.textMuted },
});
