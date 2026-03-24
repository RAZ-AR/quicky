import { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTaskStore } from '../../src/stores/taskStore';
import { COLORS, SHADOW, TASK_STATE_COLORS, TASK_STATE_LABELS } from '../../src/constants/config';
import type { Task } from '../../src/services/api';

export default function ClientTasksTab() {
  const router = useRouter();
  const { myTasks, isLoading, loadMyTasks } = useTaskStore();

  useEffect(() => { loadMyTasks(); }, []);

  const renderItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[styles.card, SHADOW.sm]}
      onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.item_description ?? 'Заказ'}</Text>
        <View style={[styles.badge, { backgroundColor: TASK_STATE_COLORS[item.state] + '20' }]}>
          <Text style={[styles.badgeText, { color: TASK_STATE_COLORS[item.state] }]}>
            {TASK_STATE_LABELS[item.state] ?? item.state}
          </Text>
        </View>
      </View>
      <Text style={styles.cardAddr} numberOfLines={1}>📍 {item.to_location?.address ?? '—'}</Text>
      {item.price_final && <Text style={styles.cardPrice}>{item.price_final} ₽</Text>}
      <Text style={styles.cardDate}>{new Date(item.created_at ?? '').toLocaleDateString('ru')}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои заказы</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/(client)/voice')}
        >
          <Text style={styles.newBtnText}>+ Новый</Text>
        </TouchableOpacity>
      </View>

      {isLoading && myTasks.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={myTasks}
          keyExtractor={t => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadMyTasks} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Заказов пока нет</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(client)/voice')}>
                <Text style={styles.emptyBtnText}>Создать первый заказ</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.text },
  newBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 90 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardAddr: { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  cardPrice: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  cardDate: { fontSize: 12, color: COLORS.textLight },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 20 },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
