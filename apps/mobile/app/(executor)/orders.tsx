import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '../../src/stores/taskStore';
import { useAuthStore } from '../../src/stores/authStore';
import {
  RADIUS, SHADOW, NEO, CATEGORIES, TASK_STATE_COLORS, TASK_STATE_LABELS,
  type AppColors,
} from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

// ── OrderCard ─────────────────────────────────────────────────────────────────
function OrderCard({ task, isNew, onPress, onAccept, COLORS, styles }: {
  task: any;
  isNew: boolean;
  onPress: () => void;
  onAccept?: () => void;
  COLORS: AppColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  const cat = CATEGORIES.find(c => c.key === task.category) ?? CATEGORIES[CATEGORIES.length - 1];
  const stateLabel = TASK_STATE_LABELS[task.state] ?? task.state;
  const stateColor = TASK_STATE_COLORS[task.state] ?? COLORS.textMuted;

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: cat.dark }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={[styles.iconChip, { backgroundColor: cat.dark + '22' }]}>
          <Ionicons name={cat.icon as any} size={16} color={cat.dark} />
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle} numberOfLines={2}>{task.item_description ?? 'Задание'}</Text>
          <Text style={styles.cardSub}>
            {cat.label}{task.price_final ? ` · ${task.price_final} ₽` : ''}
          </Text>
        </View>
        {isNew && (
          <Text style={styles.cardPrice}>{task.price_final ?? task.price_suggested ?? '?'} ₽</Text>
        )}
      </View>

      <View style={styles.cardBottom}>
        {!isNew && (
          <View style={[styles.badge, { backgroundColor: stateColor + '20' }]}>
            <Text style={[styles.badgeText, { color: stateColor }]}>{stateLabel}</Text>
          </View>
        )}
        {task.to_location?.address && (
          <View style={styles.addrRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.textLight} />
            <Text style={styles.addrText} numberOfLines={1}>{task.to_location.address}</Text>
          </View>
        )}
        {isNew && onAccept && (
          <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: COLORS.executor }]} onPress={onAccept} activeOpacity={0.8}>
            <Text style={styles.acceptBtnText}>Взять</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function ExecutorOrdersScreen() {
  const [segment, setSegment] = useState<'new' | 'my'>('new');
  const [catFilter, setCatFilter] = useState<string>('all');
  const { feed, myTasks, isFeedLoading, isLoading, loadFeed, loadMyTasks, acceptTask } = useTaskStore();
  const { token } = useAuthStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);
  const router = useRouter();

  const refresh = async () => {
    await Promise.all([loadFeed(55.7558, 37.6176), loadMyTasks()]);
  };

  useEffect(() => { refresh(); }, []);

  const displayData = segment === 'new'
    ? (catFilter === 'all' ? feed : feed.filter(t => (t as any).category === catFilter))
    : (catFilter === 'all' ? myTasks : myTasks.filter(t => (t as any).category === catFilter));

  const CATS = [
    { key: 'all', label: 'Все', icon: 'apps-outline', dark: COLORS.textMuted },
    ...CATEGORIES,
  ] as const;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Задания</Text>
        </View>

        {/* Segment: Новые / Мои */}
        <View style={styles.segmentRow}>
          {(['new', 'my'] as const).map(seg => (
            <TouchableOpacity
              key={seg}
              style={[styles.segBtn, segment === seg && styles.segBtnActive]}
              onPress={() => setSegment(seg)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segText, segment === seg && styles.segTextActive]}>
                {seg === 'new'
                  ? `Новые${feed.length > 0 ? ` (${feed.length})` : ''}`
                  : 'Мои задания'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={styles.catContent}
        >
          {CATS.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.catChip,
                catFilter === cat.key && { backgroundColor: COLORS.executor + '22', borderColor: COLORS.executor },
              ]}
              onPress={() => setCatFilter(cat.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={cat.icon as any}
                size={13}
                color={catFilter === cat.key ? COLORS.executor : COLORS.textMuted}
              />
              <Text style={[styles.catLabel, catFilter === cat.key && { color: COLORS.executor, fontWeight: '700' }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List */}
        <FlatList
          data={displayData as any[]}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <OrderCard
              task={item}
              isNew={segment === 'new'}
              onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } })}
              onAccept={segment === 'new' ? async () => {
                try {
                  await acceptTask(item.id);
                  router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } });
                } catch {}
              } : undefined}
              COLORS={COLORS}
              styles={styles}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFeedLoading || isLoading}
              onRefresh={refresh}
              tintColor={COLORS.executor}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {segment === 'new' ? 'Нет доступных заданий' : 'Нет активных заданий'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    },
    title: { flex: 1, fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.6 },

    // Segment
    segmentRow: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: C.bgLayer,
      borderRadius: RADIUS.xl,
      padding: 4,
      gap: 4,
      ...(isDark ? SHADOW.sm : NEO.card),
    },
    segBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: RADIUS.lg,
    },
    segBtnActive: {
      backgroundColor: C.executor,
      ...(isDark ? SHADOW.sm : NEO.btn),
    },
    segText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
    segTextActive: { color: '#fff', fontWeight: '700' },

    // Category scroll
    catScroll:   { flexGrow: 0, marginBottom: 10 },
    catContent:  { paddingHorizontal: 20, gap: 8 },
    catChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: RADIUS.full,
      borderWidth: 1.5, borderColor: C.border,
      backgroundColor: C.bgLayer,
    },
    catLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted },

    // List
    list: { paddingHorizontal: 20, paddingBottom: 120 },

    // Card
    card: {
      backgroundColor: C.bgLayer,
      borderRadius: 16,
      borderLeftWidth: 4,
      borderLeftColor: 'transparent',
      marginBottom: 10,
      padding: 14,
      gap: 8,
      ...(isDark ? SHADOW.sm : {
        shadowColor: '#9BA3BC',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.40,
        shadowRadius: 10,
        elevation: 8,
      }),
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    iconChip: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    cardMeta:  { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 2 },
    cardSub:   { fontSize: 12, color: C.textMuted },
    cardPrice: { fontSize: 16, fontWeight: '800', color: C.text },

    cardBottom: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    badge:      { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText:  { fontSize: 11, fontWeight: '600' },

    addrRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    addrText: { fontSize: 11, color: C.textLight, flex: 1 },

    acceptBtn: {
      borderRadius: RADIUS.md,
      paddingVertical: 8, paddingHorizontal: 16,
      alignItems: 'center', marginLeft: 'auto',
    },
    acceptBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    // Empty
    empty:     { alignItems: 'center', paddingTop: 80 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.text, marginTop: 12 },
  });
}
