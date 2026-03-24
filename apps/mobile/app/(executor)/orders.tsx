import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useTaskStore } from '../../src/stores/taskStore';
import { getSocket } from '../../src/services/socket';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS, SHADOW, TASK_STATE_COLORS, TASK_STATE_LABELS } from '../../src/constants/config';
import type { Task } from '../../src/services/api';

const CATEGORIES: Record<string, string> = {
  buy_deliver: 'Купи-привези',
  pickup_drop: 'Забери-отвези',
  simple_errand: 'Поручение',
};

export default function ExecutorOrdersScreen() {
  const router = useRouter();
  const { feed, isFeedLoading, loadFeed, myTasks, loadMyTasks } = useTaskStore();
  const { token } = useAuthStore();
  const [tab, setTab] = useState<'feed' | 'mine'>('feed');

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
      socket.on('task_feed_new', fetchFeed);
      socket.on('task_feed_removed', fetchFeed);
      return () => { socket.off('task_feed_new', fetchFeed); socket.off('task_feed_removed', fetchFeed); };
    }
  }, [token]);

  const activeOrders = myTasks.filter(t => ['accepted', 'in_progress', 'pending_client'].includes(t.state));

  const renderFeedItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[styles.card, SHADOW.sm]}
      onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
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
    </TouchableOpacity>
  );

  const renderMyItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[styles.card, SHADOW.sm]}
      onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.item_description ?? 'Заказ'}</Text>
          <Text style={styles.cardAddr} numberOfLines={1}>📍 {item.to_location?.address ?? '—'}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardPrice}>{item.price_final ?? '—'} ₽</Text>
          <View style={[styles.stateBadge, { backgroundColor: TASK_STATE_COLORS[item.state] + '20' }]}>
            <Text style={[styles.stateBadgeText, { color: TASK_STATE_COLORS[item.state] }]}>{TASK_STATE_LABELS[item.state]}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const data = tab === 'feed' ? feed : activeOrders;
  const isEmpty = data.length === 0 && !isFeedLoading;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Заказы</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{data.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'feed' && styles.tabBtnActive]} onPress={() => setTab('feed')}>
          <Text style={[styles.tabBtnText, tab === 'feed' && styles.tabBtnTextActive]}>Новые</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'mine' && styles.tabBtnActive]} onPress={() => setTab('mine')}>
          <Text style={[styles.tabBtnText, tab === 'mine' && styles.tabBtnTextActive]}>
            Мои {activeOrders.length > 0 ? `(${activeOrders.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {isFeedLoading && data.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={t => t.id}
          renderItem={tab === 'feed' ? renderFeedItem : renderMyItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFeedLoading} onRefresh={fetchFeed} />}
          ListEmptyComponent={isEmpty ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{tab === 'feed' ? '🔍' : '📋'}</Text>
              <Text style={styles.emptyText}>{tab === 'feed' ? 'Заказов рядом нет' : 'Нет активных заказов'}</Text>
            </View>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.text },
  countBadge: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabBtnTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingBottom: 90 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardHeaderLeft: { flex: 1, marginRight: 12 },
  cardRight: { alignItems: 'flex-end' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  cardAddr: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  cardFrom: { fontSize: 12, color: COLORS.textMuted },
  cardPrice: { fontSize: 17, fontWeight: '800', color: COLORS.primary, marginBottom: 6 },
  categoryPill: { backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  stateBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  stateBadgeText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
});
