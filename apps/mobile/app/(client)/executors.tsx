import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { api } from '../../src/services/api';
import { COLORS, RADIUS, GRADIENTS } from '../../src/constants/config';

interface ExecutorUser {
  id: string; name: string; phone: string;
  rating_avg: string; rating_count: number;
  completion_rate: string; is_online: boolean;
}

export default function ClientExecutorsScreen() {
  const [executors, setExecutors] = useState<ExecutorUser[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/auth/executors')
      .then(r => setExecutors(r.data.executors ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = executors.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  const renderItem = ({ item }: { item: ExecutorUser }) => (
    <View style={styles.card}>
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.cardBg} />
      <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <LinearGradient colors={GRADIENTS.executor} style={StyleSheet.absoluteFill} />
          <View style={styles.avatarBorder} />
          <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
          {item.is_online && <View style={styles.onlineDot} />}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.stats}>⭐ {Number(item.rating_avg).toFixed(1)} · {item.rating_count} отзывов</Text>
          <Text style={styles.rate}>Выполнено: {Math.round(Number(item.completion_rate))}%</Text>
        </View>

        <TouchableOpacity style={styles.contactBtn} activeOpacity={0.85}>
          <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.contactBtnBg} />
          <Text style={styles.contactBtnText}>Написать</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Исполнители</Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.searchBg} />
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
            showsVerticalScrollIndicator={false}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  glowTop: {
    position: 'absolute', top: -40, left: '20%',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(6,182,212,0.10)',
  },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title:  { fontSize: 24, fontWeight: '800', color: COLORS.text },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, borderRadius: RADIUS.xl, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 4 },
  searchBg:    { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 10, position: 'relative' },

  list: { paddingHorizontal: 16, paddingBottom: 100 },

  card:   { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 8 },
  cardBg: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },

  avatarWrap:  { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarBorder:{ ...StyleSheet.absoluteFillObject, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: 18, position: 'relative' },
  onlineDot:   { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.bg },

  info:  { flex: 1 },
  name:  { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  stats: { fontSize: 13, color: COLORS.textMuted, marginBottom: 2 },
  rate:  { fontSize: 12, color: COLORS.textLight },

  contactBtn:    { borderRadius: RADIUS.lg, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 8 },
  contactBtnBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glassViolet, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary + '40' },
  contactBtnText:{ color: COLORS.primaryLight, fontWeight: '600', fontSize: 13, position: 'relative' },

  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
