import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useTaskStore } from '../../src/stores/taskStore';
import { useAuthStore } from '../../src/stores/authStore';
import { getSocket } from '../../src/services/socket';
import { RADIUS, CATEGORIES, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import type { Task } from '../../src/services/api';

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
  const newOrders  = feed.filter(t => !hotOrders.includes(t)).slice(0, 8);
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
          {/* Header */}
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

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: COLORS.glassCyan }]}>
              <Text style={[styles.statValue, { color: isDark ? COLORS.text : '#0E3A34' }]}>{feed.length}</Text>
              <Text style={[styles.statLabel, { color: isDark ? COLORS.textMuted : '#0E3A3499' }]}>Новых</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: COLORS.glassViolet }]}>
              <Text style={[styles.statValue, { color: isDark ? COLORS.text : '#4A3808' }]}>{completed}</Text>
              <Text style={[styles.statLabel, { color: isDark ? COLORS.textMuted : '#4A380899' }]}>Сделано</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border }]}>
              <Text style={[styles.statValue, { color: COLORS.danger }]}>{hotOrders.length}</Text>
              <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>Горящих</Text>
            </View>
          </View>

          {/* Active task */}
          {activeTask && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Текущий заказ</Text>
              <TouchableOpacity
                style={styles.activeCard}
                onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: activeTask.id } })}
                activeOpacity={0.85}
              >
                <View style={styles.activeTop}>
                  <Text style={styles.activeCat}>В РАБОТЕ</Text>
                  <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.12)' }]}>
                    <Text style={styles.badgeText}>{TASK_STATE_LABELS[activeTask.state]}</Text>
                  </View>
                </View>
                <Text style={styles.activeTitle} numberOfLines={2}>{activeTask.item_description ?? 'Заказ'}</Text>
                <Text style={styles.activeAddr}>📍 {activeTask.to_location?.address ?? '—'}</Text>
                <View style={styles.activeBottom}>
                  <Text style={styles.activePrice}>{activeTask.price_final} ₽</Text>
                  <TouchableOpacity style={styles.activeOpenBtn}>
                    <Text style={styles.activeOpenText}>Открыть →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Hot orders */}
          {hotOrders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Горящие 🔥</Text>
              </View>
              {hotOrders.map(task => (
                <OrderCard
                  key={task.id} task={task} hot
                  styles={styles} COLORS={COLORS} isDark={isDark}
                  onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: task.id } })}
                />
              ))}
            </View>
          )}

          {/* New orders */}
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
                  styles={styles} COLORS={COLORS} isDark={isDark}
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

function OrderCard({ task, hot, onPress, styles, COLORS, isDark }: {
  task: Task; hot?: boolean; onPress: () => void; styles: any; COLORS: AppColors; isDark: boolean;
}) {
  const cat = CATEGORIES.find(c => c.key === (task as any).category) ?? CATEGORIES[CATEGORIES.length - 1];
  const cardBg = hot ? COLORS.danger + '18' : (isDark ? cat.dark + '30' : cat.color);
  const textCol = hot ? COLORS.danger : (isDark ? COLORS.text : cat.textColor);
  const subCol  = hot ? COLORS.danger + '99' : (isDark ? COLORS.textMuted : cat.textColor + '99');
  return (
    <TouchableOpacity style={[styles.orderCard, { backgroundColor: cardBg }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.orderTop}>
        <Text style={[styles.orderCat, { color: subCol }]}>{cat.icon} {cat.label.toUpperCase()}</Text>
        {hot && task.expires_at && <Countdown expiresAt={task.expires_at} styles={styles} COLORS={COLORS} />}
      </View>
      <View style={styles.orderMiddle}>
        <Text style={[styles.orderTitle, { color: textCol }]} numberOfLines={2}>{task.item_description ?? 'Заказ'}</Text>
        <Text style={[styles.orderPrice, { color: textCol }]}>{task.price_final} ₽</Text>
      </View>
      {(task as any).to_location?.address && (
        <Text style={[styles.orderAddr, { color: subCol }]} numberOfLines={1}>
          📍 {(task as any).to_location.address}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
    safe:   { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting:  { fontSize: 13, color: C.textMuted, fontWeight: '500', marginBottom: 2 },
    name:      { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.8 },
    avatarBtn: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: C.glassCyan,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: isDark ? C.text : '#0E3A34', fontWeight: '800', fontSize: 17 },

    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
    statPill: {
      flex: 1, borderRadius: R.xl,
      paddingHorizontal: 14, paddingVertical: 12,
      alignItems: 'center',
    },
    statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
    statLabel: { fontSize: 11, fontWeight: '600' },

    section:       { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionTitle:  { flex: 1, fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4, marginBottom: 12 },
    seeAll:        { fontSize: 14, color: C.textMuted, fontWeight: '600' },

    activeCard: {
      borderRadius: R.xxl, padding: 20,
      backgroundColor: C.glassCyan,
    },
    activeTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    activeCat:    { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: isDark ? C.textMuted : '#0E3A3499' },
    activeTitle:  { fontSize: 20, fontWeight: '800', color: isDark ? C.text : '#0E3A34', letterSpacing: -0.4, marginBottom: 8 },
    activeAddr:   { fontSize: 13, color: isDark ? C.textMuted : '#0E3A3499', marginBottom: 16 },
    activeBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    activePrice:  { fontSize: 28, fontWeight: '800', color: isDark ? C.text : '#0E3A34' },
    activeOpenBtn:{ backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: R.full, paddingHorizontal: 14, paddingVertical: 6 },
    activeOpenText:{ fontSize: 13, fontWeight: '700', color: isDark ? C.text : '#0E3A34' },
    badge:        { borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText:    { fontSize: 11, fontWeight: '600', color: isDark ? C.text : '#0E3A34' },

    orderCard:   { borderRadius: R.xl, marginBottom: 10, padding: 16 },
    orderTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    orderCat:    { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    orderMiddle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    orderTitle:  { flex: 1, fontSize: 16, fontWeight: '700', letterSpacing: -0.2, marginRight: 12 },
    orderPrice:  { fontSize: 20, fontWeight: '800' },
    orderAddr:   { fontSize: 12 },

    countdown:     { backgroundColor: C.bgLayer, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 3 },
    countdownText: { fontSize: 12, fontWeight: '700', color: C.textMuted },

    empty:     { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 8 },
    emptyHint: { fontSize: 14, color: C.textMuted },
  });
}
