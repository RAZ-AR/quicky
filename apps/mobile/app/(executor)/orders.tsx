import { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTaskStore } from '../../src/stores/taskStore';
import { getSocket } from '../../src/services/socket';
import { useAuthStore } from '../../src/stores/authStore';
import { RADIUS, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import type { Task } from '../../src/services/api';

const CATEGORIES: Record<string, string> = {
  buy_deliver:   'Купи-привези',
  pickup_drop:   'Забери-отвези',
  simple_errand: 'Поручение',
};

export default function ExecutorOrdersScreen() {
  const router = useRouter();
  const { feed, isFeedLoading, loadFeed, myTasks, loadMyTasks } = useTaskStore();
  const { token } = useAuthStore();
  const [tab, setTab] = useState<'feed' | 'mine'>('feed');
  const { COLORS, GRADIENTS, isDark, blurTint } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const fetchFeed = async () => {
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
    fetchFeed();
    if (token) {
      const socket = getSocket(token);
      socket.on('task_feed_new',     fetchFeed);
      socket.on('task_feed_removed', fetchFeed);
      return () => { socket.off('task_feed_new', fetchFeed); socket.off('task_feed_removed', fetchFeed); };
    }
  }, [token]);

  const activeOrders = myTasks.filter(t => ['accepted', 'in_progress', 'pending_client'].includes(t.state));
  const data    = tab === 'feed' ? feed : activeOrders;
  const isEmpty = data.length === 0 && !isFeedLoading;

  const renderFeedItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } })}
      activeOpacity={0.85}
    >
      <BlurView intensity={18} tint={blurTint} style={StyleSheet.absoluteFill} />
      <View style={styles.cardBg} />
      {/* Cyan left accent */}
      <View style={styles.cardAccent} />
      <View style={{ position: 'relative', padding: 16 }}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.item_description ?? 'Заказ'}</Text>
            <Text style={styles.cardAddr} numberOfLines={1}>📍 {item.to_location?.address ?? '—'}</Text>
            {item.from_location && <Text style={styles.cardFrom} numberOfLines={1}>🏪 {item.from_location.address}</Text>}
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.cardPrice}>{item.price_final} ₽</Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{CATEGORIES[item.category ?? ''] ?? item.category}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMyItem = ({ item }: { item: Task }) => {
    const stateColor = TASK_STATE_COLORS[item.state] ?? COLORS.executor;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } })}
        activeOpacity={0.85}
      >
        <BlurView intensity={18} tint={blurTint} style={StyleSheet.absoluteFill} />
        <View style={styles.cardBg} />
        <View style={[styles.cardAccent, { backgroundColor: stateColor }]} />
        <View style={{ position: 'relative', padding: 16 }}>
          <View style={styles.cardHeader}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.item_description ?? 'Заказ'}</Text>
              <Text style={styles.cardAddr} numberOfLines={1}>📍 {item.to_location?.address ?? '—'}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.cardPrice, { color: stateColor }]}>{item.price_final ?? '—'} ₽</Text>
              <View style={[styles.stateBadge, { backgroundColor: stateColor + '20', borderColor: stateColor + '40' }]}>
                <Text style={[styles.stateBadgeText, { color: stateColor }]}>{TASK_STATE_LABELS[item.state]}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Заказы</Text>
          <View style={styles.countBadge}>
            <LinearGradient colors={GRADIENTS.executor} style={StyleSheet.absoluteFill} />
            <Text style={styles.countText}>{data.length}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrap}>
          <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
          <View style={styles.tabsBg} />
          <View style={{ position: 'relative', flexDirection: 'row', padding: 4 }}>
            {(['feed', 'mine'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
                activeOpacity={0.8}
              >
                {tab === t && <LinearGradient colors={GRADIENTS.executor} style={StyleSheet.absoluteFill} />}
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'feed' ? 'Новые' : `Мои${activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isFeedLoading && data.length === 0 ? (
          <ActivityIndicator size="large" color={COLORS.executor} style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={t => t.id}
            renderItem={tab === 'feed' ? renderFeedItem : renderMyItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isFeedLoading} onRefresh={fetchFeed} tintColor={COLORS.executor} />
            }
            ListEmptyComponent={isEmpty ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>{tab === 'feed' ? '🔍' : '📋'}</Text>
                <Text style={styles.emptyText}>{tab === 'feed' ? 'Заказов рядом нет' : 'Нет активных заказов'}</Text>
                <Text style={styles.emptyHint}>{tab === 'feed' ? 'Попробуйте позже или расширьте зону' : 'Примите заказ во вкладке Новые'}</Text>
              </View>
            ) : null}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, C_RADIUS = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },
    glowTop: {
      position: 'absolute', top: -60, right: -40,
      width: 200, height: 200, borderRadius: 100,
      backgroundColor: 'rgba(6,182,212,0.12)',
    },

    header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    title:      { flex: 1, fontSize: 24, fontWeight: '800', color: C.text },
    countBadge: { borderRadius: C_RADIUS.full, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 5, minWidth: 34, alignItems: 'center' },
    countText:  { color: '#fff', fontSize: 14, fontWeight: '700', position: 'relative' },

    tabsWrap: { marginHorizontal: 20, borderRadius: C_RADIUS.lg, overflow: 'hidden', marginBottom: 12 },
    tabsBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.lg, borderWidth: 1, borderColor: C.glassBorder },
    tabBtn:   { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: C_RADIUS.md, overflow: 'hidden' },
    tabBtnActive: {},
    tabText:      { fontSize: 14, fontWeight: '600', color: C.textMuted, position: 'relative' },
    tabTextActive:{ color: '#fff' },

    list: { paddingHorizontal: 16, paddingBottom: 100 },

    card:     { borderRadius: C_RADIUS.xl, overflow: 'hidden', marginBottom: 10 },
    cardBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.xl, borderWidth: 1, borderColor: C.glassBorder },
    cardAccent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderRadius: 2, backgroundColor: C.executor },

    cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    cardLeft:   { flex: 1, marginRight: 12 },
    cardRight:  { alignItems: 'flex-end' },
    cardTitle:  { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 },
    cardAddr:   { fontSize: 12, color: C.textMuted, marginBottom: 2 },
    cardFrom:   { fontSize: 12, color: C.textMuted },
    cardPrice:  { fontSize: 18, fontWeight: '800', color: C.executor, marginBottom: 6 },

    categoryPill: { backgroundColor: 'rgba(6,182,212,0.12)', borderRadius: C_RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.executor + '30' },
    categoryText: { fontSize: 11, color: C.executorLight, fontWeight: '600' },

    stateBadge:     { borderRadius: C_RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    stateBadgeText: { fontSize: 11, fontWeight: '600' },

    empty:     { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 8 },
    emptyHint: { fontSize: 14, color: C.textMuted },
  });
}
