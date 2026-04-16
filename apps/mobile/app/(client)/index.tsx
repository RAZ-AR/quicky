import React, { useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import {
  RADIUS, SHADOW, CATEGORIES, TASK_STATE_LABELS,
  type AppColors,
} from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

// ── Order progress ───────────────────────────────────────────────────────────
const STEPS = [
  { state: 'published',      label: 'Создан'  },
  { state: 'accepted',       label: 'Нанят'   },
  { state: 'in_progress',    label: 'В пути'  },
  { state: 'pending_client', label: 'Готово'  },
  { state: 'completed',      label: 'Сдан'    },
];

function ProgressBar({ state, accent }: { state: string; accent: string }) {
  const idx = Math.max(0, STEPS.findIndex(s => s.state === state));
  return (
    <View style={pb.wrap}>
      <View style={pb.track}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step.state}>
            <View style={[pb.dot, i <= idx && { backgroundColor: accent }]}>
              {i < idx  && <Text style={pb.check}>✓</Text>}
              {i === idx && <View style={[pb.inner, { backgroundColor: accent }]} />}
            </View>
            {i < STEPS.length - 1 && (
              <View style={[pb.line, i < idx && { backgroundColor: accent }]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <Text style={[pb.label, { color: accent }]}>
        {STEPS[idx]?.label}
      </Text>
    </View>
  );
}

const pb = StyleSheet.create({
  wrap:  { marginTop: 16 },
  track: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot:   {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(28,28,30,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  inner: { width: 8, height: 8, borderRadius: 4 },
  check: { fontSize: 10, color: '#fff', fontWeight: '800' },
  line:  { flex: 1, height: 2, backgroundColor: 'rgba(28,28,30,0.12)' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
});

// ── Stat widget ──────────────────────────────────────────────────────────────
function StatCard({ value, label, accent, styles }: {
  value: string | number; label: string; accent?: string; styles: any;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent ? { color: accent } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ClientHomeScreen() {
  const router  = useRouter();
  const { user }                    = useAuthStore();
  const { myTasks, loadMyTasks }    = useTaskStore();
  const { COLORS, isDark }          = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  useEffect(() => { loadMyTasks(); }, []);

  const greetHour = new Date().getHours();
  const greeting  = greetHour < 12 ? 'Доброе утро' : greetHour < 18 ? 'Добрый день' : 'Добрый вечер';

  const active    = myTasks.filter(t => ['published','accepted','in_progress','pending_client'].includes(t.state));
  const completed = myTasks.filter(t => ['completed','rated'].includes(t.state));
  const recent    = myTasks.slice(0, 8);
  const totalSpent = completed.reduce((s, t) => s + (Number(t.price_final) || 0), 0);
  const activeTask = active[0];

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── HEADER ── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name}>{user?.name ?? 'Клиент'}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/(client)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </TouchableOpacity>
          </View>

          {/* ── STATS ROW ── */}
          <View style={styles.statsRow}>
            <StatCard value={active.length}    label="Активных"  accent={COLORS.primary} styles={styles} />
            <View style={styles.statDivider} />
            <StatCard value={completed.length} label="Выполнено" styles={styles} />
            <View style={styles.statDivider} />
            <StatCard value={totalSpent > 0 ? `${totalSpent.toLocaleString('ru')} ₽` : '—'} label="Потрачено" styles={styles} />
          </View>

          {/* ── ACTIVE ORDER WIDGET ── */}
          {activeTask ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Активный заказ</Text>
                {active.length > 1 && (
                  <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                    <Text style={styles.seeAll}>Все {active.length}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.activeCard}
                onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: activeTask.id } })}
                activeOpacity={0.85}
              >
                {/* Card top: category + status */}
                <View style={styles.activeTop}>
                  <View style={[styles.catBadge, { backgroundColor: COLORS.primaryGlow }]}>
                    <Text style={[styles.catBadgeText, { color: COLORS.primary }]}>
                      {CATEGORIES.find(c => c.key === (activeTask as any).category)?.label ?? 'Заказ'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: COLORS.primaryGlow }]}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.primary }]} />
                    <Text style={[styles.statusText, { color: COLORS.primary }]}>
                      {TASK_STATE_LABELS[activeTask.state] ?? activeTask.state}
                    </Text>
                  </View>
                </View>

                {/* Task title */}
                <Text style={styles.activeTitle} numberOfLines={2}>
                  {activeTask.item_description ?? 'Заказ'}
                </Text>

                {/* Address */}
                {activeTask.to_location?.address && (
                  <Text style={styles.activeAddr} numberOfLines={1}>
                    {activeTask.to_location.address}
                  </Text>
                )}

                {/* Progress */}
                <ProgressBar state={activeTask.state} accent={COLORS.primary} />

                {/* Footer */}
                <View style={styles.activeFooter}>
                  {activeTask.price_final ? (
                    <Text style={styles.activePrice}>{activeTask.price_final} ₽</Text>
                  ) : null}
                  <Text style={[styles.openLink, { color: COLORS.primary }]}>Подробнее →</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── No active order: quick create prompt ── */
            <TouchableOpacity
              style={styles.emptyActiveCard}
              onPress={() => router.push('/(client)/create')}
              activeOpacity={0.85}
            >
              <View style={[styles.emptyIconCircle, { backgroundColor: COLORS.primaryGlow }]}>
                <Text style={[styles.emptyIcon, { color: COLORS.primary }]}>+</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>Нет активных заказов</Text>
                <Text style={styles.emptySub}>Нажмите чтобы создать новый</Text>
              </View>
              <Text style={[styles.openLink, { color: COLORS.primary }]}>→</Text>
            </TouchableOpacity>
          )}

          {/* ── RECENT ORDERS ── */}
          {recent.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>История</Text>
                <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                  <Text style={styles.seeAll}>Все →</Text>
                </TouchableOpacity>
              </View>
              {recent.map(task => {
                const cat = CATEGORIES.find(c => c.key === (task as any).category);
                const isActive = ['published','accepted','in_progress','pending_client'].includes(task.state);
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.historyCard}
                    onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: task.id } })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.historyDot, { backgroundColor: cat?.color ?? COLORS.bgElevated }]} />
                    <View style={styles.historyContent}>
                      <Text style={styles.historyTitle} numberOfLines={1}>{task.item_description ?? 'Заказ'}</Text>
                      <Text style={styles.historyMeta}>
                        {cat?.label ?? 'Заказ'}
                        {task.price_final ? ` · ${task.price_final} ₽` : ''}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <View style={[styles.historyStatus, { backgroundColor: isActive ? COLORS.primaryGlow : COLORS.bgElevated }]}>
                        <Text style={[styles.historyStatusText, { color: isActive ? COLORS.primary : COLORS.textMuted }]}>
                          {TASK_STATE_LABELS[task.state] ?? task.state}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
    safe:   { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    // Header
    header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting:  { fontSize: 13, color: C.textMuted, fontWeight: '500', marginBottom: 2 },
    name:      { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.6 },
    avatarBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: C.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

    // Stats
    statsRow:    {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgLayer, borderRadius: R.xl,
      paddingVertical: 16, paddingHorizontal: 20,
      marginBottom: 28,
      ...SHADOW.sm,
    },
    statCard:    { flex: 1, alignItems: 'center' },
    statValue:   { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 2 },
    statLabel:   { fontSize: 11, color: C.textMuted, fontWeight: '500' },
    statDivider: { width: 1, height: 32, backgroundColor: C.border },

    // Section
    section:       { marginBottom: 28 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle:  { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    seeAll:        { fontSize: 14, color: C.primary, fontWeight: '600' },

    // Active order card
    activeCard: {
      backgroundColor: C.bgLayer,
      borderRadius: R.xxl,
      padding: 20,
      ...SHADOW.md,
    },
    activeTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    catBadge:      { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 5 },
    catBadgeText:  { fontSize: 12, fontWeight: '700' },
    statusBadge:   { flexDirection: 'row', alignItems: 'center', borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
    statusDot:     { width: 6, height: 6, borderRadius: 3 },
    statusText:    { fontSize: 11, fontWeight: '700' },
    activeTitle:   { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4, marginBottom: 6 },
    activeAddr:    { fontSize: 13, color: C.textMuted, marginBottom: 4 },
    activeFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    activePrice:   { fontSize: 26, fontWeight: '800', color: C.text },
    openLink:      { fontSize: 14, fontWeight: '600' },

    // Empty active
    emptyActiveCard: {
      backgroundColor: C.bgLayer,
      borderRadius: R.xxl, padding: 20,
      flexDirection: 'row', alignItems: 'center', gap: 14,
      borderWidth: 1, borderColor: C.border,
      borderStyle: 'dashed',
    },
    emptyIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    emptyIcon:       { fontSize: 24, fontWeight: '300' },
    emptyTitle:      { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
    emptySub:        { fontSize: 12, color: C.textMuted },

    // History cards
    historyCard: {
      backgroundColor: C.bgLayer,
      borderRadius: R.xl,
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 16,
      marginBottom: 8, gap: 12,
    },
    historyDot:        { width: 10, height: 10, borderRadius: 5 },
    historyContent:    { flex: 1 },
    historyTitle:      { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 3 },
    historyMeta:       { fontSize: 12, color: C.textMuted },
    historyRight:      {},
    historyStatus:     { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
    historyStatusText: { fontSize: 11, fontWeight: '600' },
  });
}
