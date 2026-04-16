import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, CATEGORIES, RECOMMENDED_PRICES, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

// ── Order progress steps ────────────────────────────────────────────────────
const ORDER_STEPS = [
  { state: 'published',      label: 'Создан',   short: '1' },
  { state: 'accepted',       label: 'Нанят',    short: '2' },
  { state: 'in_progress',    label: 'В пути',   short: '3' },
  { state: 'pending_client', label: 'Готово',   short: '4' },
  { state: 'completed',      label: 'Сдан',     short: '5' },
];

function OrderProgressBar({ state, COLORS, styles }: { state: string; COLORS: AppColors; styles: any }) {
  const currentIdx = ORDER_STEPS.findIndex(s => s.state === state);
  const safeIdx = currentIdx < 0 ? 0 : currentIdx;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        {ORDER_STEPS.map((step, i) => (
          <React.Fragment key={step.state}>
            <View style={[styles.progressDot, i <= safeIdx && styles.progressDotActive]} >
              {i < safeIdx && <Text style={styles.progressCheck}>✓</Text>}
              {i === safeIdx && <View style={styles.progressDotInner} />}
            </View>
            {i < ORDER_STEPS.length - 1 && (
              <View style={[styles.progressLine, i < safeIdx && styles.progressLineFilled]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.progressLabel}>
        {ORDER_STEPS[safeIdx]?.label ?? ''}
      </Text>
    </View>
  );
}

// ── Active Order Card ───────────────────────────────────────────────────────
function ActiveOrderCard({ task, onPress, styles, COLORS }: { task: any; onPress: () => void; styles: any; COLORS: AppColors }) {
  const cat = CATEGORIES.find(c => c.key === task.category) ?? CATEGORIES[CATEGORIES.length - 1];
  return (
    <TouchableOpacity style={[styles.activeCard, { backgroundColor: cat.color }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.activeCardTop}>
        <View>
          <Text style={[styles.activeCardCategory, { color: cat.textColor + 'AA' }]}>{cat.icon} {cat.label.toUpperCase()}</Text>
          <Text style={[styles.activeCardTitle, { color: cat.textColor }]} numberOfLines={2}>
            {task.item_description ?? 'Заказ'}
          </Text>
        </View>
        {task.price_final && (
          <Text style={[styles.activeCardPrice, { color: cat.textColor }]}>{task.price_final} ₽</Text>
        )}
      </View>
      {task.to_location?.address && (
        <Text style={[styles.activeCardAddr, { color: cat.textColor + '99' }]} numberOfLines={1}>
          📍 {task.to_location.address}
        </Text>
      )}
      <OrderProgressBar state={task.state} COLORS={COLORS} styles={styles} />
    </TouchableOpacity>
  );
}

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
  const completedTasks = myTasks.filter(t => ['completed', 'rated'].includes(t.state)).slice(0, 3);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
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

          {/* ── Active Orders (progress) ── */}
          {activeTasks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Активный заказ</Text>
                {activeTasks.length > 1 && (
                  <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                    <Text style={styles.seeAll}>Все {activeTasks.length} →</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ActiveOrderCard
                task={activeTasks[0]}
                styles={styles}
                COLORS={COLORS}
                onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: activeTasks[0].id } })}
              />
            </View>
          )}

          {/* ── Create Order ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Создать заказ</Text>
            <View style={styles.createRow}>
              <TouchableOpacity
                style={styles.createVoice}
                onPress={() => router.push('/(client)/voice')}
                activeOpacity={0.85}
              >
                <Text style={styles.createVoiceIcon}>🎙</Text>
                <Text style={styles.createVoiceLabel}>Голосом</Text>
                <Text style={styles.createVoiceSub}>Скажите задание</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createText}
                onPress={() => router.push({ pathname: '/(client)/clarify', params: { mode: 'text' } })}
                activeOpacity={0.85}
              >
                <Text style={styles.createTextIcon}>✏️</Text>
                <Text style={styles.createTextLabel}>Текстом</Text>
                <Text style={styles.createTextSub}>Напечатайте</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Categories with price hints ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Категории</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.slice(0, 6).map(cat => {
                const price = RECOMMENDED_PRICES[cat.key];
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.catCard, { backgroundColor: cat.color }]}
                    onPress={() => router.push({ pathname: '/(client)/clarify', params: { mode: 'text', hint: cat.label } })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.catIcon}>{cat.icon}</Text>
                    <Text style={[styles.catLabel, { color: cat.textColor }]}>{cat.label}</Text>
                    {price && (
                      <Text style={[styles.catPrice, { color: cat.textColor + '99' }]}>
                        {price.min}–{price.max} ₽
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Repeat / Recent ── */}
          {completedTasks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Повторить</Text>
                <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                  <Text style={styles.seeAll}>История →</Text>
                </TouchableOpacity>
              </View>
              {completedTasks.map(task => (
                <RepeatCard
                  key={task.id}
                  task={task}
                  styles={styles}
                  COLORS={COLORS}
                  onRepeat={() => router.push({ pathname: '/(client)/clarify', params: { mode: 'text', hint: task.item_description } })}
                  onHireAgain={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: task.id } })}
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

// ── Repeat Card ─────────────────────────────────────────────────────────────
function RepeatCard({ task, onRepeat, onHireAgain, styles, COLORS }: {
  task: any; onRepeat: () => void; onHireAgain: () => void; styles: any; COLORS: AppColors;
}) {
  const cat = CATEGORIES.find(c => c.key === task.category) ?? CATEGORIES[CATEGORIES.length - 1];
  return (
    <View style={styles.repeatCard}>
      <View style={[styles.repeatCatDot, { backgroundColor: cat.color }]} />
      <View style={styles.repeatContent}>
        <Text style={styles.repeatTitle} numberOfLines={1}>{task.item_description ?? 'Заказ'}</Text>
        <Text style={styles.repeatSub}>{cat.icon} {cat.label}{task.price_final ? ` · ${task.price_final} ₽` : ''}</Text>
      </View>
      <View style={styles.repeatActions}>
        <TouchableOpacity style={styles.repeatBtn} onPress={onRepeat} activeOpacity={0.8}>
          <Text style={styles.repeatBtnText}>Повторить</Text>
        </TouchableOpacity>
        {task.executor_id && (
          <TouchableOpacity style={[styles.repeatBtn, styles.hireBtn]} onPress={onHireAgain} activeOpacity={0.8}>
            <Text style={styles.hireBtnText}>Снова</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
    safe:   { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    // Header
    header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
    headerLeft: { flex: 1 },
    greeting:   { fontSize: 13, color: C.textMuted, fontWeight: '500', marginBottom: 2 },
    name:       { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.8 },
    avatarBtn:  {
      width: 46, height: 46, borderRadius: 23,
      backgroundColor: C.glassViolet,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: isDark ? C.text : '#4A3808', fontWeight: '800', fontSize: 17 },

    // Sections
    section:       { marginBottom: 28 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle:  { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
    seeAll:        { fontSize: 14, color: C.textMuted, fontWeight: '600' },

    // Active order card
    activeCard:         { borderRadius: R.xxl, padding: 20 },
    activeCardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    activeCardCategory: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
    activeCardTitle:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, maxWidth: 220 },
    activeCardPrice:    { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
    activeCardAddr:     { fontSize: 12, marginBottom: 16 },

    // Progress bar
    progressContainer: { marginTop: 4 },
    progressTrack:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    progressDot:       {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: 'rgba(255,255,255,0.40)',
      alignItems: 'center', justifyContent: 'center',
    },
    progressDotActive: { backgroundColor: 'rgba(0,0,0,0.75)' },
    progressDotInner:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
    progressCheck:     { fontSize: 11, color: '#fff', fontWeight: '800' },
    progressLine:      { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.30)' },
    progressLineFilled:{ backgroundColor: 'rgba(0,0,0,0.55)' },
    progressLabel:     { fontSize: 12, fontWeight: '700', color: 'rgba(0,0,0,0.60)', letterSpacing: 0.3 },

    // Create order
    createRow:       { flexDirection: 'row', gap: 12 },
    createVoice:     {
      flex: 2, borderRadius: R.xxl, paddingVertical: 24, paddingHorizontal: 20,
      backgroundColor: C.glassViolet, alignItems: 'center',
    },
    createVoiceIcon:  { fontSize: 28, marginBottom: 10 },
    createVoiceLabel: { fontSize: 17, fontWeight: '800', color: isDark ? C.text : '#4A3808', marginBottom: 2 },
    createVoiceSub:   { fontSize: 12, color: isDark ? C.textMuted : '#4A380899' },
    createText:      {
      flex: 1, borderRadius: R.xxl, paddingVertical: 24, paddingHorizontal: 12,
      backgroundColor: C.glass, borderWidth: 1, borderColor: C.border,
      alignItems: 'center',
    },
    createTextIcon:  { fontSize: 28, marginBottom: 10 },
    createTextLabel: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 2 },
    createTextSub:   { fontSize: 12, color: C.textMuted },

    // Category grid
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catCard: {
      width: '31%', borderRadius: R.xl,
      paddingVertical: 14, paddingHorizontal: 12,
      alignItems: 'flex-start',
    },
    catIcon:  { fontSize: 22, marginBottom: 8 },
    catLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
    catPrice: { fontSize: 11, fontWeight: '500' },

    // Repeat cards
    repeatCard: {
      borderRadius: R.xl, marginBottom: 10,
      backgroundColor: C.glass, borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 16, gap: 12,
    },
    repeatCatDot:   { width: 10, height: 10, borderRadius: 5 },
    repeatContent:  { flex: 1 },
    repeatTitle:    { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 },
    repeatSub:      { fontSize: 12, color: C.textMuted },
    repeatActions:  { flexDirection: 'row', gap: 6 },
    repeatBtn: {
      borderRadius: R.full, paddingHorizontal: 12, paddingVertical: 6,
      backgroundColor: C.primary,
    },
    repeatBtnText: { fontSize: 12, fontWeight: '700', color: isDark ? '#1A1714' : '#F5F3EF' },
    hireBtn:       { backgroundColor: C.executor },
    hireBtnText:   { fontSize: 12, fontWeight: '700', color: '#F5F3EF' },
  });
}
