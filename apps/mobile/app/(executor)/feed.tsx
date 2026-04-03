import { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useTaskStore } from '../../src/stores/taskStore';
import { getSocket } from '../../src/services/socket';
import { useAuthStore } from '../../src/stores/authStore';
import { RADIUS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import type { Task } from '../../src/services/api';

const CATEGORIES: Record<string, string> = {
  buy_deliver:   'Купи-привези',
  pickup_drop:   'Забери-отвези',
  simple_errand: 'Поручение',
};

export default function ExecutorFeedScreen() {
  const router = useRouter();
  const { feed, isFeedLoading, loadFeed } = useTaskStore();
  const { user, token } = useAuthStore();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  const fetchFeed = async () => {
    let lat = coords?.lat ?? 44.8176;
    let lng = coords?.lng ?? 20.4569;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude; lng = loc.coords.longitude;
        setCoords({ lat, lng });
      }
    } catch {}
    await loadFeed(lat, lng);
  };

  useEffect(() => {
    fetchFeed();
    if (token) {
      const socket = getSocket(token);
      socket.on('task_feed_new',     () => fetchFeed());
      socket.on('task_feed_removed', () => fetchFeed());
      return () => { socket.off('task_feed_new'); socket.off('task_feed_removed'); };
    }
  }, [token]);

  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } })}
      activeOpacity={0.8}
    >
      <View style={[styles.cardAccent, { backgroundColor: COLORS.executor }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.item_description ?? 'Задание'}</Text>
            <Text style={styles.cardAddr} numberOfLines={1}>
              {item.to_location?.address ? `📍 ${item.to_location.address}` : '—'}
            </Text>
            {item.from_location && (
              <Text style={styles.cardFrom} numberOfLines={1}>🏪 {item.from_location.address}</Text>
            )}
          </View>
          <Text style={styles.cardPrice}>{item.price_final} ₽</Text>
        </View>
        <View style={styles.cardBottom}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{CATEGORIES[item.category ?? ''] ?? item.category ?? '—'}</Text>
          </View>
          <Text style={styles.ctaText}>Взять →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Привет, {user?.name?.split(' ')[0] ?? 'Исполнитель'} 👋</Text>
            <Text style={styles.title}>Задания рядом</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{feed.length}</Text>
          </View>
        </View>

        {isFeedLoading && feed.length === 0 ? (
          <ActivityIndicator size="large" color={COLORS.executor} style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={feed}
            keyExtractor={t => t.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isFeedLoading} onRefresh={fetchFeed} tintColor={COLORS.executor} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>Заданий пока нет</Text>
                <Text style={styles.emptyHint}>Потяните вниз, чтобы обновить</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },

    header: {
      flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    },
    greeting: { fontSize: 13, color: C.textMuted, marginBottom: 2, fontWeight: '500' },
    title: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.8 },
    countBadge: {
      borderRadius: R.full,
      backgroundColor: C.executor,
      paddingHorizontal: 14, paddingVertical: 7, minWidth: 38, alignItems: 'center',
    },
    countText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    list: { paddingHorizontal: 16, paddingBottom: 100 },

    card: {
      borderRadius: R.xl, marginBottom: 10,
      backgroundColor: C.glass,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', overflow: 'hidden',
    },
    cardAccent: { width: 4, borderTopLeftRadius: R.xl, borderBottomLeftRadius: R.xl },
    cardContent: { flex: 1, padding: 16 },

    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    cardTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 },
    cardAddr: { fontSize: 13, color: C.textMuted, marginBottom: 2 },
    cardFrom: { fontSize: 13, color: C.textMuted, marginBottom: 2 },
    cardPrice: { fontSize: 20, fontWeight: '800', color: C.executor },

    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    categoryPill: {
      backgroundColor: C.glassCyan,
      borderRadius: R.sm,
      paddingHorizontal: 8, paddingVertical: 3,
    },
    categoryText: { fontSize: 12, color: C.executor, fontWeight: '600' },
    ctaText: { fontSize: 13, color: C.executor, fontWeight: '600' },

    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 8 },
    emptyHint: { fontSize: 14, color: C.textMuted },
  });
}
