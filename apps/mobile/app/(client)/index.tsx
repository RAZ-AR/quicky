import { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, SHADOW, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function ClientHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { myTasks, loadMyTasks } = useTaskStore();
  const { COLORS, GRADIENTS, isDark, blurTint } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  useEffect(() => { loadMyTasks(); }, []);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Доброе утро' : greetHour < 18 ? 'Добрый день' : 'Добрый вечер';

  const activeTasks = myTasks.filter(t =>
    ['published', 'accepted', 'in_progress', 'pending_client'].includes(t.state)
  );
  const recentTasks = myTasks.slice(0, 3);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />

      {/* Ambient glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ───────────────────────────────── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.name}>{user?.name ?? 'Клиент'}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(client)/profile')}>
              <View style={styles.avatarWrap}>
                <BlurView intensity={30} tint={blurTint} style={StyleSheet.absoluteFill} />
                <View style={styles.avatarOverlay} />
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Hero CTA ─────────────────────────────── */}
          <View style={[styles.heroCard, SHADOW.glow]}>
            <BlurView intensity={25} tint={blurTint} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(139,92,246,0.35)', 'rgba(6,182,212,0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroBorder} />

            <View style={{ position: 'relative', padding: 24 }}>
              <Text style={styles.heroTitle}>Нужна помощь? ⚡</Text>
              <Text style={styles.heroSub}>Опишите задание голосом или текстом</Text>
              <View style={styles.heroRow}>
                <TouchableOpacity
                  style={styles.heroBtn}
                  onPress={() => router.push('/(client)/voice')}
                >
                  <LinearGradient colors={GRADIENTS.primary} style={styles.heroBtnGrad} />
                  <Text style={styles.heroBtnIcon}>🎙️</Text>
                  <Text style={styles.heroBtnText}>Голосом</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.heroBtn, styles.heroBtnGhost]}
                  onPress={() => router.push({ pathname: '/(client)/clarify', params: { mode: 'text' } })}
                >
                  <Text style={styles.heroBtnIcon}>✏️</Text>
                  <Text style={[styles.heroBtnText, { color: COLORS.text }]}>Текстом</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Быстрый доступ ───────────────────────── */}
          <Text style={styles.sectionTitle}>Быстрый доступ</Text>
          <View style={styles.quickRow}>
            {[
              { icon: '📦', label: 'Купить',    color: COLORS.primaryGlow },
              { icon: '🚗', label: 'Отвезти',   color: COLORS.executorGlow },
              { icon: '📋', label: 'Поручение', color: COLORS.successGlow },
            ].map(({ icon, label, color }) => (
              <TouchableOpacity
                key={label}
                style={styles.quickCard}
                onPress={() => router.push({ pathname: '/(client)/clarify', params: { mode: 'text', hint: label } })}
              >
                <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
                <View style={[styles.quickOverlay, { backgroundColor: color }]} />
                <View style={styles.quickBorder} />
                <View style={{ position: 'relative', alignItems: 'center' }}>
                  <Text style={styles.quickIcon}>{icon}</Text>
                  <Text style={styles.quickLabel}>{label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Активные заказы ──────────────────────── */}
          {activeTasks.length > 0 && (
            <>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Активные</Text>
                <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                  <Text style={styles.seeAll}>Все →</Text>
                </TouchableOpacity>
              </View>
              {activeTasks.slice(0, 2).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  styles={styles}
                  COLORS={COLORS}
                  blurTint={blurTint}
                  onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: task.id } })}
                />
              ))}
            </>
          )}

          {/* ── Последние заказы ─────────────────────── */}
          {recentTasks.length > 0 && activeTasks.length === 0 && (
            <>
              <View style={styles.sectionRow}>
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
                  blurTint={blurTint}
                  onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: task.id } })}
                />
              ))}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────────
function TaskCard({ task, onPress, styles, COLORS, blurTint }: { task: any; onPress: () => void; styles: any; COLORS: AppColors; blurTint: 'dark' | 'light' }) {
  const stateColor = TASK_STATE_COLORS[task.state] ?? COLORS.textMuted;
  return (
    <TouchableOpacity style={styles.taskCard} onPress={onPress} activeOpacity={0.8}>
      <BlurView intensity={18} tint={blurTint} style={StyleSheet.absoluteFill} />
      <View style={styles.taskCardBg} />
      <View style={[styles.taskAccent, { backgroundColor: stateColor }]} />
      <View style={{ position: 'relative', flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.taskTitle} numberOfLines={1}>{task.item_description ?? 'Заказ'}</Text>
          <Text style={styles.taskAddr} numberOfLines={1}>📍 {task.to_location?.address ?? '—'}</Text>
        </View>
        <View>
          <Text style={styles.taskPrice}>{task.price_final ? `${task.price_final} ₽` : '—'}</Text>
          <View style={[styles.stateBadge, { backgroundColor: stateColor + '25' }]}>
            <Text style={[styles.stateBadgeText, { color: stateColor }]}>
              {TASK_STATE_LABELS[task.state]}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors, C_RADIUS = RADIUS) {
  return StyleSheet.create({
    root:          { flex: 1, backgroundColor: C.bg },
    safe:          { flex: 1 },
    scroll:        { paddingHorizontal: 20 },

    glowTop: {
      position: 'absolute', top: -120, left: '20%',
      width: 280, height: 280, borderRadius: 140,
      backgroundColor: 'rgba(139,92,246,0.18)',
    },
    glowBottom: {
      position: 'absolute', bottom: 100, right: -60,
      width: 200, height: 200, borderRadius: 100,
      backgroundColor: 'rgba(6,182,212,0.12)',
    },

    // Header
    header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginBottom: 24 },
    greeting:    { fontSize: 13, color: C.textMuted, fontWeight: '500' },
    name:        { fontSize: 24, fontWeight: '800', color: C.text, marginTop: 2 },
    avatarWrap:  { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    avatarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: C.glassViolet, borderRadius: 22, borderWidth: 1, borderColor: C.glassBorder },
    avatarText:  { color: C.text, fontWeight: '700', fontSize: 16, position: 'relative' },

    // Hero
    heroCard: {
      borderRadius: C_RADIUS.xxl, overflow: 'hidden', marginBottom: 24,
    },
    heroBorder: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: C_RADIUS.xxl, borderWidth: 1, borderColor: C.glassBorder,
    },
    heroTitle:   { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 6 },
    heroSub:     { fontSize: 13, color: C.textMuted, marginBottom: 20 },
    heroRow:     { flexDirection: 'row', gap: 12 },
    heroBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: C_RADIUS.lg, paddingVertical: 14, gap: 8, overflow: 'hidden',
    },
    heroBtnGrad: { ...StyleSheet.absoluteFillObject, borderRadius: C_RADIUS.lg },
    heroBtnGhost: { backgroundColor: C.glass, borderWidth: 1, borderColor: C.glassBorder },
    heroBtnIcon: { fontSize: 18 },
    heroBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    // Quick access
    sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textMuted, marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
    sectionRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    seeAll:       { fontSize: 14, color: C.primary, fontWeight: '600' },
    quickRow:     { flexDirection: 'row', gap: 10, marginBottom: 28 },
    quickCard: {
      flex: 1, borderRadius: C_RADIUS.lg, overflow: 'hidden',
      paddingVertical: 18, paddingHorizontal: 8,
    },
    quickOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: C_RADIUS.lg },
    quickBorder:  { ...StyleSheet.absoluteFillObject, borderRadius: C_RADIUS.lg, borderWidth: 1, borderColor: C.glassBorder },
    quickIcon:    { fontSize: 26, marginBottom: 8, textAlign: 'center' },
    quickLabel:   { fontSize: 12, fontWeight: '600', color: C.text, textAlign: 'center' },

    // Task cards
    taskCard: {
      borderRadius: C_RADIUS.xl, overflow: 'hidden', marginBottom: 10,
    },
    taskCardBg: {
      ...StyleSheet.absoluteFillObject, backgroundColor: C.glass,
      borderRadius: C_RADIUS.xl, borderWidth: 1, borderColor: C.glassBorder,
    },
    taskAccent: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
    taskTitle:  { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 },
    taskAddr:   { fontSize: 12, color: C.textMuted },
    taskPrice:  { fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'right', marginBottom: 4 },
    stateBadge: { borderRadius: C_RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
    stateBadgeText: { fontSize: 11, fontWeight: '600' },
  });
}
