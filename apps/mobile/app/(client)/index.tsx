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
  RADIUS, SHADOW, CATEGORIES, TASK_STATE_LABELS,
  type AppColors,
} from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useLang } from '../../src/hooks/useLang';
import type { Lang } from '../../src/i18n/translations';

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_TASKS: any[] = [
  {
    id: 'mock-1', state: 'in_progress',
    item_description: 'Купить продукты: молоко, хлеб, яйца в Пятёрочке на Ленина',
    category: 'shopping',
    from_location: { address: 'Пятёрочка, ул. Ленина, 10' },
    to_location: { address: 'пр. Победы, 45, кв. 12' },
    price_final: 450, payment_method: 'cash',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    executor: { name: 'Алексей К.', rating_avg: 4.8 },
  },
  {
    id: 'mock-2', state: 'completed',
    item_description: 'Доставить посылку из СДЭК в офис',
    category: 'delivery',
    from_location: { address: 'СДЭК, ул. Садовая, 23' },
    to_location: { address: 'БЦ Альфа, пр. Маркса, 1' },
    price_final: 600, created_at: new Date(Date.now() - 86400000).toISOString(),
    executor: { name: 'Мария В.', rating_avg: 4.9 },
  },
  {
    id: 'mock-3', state: 'published',
    item_description: 'Забрать вещи из химчистки и отвезти домой',
    category: 'errand',
    from_location: { address: 'Химчистка Снежинка, ул. Попова, 7' },
    to_location: { address: 'ул. Гагарина, 100, кв. 5' },
    price_final: 350, created_at: new Date(Date.now() - 1800000).toISOString(),
    executor: null,
  },
  {
    id: 'mock-4', state: 'rated',
    item_description: 'Клининг квартиры 2 комнаты',
    category: 'cleaning',
    to_location: { address: 'ул. Мира, 15, кв. 8' },
    price_final: 1800, created_at: new Date(Date.now() - 172800000).toISOString(),
    executor: { name: 'Анна С.', rating_avg: 5.0 },
  },
];

function getStepIndex(state: string): number {
  const map: Record<string, number> = {
    draft: 0, pending_confirm: 0, published: 0,
    accepted: 1, in_progress: 2, pending_client: 3,
    completed: 4, rated: 4,
  };
  return map[state] ?? 0;
}

// ── Tracker (acid dots on dark pill) ─────────────────────────────────────────
function Tracker({ state }: { state: string }) {
  const idx = getStepIndex(state);
  const STEPS = 5;
  return (
    <View style={tr.pill}>
      {Array.from({ length: STEPS }).map((_, i) => {
        const active = i <= idx;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <View style={[tr.line, { backgroundColor: active ? '#D6F24A' : 'rgba(255,255,255,0.12)' }]} />
            )}
            <View style={[
              tr.dot,
              active ? tr.dotFill : tr.dotEmpty,
            ]} />
          </React.Fragment>
        );
      })}
    </View>
  );
}

const tr = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0E0E10', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 0, marginVertical: 14,
  },
  line:    { flex: 1, height: 3, borderRadius: 2 },
  dot:     { width: 22, height: 22, borderRadius: 11 },
  dotFill: { backgroundColor: '#D6F24A' },
  dotEmpty:{ backgroundColor: 'rgba(255,255,255,0.15)' },
});

// ── Language selector ─────────────────────────────────────────────────────────
function LangSelector({ language, setLanguage, C }: {
  language: Lang;
  setLanguage: (l: Lang) => void;
  C: AppColors;
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
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 4,
          backgroundColor: '#fff', borderRadius: 999,
          paddingHorizontal: 12, paddingVertical: 8,
          shadowColor: '#14141A', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
        }}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#14141A' }}>
          {language.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 8, color: 'rgba(20,20,26,0.45)' }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{
          position: 'absolute', top: 44, right: 0,
          backgroundColor: '#fff', borderRadius: 16, zIndex: 999,
          overflow: 'hidden', ...SHADOW.md,
        }}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[
                { paddingHorizontal: 20, paddingVertical: 12 },
                opt.key === language && { backgroundColor: 'rgba(214,242,74,0.2)' },
              ]}
              onPress={() => { setLanguage(opt.key); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: opt.key === language ? '#14141A' : 'rgba(20,20,26,0.52)' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ClientHomeScreen() {
  const router   = useRouter();
  const { user }                     = useAuthStore();
  const { myTasks, loadMyTasks }     = useTaskStore();
  const { COLORS, isDark }           = useAppTheme();
  const { t, language, setLanguage } = useLang();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  useEffect(() => { loadMyTasks(); }, []);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? t.goodMorning : hour < 18 ? t.goodAfternoon : t.goodEvening;
  const firstName = (user?.name ?? 'Клиент').split(' ')[0];

  const tasks     = myTasks.length > 0 ? myTasks : MOCK_TASKS;
  const active    = tasks.filter((tk: any) =>
    ['published', 'accepted', 'in_progress', 'pending_client'].includes(tk.state));
  const completed = tasks.filter((tk: any) =>
    ['completed', 'rated'].includes(tk.state));
  const history   = tasks.slice(0, 8);
  const totalSpent = completed.reduce(
    (sum: number, tk: any) => sum + (Number(tk.price_final) || 0), 0);
  const activeTask = active[0] ?? null;

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
            <LangSelector language={language} setLanguage={setLanguage} C={COLORS} />
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

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#14141A' }]}>{active.length}</Text>
              <Text style={styles.statLabel}>АКТИВНЫХ</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#0E8B4A' }]}>{completed.length}</Text>
              <Text style={styles.statLabel}>ВЫПОЛНЕНО</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#14141A' }]}>
                {totalSpent > 0 ? `${totalSpent.toLocaleString('ru')}₽` : '—'}
              </Text>
              <Text style={styles.statLabel}>ПОТРАЧЕНО</Text>
            </View>
          </View>

          {/* ── Active section header ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.activeOrder}</Text>
            {active.length > 1 && (
              <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                <Text style={styles.seeAll}>{active.length} →</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Active task card ── */}
          {activeTask ? (() => {
            const cat      = CATEGORIES.find(c => c.key === activeTask.category);
            const cardBg   = cat?.color ?? '#F0EDE8';
            const textCol  = cat?.textColor ?? '#14141A';
            const statLabel = TASK_STATE_LABELS[activeTask.state] ?? 'В работе';

            return (
              <TouchableOpacity
                style={[styles.heroCard, { backgroundColor: cardBg }]}
                onPress={() => router.push({
                  pathname: '/(client)/tasks/[id]',
                  params: { id: activeTask.id },
                })}
                activeOpacity={0.88}
              >
                {/* Pills row */}
                <View style={styles.heroTop}>
                  <View style={[styles.pill, { backgroundColor: `${textCol}18` }]}>
                    <Ionicons name={(cat?.icon ?? 'list-outline') as any} size={11} color={textCol} />
                    <Text style={[styles.pillTxt, { color: textCol }]}>{cat?.label ?? 'Заказ'}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: `${textCol}18` }]}>
                    <View style={[styles.dot, { backgroundColor: textCol }]} />
                    <Text style={[styles.pillTxt, { color: textCol }]}>{statLabel}</Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={[styles.heroTitle, { color: textCol }]} numberOfLines={2}>
                  {activeTask.item_description ?? 'Заказ'}
                </Text>

                {/* Address */}
                {activeTask.to_location?.address ? (
                  <View style={styles.addrRow}>
                    <Ionicons name="location-outline" size={12} color={`${textCol}80`} />
                    <Text style={[styles.addrTxt, { color: `${textCol}80` }]} numberOfLines={1}>
                      {activeTask.to_location.address}
                    </Text>
                  </View>
                ) : null}

                {/* Progress tracker */}
                <Tracker state={activeTask.state} />

                {/* Footer */}
                <View style={styles.heroFooter}>
                  <Text style={[styles.heroPrice, { color: textCol }]}>
                    {activeTask.price_final ? `${activeTask.price_final} ₽` : '—'}
                  </Text>
                  <Text style={[styles.heroLink, { color: textCol }]}>Детали →</Text>
                </View>
              </TouchableOpacity>
            );
          })() : (
            /* Empty */
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => router.push('/(client)/create')}
              activeOpacity={0.85}
            >
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyPlus}>+</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>{t.noActiveOrders}</Text>
                <Text style={styles.emptySub}>{t.tapToCreate}</Text>
              </View>
              <Text style={styles.emptyArrow}>→</Text>
            </TouchableOpacity>
          )}

          {/* ── History ── */}
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
                const borderCol  = cat?.color ?? '#E0E0E0';
                const stateLabel = TASK_STATE_LABELS[task.state] ?? task.state;
                const stateOk    = ['completed', 'rated'].includes(task.state);
                const stateWarn  = task.state === 'cancelled';
                const badgeBg    = stateOk ? 'rgba(14,139,74,0.10)' : stateWarn ? 'rgba(217,56,56,0.10)' : 'rgba(20,20,26,0.06)';
                const badgeFg    = stateOk ? '#0E8B4A' : stateWarn ? '#D93838' : '#14141A';

                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.histCard, { borderLeftColor: borderCol }]}
                    onPress={() => router.push({
                      pathname: '/(client)/tasks/[id]',
                      params: { id: task.id },
                    })}
                    activeOpacity={0.78}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.histTitle} numberOfLines={1}>
                        {task.item_description ?? 'Заказ'}
                      </Text>
                      <Text style={styles.histMeta}>
                        {cat?.label ?? 'Заказ'}
                        {task.price_final ? ` · ${task.price_final} ₽` : ''}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.badgeTxt, { color: badgeFg }]}>{stateLabel}</Text>
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

function makeStyles(C: AppColors, isDark: boolean) {
  const card = {
    shadowColor: '#14141A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.30 : 0.06, shadowRadius: 16, elevation: 4,
  };
  return StyleSheet.create({
    root:  { flex: 1, backgroundColor: C.bg },
    safe:  { flex: 1 },
    scroll:{ paddingHorizontal: 20, paddingTop: 8 },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center',
      gap: 10, marginBottom: 24,
    },
    greeting: { fontSize: 13, fontWeight: '500', color: C.textMuted, marginBottom: 2 },
    name:     { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -0.8 },
    avatarBtn:{
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: '#0E0E10',
      alignItems: 'center', justifyContent: 'center',
      ...SHADOW.md,
    },
    avatarText: { color: '#D6F24A', fontWeight: '800', fontSize: 17 },

    // Stats
    statsRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.bgLayer, borderRadius: RADIUS.xl,
      paddingVertical: 18, paddingHorizontal: 20, marginBottom: 32,
      ...card,
    },
    statCell:  { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    statLabel: { fontSize: 9, color: C.textMuted, fontWeight: '700', letterSpacing: 0.5 },
    statDiv:   { width: 1, height: 36, backgroundColor: C.divider },

    // Section header
    sectionHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3,
    },
    seeAll: { fontSize: 14, color: '#0E8B4A', fontWeight: '600' },

    // Hero card
    heroCard: {
      borderRadius: 22, padding: 18,
      shadowColor: '#14141A', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10, shadowRadius: 20, elevation: 8,
    },
    heroTop: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 12,
    },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    },
    pillTxt: { fontSize: 12, fontWeight: '700' },
    dot: { width: 6, height: 6, borderRadius: 3 },
    heroTitle: { fontSize: 17, fontWeight: '700', lineHeight: 23, marginBottom: 6 },
    addrRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addrTxt:   { fontSize: 13, flex: 1 },
    heroFooter:{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    heroPrice: { fontSize: 22, fontWeight: '800' },
    heroLink:  { fontSize: 13, fontWeight: '600' },

    // Empty card
    emptyCard: {
      backgroundColor: C.bgLayer, borderRadius: RADIUS.xxl,
      padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14,
      borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
      ...card,
    },
    emptyIcon: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: 'rgba(214,242,74,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    emptyPlus:  { fontSize: 24, color: '#B6D330', fontWeight: '300' },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
    emptySub:   { fontSize: 12, color: C.textMuted },
    emptyArrow: { fontSize: 18, color: C.text, fontWeight: '600' },

    // History cards
    histCard: {
      backgroundColor: C.bgLayer, borderRadius: 16,
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 16,
      marginBottom: 10, borderLeftWidth: 4,
      ...card,
    },
    histTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 3 },
    histMeta:  { fontSize: 12, color: C.textMuted },
    badge:     { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    badgeTxt:  { fontSize: 11, fontWeight: '600' },
  });
}
