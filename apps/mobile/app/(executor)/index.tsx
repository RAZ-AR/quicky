import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { getSocket } from '../../src/services/socket';
import {
  RADIUS, SHADOW, NEO, CATEGORIES, TASK_STATE_LABELS, TASK_STATE_COLORS,
  type AppColors,
} from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

// ── Step index ─────────────────────────────────────────────────────────────────
function getStepIndex(state: string): number {
  const map: Record<string, number> = {
    draft: 0, pending_confirm: 0, published: 0,
    accepted: 1,
    in_progress: 2,
    pending_client: 3,
    completed: 4, rated: 4,
  };
  return map[state] ?? 0;
}

// ── StepDots component ─────────────────────────────────────────────────────────
function StepDots({ state, accentColor }: { state: string; accentColor: string }) {
  const idx = getStepIndex(state);
  const TOTAL = 5;
  const DOT = 22;
  return (
    <View style={dots.row}>
      {Array.from({ length: TOTAL }).map((_, i) => {
        const done   = i < idx;
        const active = i === idx;
        const future = i > idx;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <View
                style={[
                  dots.line,
                  { backgroundColor: done ? accentColor : `${accentColor}40` },
                ]}
              />
            )}
            <View
              style={[
                dots.dot,
                { width: DOT, height: DOT, borderRadius: DOT / 2 },
                done   && { backgroundColor: accentColor },
                active && { backgroundColor: accentColor, opacity: 1 },
                future && { backgroundColor: `${accentColor}20`, borderWidth: 1.5, borderColor: `${accentColor}50` },
              ]}
            >
              {(done || active) && (
                <View style={[dots.inner, { backgroundColor: future ? 'transparent' : 'rgba(255,255,255,0.35)' }]} />
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const dots = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line:  { flex: 1, height: 3, borderRadius: 2 },
  dot:   { alignItems: 'center', justifyContent: 'center' },
  inner: { width: 8, height: 8, borderRadius: 4 },
});

// ── FeedCard component ─────────────────────────────────────────────────────────
function FeedCard({ task, onPress, onAccept, COLORS, styles }: {
  task: any;
  onPress: () => void;
  onAccept: () => void;
  COLORS: AppColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  const cat = CATEGORIES.find(c => c.key === task.category) ?? CATEGORIES[CATEGORIES.length - 1];
  return (
    <TouchableOpacity style={[styles.feedCard, { borderLeftColor: cat.dark }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.feedCardTop}>
        <View style={[styles.catChip, { backgroundColor: cat.dark + '22' }]}>
          <Ionicons name={cat.icon as any} size={14} color={cat.dark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedTitle} numberOfLines={2}>{task.item_description ?? 'Задание'}</Text>
          <Text style={styles.feedMeta}>
            {cat.label}{task.to_location?.address ? ` · ${task.to_location.address}` : ''}
          </Text>
        </View>
        <Text style={styles.feedPrice}>{task.price_final ?? task.price_suggested ?? '?'} ₽</Text>
      </View>
      <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: COLORS.executor }]} onPress={onAccept} activeOpacity={0.8}>
        <Text style={styles.acceptBtnText}>Взять →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function ExecutorHomeScreen() {
  const router = useRouter();
  const { feed, myTasks, isFeedLoading, loadFeed, loadMyTasks, acceptTask } = useTaskStore();
  const { user, token } = useAuthStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  const fetchAll = async () => {
    loadMyTasks();
    await loadFeed(55.7558, 37.6176);
  };

  useEffect(() => {
    fetchAll();
    if (token) {
      const socket = getSocket(token);
      socket.on('task_feed_new', fetchAll);
      socket.on('task_feed_removed', fetchAll);
      return () => {
        socket.off('task_feed_new', fetchAll);
        socket.off('task_feed_removed', fetchAll);
      };
    }
  }, [token]);

  const activeTask = myTasks.find(t => ['accepted', 'in_progress', 'pending_client'].includes(t.state));
  const completedCount = myTasks.filter(t => t.state === 'completed' || t.state === 'rated').length;
  const totalEarned = myTasks
    .filter(t => t.state === 'completed' || t.state === 'rated')
    .reduce((sum, t) => sum + (Number((t as any).price_final) || 0), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Доброе утро,' : hour < 18 ? 'Добрый день,' : 'Добрый вечер,';
  const firstName = (user?.name ?? 'Исполнитель').split(' ')[0];

  const activeTaskCat = activeTask
    ? (CATEGORIES.find(c => c.key === (activeTask as any).category) ?? CATEGORIES[CATEGORIES.length - 1])
    : null;

  const handleAccept = async (taskId: string) => {
    try {
      await acceptTask(taskId);
      router.push({ pathname: '/(executor)/task/[id]', params: { id: taskId } });
    } catch {}
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
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
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.executor }]}>{feed.length}</Text>
              <Text style={styles.statLabel}>НОВЫХ</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{completedCount}</Text>
              <Text style={styles.statLabel}>СДЕЛАНО</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.text }]}>
                {totalEarned > 0 ? `${totalEarned.toLocaleString('ru')}₽` : '—'}
              </Text>
              <Text style={styles.statLabel}>ЗАРАБОТАНО</Text>
            </View>
          </View>

          {/* Active task */}
          {activeTask && activeTaskCat ? (
            <TouchableOpacity
              style={[styles.activeCard, { backgroundColor: isDark ? activeTaskCat.dark + '30' : activeTaskCat.color }]}
              onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: activeTask.id } })}
              activeOpacity={0.85}
            >
              <View style={styles.activeTop}>
                <Text style={[styles.activeCatLabel, { color: isDark ? COLORS.textMuted : activeTaskCat.textColor + '99' }]}>
                  В РАБОТЕ
                </Text>
                <View style={[styles.stateBadge, { backgroundColor: 'rgba(0,0,0,0.10)' }]}>
                  <Text style={[styles.stateBadgeText, { color: isDark ? COLORS.text : activeTaskCat.textColor }]}>
                    {TASK_STATE_LABELS[activeTask.state]}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.activeTitle, { color: isDark ? COLORS.text : activeTaskCat.textColor }]}
                numberOfLines={2}
              >
                {(activeTask as any).item_description ?? 'Задание'}
              </Text>
              <StepDots state={activeTask.state} accentColor={isDark ? activeTaskCat.dark : activeTaskCat.textColor} />
              <View style={styles.activeBottom}>
                <Text style={[styles.activePrice, { color: isDark ? COLORS.text : activeTaskCat.textColor }]}>
                  {(activeTask as any).price_final} ₽
                </Text>
                <View style={[styles.activeOpenBtn, { backgroundColor: 'rgba(0,0,0,0.10)' }]}>
                  <Text style={[styles.activeOpenText, { color: isDark ? COLORS.text : activeTaskCat.textColor }]}>
                    Открыть →
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noActiveCard}>
              <Ionicons name="flash-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.noActiveText}>Нет активных заданий</Text>
              <Text style={styles.noActiveSub}>Возьмите задание из списка ниже</Text>
            </View>
          )}

          {/* Feed section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Новые задания</Text>
            <TouchableOpacity onPress={() => router.push('/(executor)/orders')}>
              <Text style={styles.seeAll}>Все →</Text>
            </TouchableOpacity>
          </View>

          {feed.slice(0, 5).map(task => (
            <FeedCard
              key={task.id}
              task={task}
              onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: task.id } })}
              onAccept={() => handleAccept(task.id)}
              COLORS={COLORS}
              styles={styles}
            />
          ))}

          {feed.length === 0 && (
            <View style={styles.emptyFeed}>
              <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Заданий рядом нет</Text>
              <Text style={styles.emptySub}>Потяните вниз чтобы обновить</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors, isDark: boolean) {
  const neoCard = isDark ? SHADOW.sm : NEO.card;
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
    safe:   { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    // Header
    header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting:  { fontSize: 13, color: C.textMuted, fontWeight: '500', marginBottom: 2 },
    name:      { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.8 },
    avatarBtn: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: isDark ? C.glassCyan : C.executor + '18',
      alignItems: 'center', justifyContent: 'center',
      ...(isDark ? SHADOW.sm : NEO.btn),
    },
    avatarText: { color: C.executor, fontWeight: '800', fontSize: 17 },

    // Stats
    statsRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgLayer,
      borderRadius: RADIUS.xl,
      marginBottom: 20,
      paddingVertical: 16,
      ...neoCard,
    },
    statCard:    { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 32, backgroundColor: C.divider },
    statValue:   { fontSize: 22, fontWeight: '800', marginBottom: 2 },
    statLabel:   { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8 },

    // Active task card
    activeCard: {
      borderRadius: RADIUS.xxl, padding: 20, marginBottom: 24,
      ...(isDark ? SHADOW.sm : NEO.card),
    },
    activeTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    activeCatLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
    stateBadge:     { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
    stateBadgeText: { fontSize: 11, fontWeight: '600' },
    activeTitle:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: 4 },
    activeBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    activePrice:    { fontSize: 28, fontWeight: '800' },
    activeOpenBtn:  { borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6 },
    activeOpenText: { fontSize: 13, fontWeight: '700' },

    // No active card
    noActiveCard: {
      borderRadius: RADIUS.xl,
      padding: 20,
      marginBottom: 24,
      alignItems: 'center',
      backgroundColor: C.bgLayer,
      ...neoCard,
    },
    noActiveText: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 8, marginBottom: 4 },
    noActiveSub:  { fontSize: 13, color: C.textMuted },

    // Section header
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle:  { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
    seeAll:        { fontSize: 14, color: C.textMuted, fontWeight: '600' },

    // Feed card
    feedCard: {
      backgroundColor: C.bgLayer,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: 'transparent',
      marginBottom: 10,
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
    feedCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    catChip: {
      width: 32, height: 32, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    feedTitle:  { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
    feedMeta:   { fontSize: 12, color: C.textMuted },
    feedPrice:  { fontSize: 16, fontWeight: '800', color: C.text, marginLeft: 8 },

    acceptBtn: {
      borderRadius: RADIUS.md,
      paddingVertical: 10,
      alignItems: 'center',
    },
    acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    // Empty
    emptyFeed: { alignItems: 'center', paddingTop: 48 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.text, marginTop: 12, marginBottom: 4 },
    emptySub:  { fontSize: 13, color: C.textMuted },
  });
}
