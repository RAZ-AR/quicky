import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { api } from '../../src/services/api';
import { COLORS, SHADOW } from '../../src/constants/config';

interface ExecutorUser {
  id: string;
  name: string;
  phone: string;
  rating_avg: string;
  rating_count: number;
  completion_rate: string;
  is_online: boolean;
}

export default function ClientExecutorsScreen() {
  const [executors, setExecutors] = useState<ExecutorUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/auth/executors').then(r => setExecutors(r.data.executors ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = executors.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  const renderItem = ({ item }: { item: ExecutorUser }) => (
    <View style={[styles.card, SHADOW.sm]}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
          {item.is_online && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.stats}>⭐ {Number(item.rating_avg).toFixed(1)} · {item.rating_count} отзывов</Text>
          <Text style={styles.rate}>Выполнено: {Math.round(Number(item.completion_rate))}%</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.contactBtn}>
        <Text style={styles.contactBtnText}>Написать</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Исполнители</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по имени..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>Исполнители не найдены</Text>
              <Text style={styles.emptyHint}>Заказ автоматически найдёт ближайшего</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, marginHorizontal: 20, marginBottom: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  list: { paddingHorizontal: 20, paddingBottom: 90 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12, position: 'relative' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.card },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  stats: { fontSize: 13, color: COLORS.textMuted, marginBottom: 2 },
  rate: { fontSize: 12, color: COLORS.textLight },
  contactBtn: { backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  contactBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
