import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Modal,
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
import { useLang } from '../../src/hooks/useLang';
import type { Lang } from '../../src/i18n/translations';

// ── Mock test data ───────────────────────────────────────────────────────────
const MOCK_TASKS: any[] = [
  {
    id: 'mock-1',
    state: 'in_progress',
    item_description: 'Купить продукты: молоко, хлеб, яйца в Пятёрочке на Ленина',
    category: 'shopping',
    from_location: { address: 'Пятёрочка, ул. Ленина, 10' },
    to_location:   { address: 'пр. Победы, 45, кв. 12' },
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
    to_location:   { address: 'БЦ "Альфа", пр. Маркса, 1, 3 этаж' },
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
    from_location: { address: 'Химчистка "Снежинка", ул. Попова, 7' },
    to_location:   { address: 'ул. Гагарина, 100, кв. 5' },
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

// ── Order progress ───────────────────────────────────────────────────────────
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

function ProgressBar({ state, accent, labels }: { state: string; accent: string; labels: string[] }) {
  const idx = getStepIndex(state);
  return (
    <View style={pb.wrap}>
      <View style={pb.track}>
        {labels.map((_, i) => (
          <React.Fragment key={i}>
            <View style={[pb.dot, i <= idx && { backgroundColor: accent }, i === idx && pb.dotActive]}>
              {i < idx  && <View style={[pb.check, { backgroundColor: accent }]} />}
              {i === idx && <View style={[pb.inner, { backgroundColor: accent }]} />}
            </View>
            {i < labels.length - 1 && (
              <View style={[pb.line, i < idx && { backgroundColor: accent }]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <Text style={[pb.label, { color: accent }]}>{labels[idx]}</Text>
    </View>
  );
}

const pb = StyleSheet.create({
  wrap:      { marginTop: 14 },
  track:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot:       { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(28,28,30,0.12)', alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: 'transparent', borderWidth: 2 },
  inner:     { width: 6, height: 6, borderRadius: 3 },
  check:     { width: 8, height: 8, borderRadius: 4 },
  line:      { flex: 1, height: 2, backgroundColor: 'rgba(28,28,30,0.10)' },
  label:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});

// ── Language selector ────────────────────────────────────────────────────────
function LangSelector({ language, setLanguage, styles }: {
  language: Lang;
  setLanguage: (l: Lang) => void;
  styles: any;
}) {
  const [open, setOpen] = useState(false);
  const options: { key: Lang; label: string }[] = [
    { key: 'ru', label: 'RU' },
    { key: 'en', label: 'EN' },
    { key: 'sr', label: 'SR' },
  ];
  return (
    <View>
      <TouchableOpacity style={styles.langBtn} onPress={() => setOpen(v => !v)} activeOpacity={0.7}>
        <Text style={styles.langBtnText}>{language.toUpperCase()}</Text>
        <Text style={styles.langChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.langDropdown}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.langOption, opt.key === language && styles.langOptionActive]}
              onPress={() => { setLanguage(opt.key); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.langOptionText, opt.key === language && styles.langOptionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ClientHomeScreen() {
  const router  = useRouter();
  const { user }                 = useAuthStore();
  const { myTasks, loadMyTasks } = useTaskStore();
  const { COLORS, isDark }       = useAppTheme();
  const { t, language, setLanguage } = useLang();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  useEffect(() => { loadMyTasks(); }, []);

  const greetHour = new Date().getHours();
  const greeting  = greetHour < 12 ? t.goodMorning : greetHour < 18 ? t.goodAfternoon : t.goodEvening;

  // Use real data if available, otherwise mock
  const tasks = myTasks.length > 0 ? myTasks : MOCK_TASKS;

  const active    = tasks.filter((t: any) => ['published','accepted','in_progress','pending_client'].includes(t.state));
  const completed = tasks.filter((t: any) => ['completed','rated'].includes(t.state));
  const recent    = tasks.slice(0, 8);
  const totalSpent = completed.reduce((s: number, task: any) => s + (Number(task.price_final) || 0), 0);
  const activeTask = active[0];

  const stepLabels = [t.stepCreated, t.stepHasExecutor, t.stepTaken, t.stepEnRoute, t.stepDelivered];

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name}>{user?.name ?? 'Клиент'}</Text>
            </View>
            <LangSelector language={language} setLanguage={setLanguage} styles={styles} />
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/(client)/profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </TouchableOpacity>
          </View>

          {/* STATS */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>{active.length}</Text>
              <Text style={styles.statLabel}>{t.active}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{completed.length}</Text>
              <Text style={styles.statLabel}>{t.completed}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {totalSpent > 0 ? `${totalSpent.toLocaleString('ru')} ₽` : '—'}
              </Text>
              <Text style={styles.statLabel}>{t.spent}</Text>
            </View>
          </View>

          {/* ACTIVE ORDER */}
          {activeTask ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.activeOrder}</Text>
                {active.length > 1 && (
                  <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                    <Text style={styles.seeAll}>{t.allOrders.replace('→', '')} {active.length} →</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.activeCard}
                onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: activeTask.id } })}
                activeOpacity={0.85}
              >
                <View style={styles.activeTop}>
                  <View style={[styles.catBadge, { backgroundColor: COLORS.primaryGlow }]}>
                    <Text style={[styles.catBadgeText, { color: COLORS.primary }]}>
                      {CATEGORIES.find(c => c.key === activeTask.category)?.label ?? 'Заказ'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: COLORS.primaryGlow }]}>
                    <View style={[styles.statusDot, { backgroundColor: COLORS.primary }]} />
                    <Text style={[styles.statusText, { color: COLORS.primary }]}>
                      {stepLabels[getStepIndex(activeTask.state)]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.activeTitle} numberOfLines={2}>
                  {activeTask.item_description ?? 'Заказ'}
                </Text>
                {activeTask.to_location?.address && (
                  <Text style={styles.activeAddr} numberOfLines={1}>
                    {activeTask.to_location.address}
                  </Text>
                )}
                <ProgressBar state={activeTask.state} accent={COLORS.primary} labels={stepLabels} />
                <View style={styles.activeFooter}>
                  {activeTask.price_final ? (
                    <Text style={styles.activePrice}>{activeTask.price_final} ₽</Text>
                  ) : <View />}
                  <Text style={[styles.openLink, { color: COLORS.primary }]}>
                    {t.orderDetails} →
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyActiveCard}
              onPress={() => router.push('/(client)/create')}
              activeOpacity={0.85}
            >
              <View style={[styles.emptyIconCircle, { backgroundColor: COLORS.primaryGlow }]}>
                <Text style={[styles.emptyIcon, { color: COLORS.primary }]}>+</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>{t.noActiveOrders}</Text>
                <Text style={styles.emptySub}>{t.tapToCreate}</Text>
              </View>
              <Text style={[styles.openLink, { color: COLORS.primary }]}>→</Text>
            </TouchableOpacity>
          )}

          {/* HISTORY */}
          {recent.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.history}</Text>
                <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                  <Text style={styles.seeAll}>{t.allOrders}</Text>
                </TouchableOpacity>
              </View>
              {recent.map((task: any) => {
                const cat = CATEGORIES.find(c => c.key === task.category);
                const isActive = ['published','accepted','in_progress','pending_client'].includes(task.state);
                const stepIdx  = getStepIndex(task.state);
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
                    <View style={[styles.historyStatus, { backgroundColor: isActive ? COLORS.primaryGlow : COLORS.bgElevated }]}>
                      <Text style={[styles.historyStatusText, { color: isActive ? COLORS.primary : COLORS.textMuted }]}>
                        {stepLabels[stepIdx]}
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

function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
    safe:   { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    header:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
    greeting:  { fontSize: 12, color: C.textMuted, fontWeight: '500', marginBottom: 1 },
    name:      { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    avatarBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    avatarText:{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 },

    // Language selector
    langBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bgLayer, borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: C.border },
    langBtnText:     { fontSize: 12, fontWeight: '700', color: C.text },
    langChevron:     { fontSize: 8, color: C.textMuted },
    langDropdown:    { position: 'absolute', top: 42, right: 0, backgroundColor: C.bgLayer, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, zIndex: 999, overflow: 'hidden', ...SHADOW.md },
    langOption:      { paddingHorizontal: 16, paddingVertical: 10 },
    langOptionActive:{ backgroundColor: C.primaryGlow },
    langOptionText:  { fontSize: 13, fontWeight: '600', color: C.textMuted },
    langOptionTextActive: { color: C.primary, fontWeight: '700' },

    // Stats
    statsRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgLayer, borderRadius: R.xl, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 28, ...SHADOW.sm },
    statCard:    { flex: 1, alignItems: 'center' },
    statValue:   { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 2 },
    statLabel:   { fontSize: 11, color: C.textMuted, fontWeight: '500' },
    statDivider: { width: 1, height: 32, backgroundColor: C.border },

    // Sections
    section:       { marginBottom: 28 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle:  { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    seeAll:        { fontSize: 14, color: C.primary, fontWeight: '600' },

    // Active order card
    activeCard:    { backgroundColor: C.bgLayer, borderRadius: R.xxl, padding: 20, ...SHADOW.md },
    activeTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    catBadge:      { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 5 },
    catBadgeText:  { fontSize: 12, fontWeight: '700' },
    statusBadge:   { flexDirection: 'row', alignItems: 'center', borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
    statusDot:     { width: 6, height: 6, borderRadius: 3 },
    statusText:    { fontSize: 11, fontWeight: '700' },
    activeTitle:   { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3, marginBottom: 6 },
    activeAddr:    { fontSize: 13, color: C.textMuted, marginBottom: 2 },
    activeFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    activePrice:   { fontSize: 24, fontWeight: '800', color: C.text },
    openLink:      { fontSize: 13, fontWeight: '600' },

    // Empty state
    emptyActiveCard: { backgroundColor: C.bgLayer, borderRadius: R.xxl, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
    emptyIconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    emptyIcon:       { fontSize: 22, fontWeight: '300' },
    emptyTitle:      { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
    emptySub:        { fontSize: 12, color: C.textMuted },

    // History
    historyCard:       { backgroundColor: C.bgLayer, borderRadius: R.xl, flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, gap: 12 },
    historyDot:        { width: 10, height: 10, borderRadius: 5 },
    historyContent:    { flex: 1 },
    historyTitle:      { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 3 },
    historyMeta:       { fontSize: 12, color: C.textMuted },
    historyStatus:     { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
    historyStatusText: { fontSize: 11, fontWeight: '600' },
  });
}
