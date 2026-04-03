import { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function ClientHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { myTasks, loadMyTasks } = useTaskStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  useEffect(() => { loadMyTasks(); }, []);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Доброе утро' : greetHour < 18 ? 'Добрый день' : 'Добрый вечер';

  const activeTasks = myTasks.filter(t =>
    ['published', 'accepted', 'in_progress', 'pending_client'].includes(t.state)
  );
  const recentTasks = myTasks.slice(0, 4);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ───────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
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

          {/* ── Quick Action Cards ───────────────────── */}
          <View style={styles.quickSection}>
            <Text style={styles.sectionLabel}>Создать задание</Text>
            <View style={styles.quickGrid}>
              {/* Primary CTA — Voice (warm yellow card) */}
              <TouchableOpacity
                style={styles.quickPrimary}
                onPress={() => router.push('/(client)/voice')}
                activeOpacity={0.85}
              >
                <View style={styles.primaryIconWrap}>
                  <Text style={styles.primaryIcon}>🎙️</Text>
                </View>
                <Text style={styles.primaryLabel}>Голосом</Text>
                <Text style={styles.primarySub}>Скажите что нужно</Text>
              </TouchableOpacity>

              {/* Secondary CTA — Text (white card) */}
              <TouchableOpacity
                style={styles.quickSecondary}
                onPress={() => router.push({ pathname: '/(client)/clarify', params: { mode: 'text' } })}
                activeOpacity={0.85}
              >
                <View style={styles.secondaryIconWrap}>
                  <Text style={styles.secondaryIcon}>✏️</Text>
                </View>
                <Text style={styles.secondaryLabel}>Текстом</Text>
                <Text style={styles.secondarySub}>Напечатайте</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Category chips ───────────────────────── */}
          <View style={styles.chipSection}>
            {[
              { icon: '📦', label: 'Купить', hint: 'Купи-привези' },
              { icon: '🚗', label: 'Отвезти', hint: 'Забери-отвези' },
              { icon: '📋', label: 'Поручение', hint: 'Простое задание' },
            ].map(({ icon, label, hint }) => (
              <TouchableOpacity
                key={label}
                style={styles.chip}
                onPress={() => router.push({ pathname: '/(client)/clarify', params: { mode: 'text', hint } })}
                activeOpacity={0.7}
              >
                <Text style={styles.chipIcon}>{icon}</Text>
                <Text style={styles.chipText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Active tasks ─────────────────────────── */}
          {activeTasks.length > 0 && (
            <View style={styles.activeSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Активные</Text>
                <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                  <Text style={styles.seeAll}>Все →</Text>
                </TouchableOpacity>
              </View>
              {activeTasks.slice(0, 3).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  styles={styles}
                  COLORS={COLORS}
                  onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: task.id } })}
                />
              ))}
            </View>
          )}

          {/* ── Recent (fallback when no active) ─────── */}
          {recentTasks.length > 0 && activeTasks.length === 0 && (
            <View style={styles.activeSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Последние</Text>
                <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                  <Text style={styles.seeAll}>Все →</Text>
                </TouchableOpacity>
              </View>
              {recentTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  styles={styles}
                  COLORS={COLORS}
                  onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: task.id } })}
                />
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────────
function TaskCard({ task, onPress, styles, COLORS }: {
  task: any; onPress: () => void; styles: any; COLORS: AppColors;
}) {
  const stateColor = TASK_STATE_COLORS[task.state] ?? COLORS.textMuted;
  return (
    <TouchableOpacity style={styles.taskCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
      <View style={styles.taskContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.taskTitle} numberOfLines={1}>{task.item_description ?? 'Заказ'}</Text>
          <Text style={styles.taskAddr} numberOfLines={1}>
            {task.to_location?.address ? `📍 ${task.to_location.address}` : 'Адрес не указан'}
          </Text>
        </View>
        <View style={styles.taskRight}>
          {task.price_final && (
            <Text style={[styles.taskPrice, { color: stateColor }]}>{task.price_final} ₽</Text>
          )}
          <View style={[styles.stateBadge, { backgroundColor: stateColor + '18' }]}>
            <Text style={[styles.stateBadgeText, { color: stateColor }]}>
              {TASK_STATE_LABELS[task.state] ?? task.state}
            </Text>
          </View>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    headerLeft: { flex: 1 },
    greeting: { fontSize: 13, color: C.textMuted, fontWeight: '500', marginBottom: 2 },
    name: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.8 },
    avatarBtn: {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: C.bgLayer,
      borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: C.text, fontWeight: '700', fontSize: 17 },

    // Quick action section
    quickSection: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: C.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
    },
    quickGrid: { flexDirection: 'row', gap: 12 },

    // Primary CTA — warm yellow card
    quickPrimary: {
      flex: 2, borderRadius: R.xl, paddingVertical: 22, paddingHorizontal: 16,
      backgroundColor: C.glassViolet,
      alignItems: 'center',
    },
    primaryIconWrap: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.08)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    primaryIcon: { fontSize: 22 },
    primaryLabel: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 2 },
    primarySub: { fontSize: 12, color: C.textMuted },

    // Secondary CTA — white card
    quickSecondary: {
      flex: 1, borderRadius: R.xl, paddingVertical: 22, paddingHorizontal: 12,
      backgroundColor: C.glass,
      borderWidth: 1, borderColor: C.border,
      alignItems: 'center',
    },
    secondaryIconWrap: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: C.bgElevated,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    secondaryIcon: { fontSize: 22 },
    secondaryLabel: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 2 },
    secondarySub: { fontSize: 12, color: C.textMuted },

    // Category chips
    chipSection: { flexDirection: 'row', gap: 8, marginBottom: 28 },
    chip: {
      borderRadius: R.full,
      backgroundColor: C.bgLayer,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 10, gap: 6,
    },
    chipIcon: { fontSize: 15 },
    chipText: { fontSize: 13, fontWeight: '600', color: C.text },

    // Section headers
    activeSection: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    seeAll: { fontSize: 14, color: C.primary, fontWeight: '600' },

    // Task cards — solid editorial
    taskCard: {
      borderRadius: R.xl, marginBottom: 10, minHeight: 72,
      backgroundColor: C.glass,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'stretch',
      overflow: 'hidden',
    },
    stateDot: {
      width: 4,
      borderTopLeftRadius: R.xl, borderBottomLeftRadius: R.xl,
    },
    taskContent: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      padding: 16, paddingLeft: 14,
    },
    taskTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 },
    taskAddr: { fontSize: 12, color: C.textMuted },
    taskRight: { alignItems: 'flex-end', paddingLeft: 8 },
    taskPrice: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
    stateBadge: { borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 3 },
    stateBadgeText: { fontSize: 11, fontWeight: '600' },
  });
}
