import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import {
  RADIUS, SHADOW, NEO, CATEGORIES, TASK_STATE_LABELS, TASK_STATE_COLORS,
  type AppColors,
} from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useLang } from '../../src/hooks/useLang';
import type { Lang } from '../../src/i18n/translations';

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_TASKS: any[] = [
  {
    id: 'mock-1',
    state: 'in_progress',
    item_description: 'Купить продукты: молоко, хлеб, яйца в Пятёрочке на Ленина',
    category: 'shopping',
    from_location: { address: 'Пятёрочка, ул. Ленина, 10' },
    to_location: { address: 'пр. Победы, 45, кв. 12' },
    price_final: 450,
    payment_method: 'cash',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    executor: { name: 'Алексей К.', rating_avg: 4.8 },
    executor_id: 'ex-1',
  },
  {
    id: 'mock-2',
    state: 'completed',
    item_description: 'Доставить посылку из СДЭК в офис',
    category: 'delivery',
    from_location: { address: 'СДЭК, ул. Садовая, 23' },
    to_location: { address: 'БЦ Альфа, пр. Маркса, 1' },
    price_final: 600,
    payment_method: 'card',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    executor: { name: 'Мария В.', rating_avg: 4.9 },
    executor_id: 'ex-2',
  },
  {
    id: 'mock-3',
    state: 'published',
    item_description: 'Забрать вещи из химчистки и отвезти домой',
    category: 'errand',
    from_location: { address: 'Химчистка Снежинка, ул. Попова, 7' },
    to_location: { address: 'ул. Гагарина, 100, кв. 5' },
    price_final: 350,
    payment_method: 'cash',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    executor: null,
    executor_id: null,
  },
  {
    id: 'mock-4',
    state: 'rated',
    item_description: 'Клининг квартиры 2 комнаты',
    category: 'cleaning',
    from_location: null,
    to_location: { address: 'ул. Мира, 15, кв. 8' },
    price_final: 1800,
    payment_method: 'card',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    executor: { name: 'Анна С.', rating_avg: 5.0 },
    executor_id: 'ex-3',
  },
];

// ── Step index ────────────────────────────────────────────────────────────────
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

// ── Inline step dots (inside colored hero card) ───────────────────────────────
function StepDots({ state, darkText }: { state: string; darkText: string }) {
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
                  { backgroundColor: done ? darkText : `${darkText}40` },
                ]}
              />
            )}
            <View
              style={[
                dots.dot,
                { width: DOT, height: DOT, borderRadius: DOT / 2 },
                done   && { backgroundColor: darkText },
                active && { backgroundColor: darkText, opacity: 1 },
                future && { backgroundColor: `${darkText}20`, borderWidth: 1.5, borderColor: `${darkText}50` },
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
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line: { flex: 1, height: 3, borderRadius: 2 },
  dot: { alignItems: 'center', justifyContent: 'center' },
  inner: { width: 8, height: 8, borderRadius: 4 },
});

// ── Language selector ─────────────────────────────────────────────────────────
function LangSelector({
  language,
  setLanguage,
  styles,
}: {
  language: Lang;
  setLanguage: (l: Lang) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const [open, setOpen] = useState(false);
  const options: { key: Lang; label: string }[] = [
    { key: 'ru', label: 'RU' },
    { key: 'en', label: 'EN' },
    { key: 'sr', label: 'SR' },
  ];
  return (
    <View>
      <TouchableOpacity
        style={styles.langBtn}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.langBtnText}>{language.toUpperCase()}</Text>
        <Text style={styles.langChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.langDropdown}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.langOption,
                opt.key === language && styles.langOptionActive,
              ]}
              onPress={() => { setLanguage(opt.key); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langOptionText,
                  opt.key === language && styles.langOptionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ClientHomeScreen() {
  const router = useRouter();
  const { user }                     = useAuthStore();
  const { myTasks, loadMyTasks }     = useTaskStore();
  const { COLORS, isDark }           = useAppTheme();
  const { t, language, setLanguage } = useLang();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  useEffect(() => { loadMyTasks(); }, []);

  // Greeting
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? t.goodMorning : hour < 18 ? t.goodAfternoon : t.goodEvening;
  const firstName = (user?.name ?? 'Клиент').split(' ')[0];

  // Data
  const tasks      = myTasks.length > 0 ? myTasks : MOCK_TASKS;
  const active     = tasks.filter((tk: any) =>
    ['published', 'accepted', 'in_progress', 'pending_client'].includes(tk.state),
  );
  const completed  = tasks.filter((tk: any) =>
    ['completed', 'rated'].includes(tk.state),
  );
  const history    = tasks.slice(0, 8);
  const totalSpent = completed.reduce(
    (sum: number, tk: any) => sum + (Number(tk.price_final) || 0), 0,
  );
  const activeTask = active[0] ?? null;

  const stepLabels = [
    t.stepCreated,
    t.stepHasExecutor,
    t.stepTaken,
    t.stepEnRoute,
    t.stepDelivered,
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.name}>{firstName}</Text>
            </View>
            <LangSelector language={language} setLanguage={setLanguage} styles={styles} />
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/(client)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Stats bento row ── */}
          <View style={styles.statsRow}>
            {/* Active */}
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>
                {active.length}
              </Text>
              <Text style={styles.statLabel}>{t.active.toUpperCase()}</Text>
            </View>
            <View style={styles.statDivider} />
            {/* Completed */}
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {completed.length}
              </Text>
              <Text style={styles.statLabel}>{t.completed.toUpperCase()}</Text>
            </View>
            <View style={styles.statDivider} />
            {/* Spent */}
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.text }]}>
                {totalSpent > 0 ? `${totalSpent.toLocaleString('ru')}₽` : '—'}
              </Text>
              <Text style={styles.statLabel}>{t.spent.toUpperCase()}</Text>
            </View>
          </View>

          {/* ── Active order section ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.activeOrder}</Text>
            {active.length > 1 && (
              <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                <Text style={styles.seeAll}>
                  {t.allOrders.replace('→', '').trim()} {active.length} →
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {activeTask ? (
            (() => {
              const cat      = CATEGORIES.find(c => c.key === activeTask.category);
              const cardBg   = cat?.dark   ?? '#F5C4A0';
              const textCol  = cat?.darkText ?? '#2A1000';
              const stepIdx  = getStepIndex(activeTask.state);
              const statLabel = TASK_STATE_LABELS[activeTask.state] ?? stepLabels[stepIdx];

              return (
                <TouchableOpacity
                  style={[styles.heroCard, { backgroundColor: cardBg }]}
                  onPress={() => router.push({
                    pathname: '/(client)/tasks/[id]',
                    params: { id: activeTask.id },
                  })}
                  activeOpacity={0.88}
                >
                  {/* Top pills */}
                  <View style={styles.heroTop}>
                    <View style={[styles.heroPill, { backgroundColor: `${textCol}20` }]}>
                      <Ionicons
                        name={(cat?.icon ?? 'list-outline') as any}
                        size={12}
                        color={textCol}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.heroPillText, { color: textCol }]}>
                        {cat?.label ?? 'Заказ'}
                      </Text>
                    </View>
                    <View style={[styles.heroPill, { backgroundColor: `${textCol}20` }]}>
                      <View style={[styles.heroStatusDot, { backgroundColor: textCol }]} />
                      <Text style={[styles.heroPillText, { color: textCol }]}>
                        {statLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text
                    style={[styles.heroTitle, { color: textCol }]}
                    numberOfLines={2}
                  >
                    {activeTask.item_description ?? 'Заказ'}
                  </Text>

                  {/* Address */}
                  {activeTask.to_location?.address ? (
                    <View style={styles.heroAddrRow}>
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={`${textCol}A0`}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[styles.heroAddr, { color: `${textCol}A0` }]}
                        numberOfLines={1}
                      >
                        {activeTask.to_location.address}
                      </Text>
                    </View>
                  ) : null}

                  {/* Step dots progress */}
                  <StepDots state={activeTask.state} darkText={textCol} />

                  {/* Footer: price + details link */}
                  <View style={styles.heroFooter}>
                    <Text style={[styles.heroPrice, { color: textCol }]}>
                      {activeTask.price_final ? `${activeTask.price_final} ₽` : '—'}
                    </Text>
                    <Text style={[styles.heroDetails, { color: textCol }]}>
                      {t.orderDetails} →
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })()
          ) : (
            /* Empty state */
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => router.push('/(client)/create')}
              activeOpacity={0.85}
            >
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyPlus}>+</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>{t.noActiveOrders}</Text>
                <Text style={styles.emptySub}>{t.tapToCreate}</Text>
              </View>
              <Text style={styles.emptyArrow}>→</Text>
            </TouchableOpacity>
          )}

          {/* ── History section ── */}
          {history.length > 0 && (
            <View style={{ marginTop: 32 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.history}</Text>
                <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                  <Text style={styles.seeAll}>{t.allOrders}</Text>
                </TouchableOpacity>
              </View>

              {history.map((task: any) => {
                const cat        = CATEGORIES.find(c => c.key === task.category);
                const borderCol  = cat?.dark ?? '#E0E0E0';
                const stateColor = TASK_STATE_COLORS[task.state] ?? '#8E8E93';
                const stateLabel = TASK_STATE_LABELS[task.state] ?? task.state;

                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.histCard, { borderLeftColor: borderCol }]}
                    onPress={() => router.push({
                      pathname: '/(client)/tasks/[id]',
                      params: { id: task.id },
                    })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.histContent}>
                      <Text style={styles.histTitle} numberOfLines={1}>
                        {task.item_description ?? 'Заказ'}
                      </Text>
                      <Text style={styles.histMeta}>
                        {cat?.label ?? 'Заказ'}
                        {task.price_final ? ` · ${task.price_final} ₽` : ''}
                      </Text>
                    </View>
                    <View style={[styles.histBadge, { backgroundColor: `${stateColor}22` }]}>
                      <Text style={[styles.histBadgeText, { color: stateColor }]}>
                        {stateLabel}
                      </Text>
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

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
    safe:   { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 24,
    },
    greeting: {
      fontSize: 13,
      fontWeight: '500',
      color: C.textMuted,
      marginBottom: 2,
    },
    name: {
      fontSize: 32,
      fontWeight: '800',
      color: C.text,
      letterSpacing: -0.8,
    },
    avatarBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW.orange,
    },
    avatarText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 17,
    },

    // Lang selector
    langBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: C.bgLayer,
      borderRadius: R.full,
      paddingHorizontal: 12,
      paddingVertical: 8,
      ...(isDark ? { borderWidth: 1, borderColor: C.border } : NEO.btn),
    },
    langBtnText: { fontSize: 12, fontWeight: '700', color: C.text },
    langChevron: { fontSize: 8, color: C.textMuted },
    langDropdown: {
      position: 'absolute',
      top: 44,
      right: 0,
      backgroundColor: C.bgLayer,
      borderRadius: R.lg,
      borderWidth: 1,
      borderColor: C.border,
      zIndex: 999,
      overflow: 'hidden',
      ...SHADOW.md,
    },
    langOption: { paddingHorizontal: 18, paddingVertical: 11 },
    langOptionActive: { backgroundColor: C.primaryGlow },
    langOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: C.textMuted,
    },
    langOptionTextActive: { color: C.primary, fontWeight: '700' },

    // Stats bento
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.bgLayer,
      borderRadius: R.xl,
      paddingVertical: 18,
      paddingHorizontal: 20,
      marginBottom: 32,
      ...(isDark ? SHADOW.sm : NEO.card),
    },
    statCard:    { flex: 1, alignItems: 'center' },
    statValue:   { fontSize: 22, fontWeight: '700', marginBottom: 4 },
    statLabel:   { fontSize: 9, color: C.textMuted, fontWeight: '600', letterSpacing: 0.5 },
    statDivider: { width: 1, height: 36, backgroundColor: C.divider },

    // Section header
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: C.text,
      letterSpacing: -0.3,
    },
    seeAll: { fontSize: 14, color: C.primary, fontWeight: '600' },

    // Hero (active task) card
    heroCard: {
      borderRadius: 20,
      padding: 18,
      ...SHADOW.lg,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: R.full,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    heroPillText: { fontSize: 12, fontWeight: '700' },
    heroStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 5,
    },
    heroTitle: {
      fontSize: 17,
      fontWeight: '700',
      lineHeight: 23,
      marginBottom: 6,
    },
    heroAddrRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroAddr: { fontSize: 13, flex: 1 },
    heroFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    heroPrice: { fontSize: 22, fontWeight: '800' },
    heroDetails: { fontSize: 13, fontWeight: '600' },

    // Empty state card
    emptyCard: {
      backgroundColor: C.bgLayer,
      borderRadius: R.xxl,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      ...(isDark ? { borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' as const } : NEO.card),
    },
    emptyIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.primaryGlow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyPlus:  { fontSize: 24, color: C.primary, fontWeight: '300' },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
    emptySub:   { fontSize: 12, color: C.textMuted },
    emptyArrow: { fontSize: 18, color: C.primary, fontWeight: '600' },

    // History cards
    histCard: {
      backgroundColor: C.bgLayer,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 10,
      borderLeftWidth: 4,
      borderLeftColor: 'transparent', // set inline per-card
      ...(isDark ? { overflow: 'hidden' as const, ...SHADOW.sm } : {
        shadowColor: '#9BA3BC',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.40,
        shadowRadius: 10,
        elevation: 8,
      }),
    },
    histContent:   { flex: 1, marginRight: 10 },
    histTitle:     { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 3 },
    histMeta:      { fontSize: 12, color: C.textMuted },
    histBadge:     { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
    histBadgeText: { fontSize: 11, fontWeight: '600' },
  });
}
