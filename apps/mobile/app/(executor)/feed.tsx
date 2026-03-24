import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useTaskStore } from '../../src/stores/taskStore';
import { getSocket } from '../../src/services/socket';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS } from '../../src/constants/config';
import type { Task } from '../../src/services/api';

export default function ExecutorFeedScreen() {
  const router = useRouter();
  const { feed, isFeedLoading, loadFeed } = useTaskStore();
  const { user, token, logout } = useAuthStore();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchFeed = async () => {
    let lat = coords?.lat ?? 44.8176;
    let lng = coords?.lng ?? 20.4569; // Белград по умолчанию

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
        setCoords({ lat, lng });
      }
    } catch { /* используем дефолт */ }

    await loadFeed(lat, lng);
  };

  useEffect(() => {
    fetchFeed();

    if (token) {
      const socket = getSocket(token);
      socket.on('task_feed_new', () => fetchFeed());
      socket.on('task_feed_removed', () => fetchFeed());
      return () => {
        socket.off('task_feed_new');
        socket.off('task_feed_removed');
      };
    }
  }, [token]);

  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } })}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.item_description ?? 'Задание'}
        </Text>
        <Text style={styles.cardPrice}>{item.price_final} ₽</Text>
      </View>
      <Text style={styles.cardAddr} numberOfLines={1}>📍 {item.to_location?.address ?? '—'}</Text>
      {item.from_location && (
        <Text style={styles.cardFrom} numberOfLines={1}>🏪 {item.from_location.address}</Text>
      )}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category ?? '—'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.logo}>⚡ Quicky</Text>
        <Text style={styles.greeting}>{user?.name}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Выйти</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>Задания рядом</Text>
        <Text style={styles.feedCount}>{feed.length}</Text>
      </View>

      {isFeedLoading && feed.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFeedLoading} onRefresh={fetchFeed} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>Заданий пока нет</Text>
              <Text style={styles.emptyHint}>Обновите, чтобы проверить снова</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  logo: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  greeting: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  logout: { color: COLORS.textMuted, fontSize: 14 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 },
  feedTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text },
  feedCount: {
    backgroundColor: COLORS.primary, color: '#fff',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    fontSize: 14, fontWeight: '700',
  },
  loader: { marginTop: 60 },
  list: { padding: 16 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text, marginRight: 8 },
  cardPrice: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  cardAddr: { fontSize: 13, color: COLORS.textMuted, marginBottom: 2 },
  cardFrom: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  categoryText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: COLORS.textMuted },
});
