import { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTaskStore } from '../../src/stores/taskStore';
import { COLORS, RADIUS, GRADIENTS, TASK_STATE_COLORS, TASK_STATE_LABELS } from '../../src/constants/config';
import type { Task } from '../../src/services/api';

export default function ClientTasksTab() {
  const router = useRouter();
  const { myTasks, isLoading, loadMyTasks } = useTaskStore();

  useEffect(() => { loadMyTasks(); }, []);

  const renderItem = ({ item }: { item: Task }) => {
    const stateColor = TASK_STATE_COLORS[item.state] ?? COLORS.primary;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: item.id } })}
        activeOpacity={0.85}
      >
        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.cardBg} />
        <View style={[styles.cardAccent, { backgroundColor: stateColor }]} />
        <View style={{ position: 'relative', padding: 16 }}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.item_description ?? 'Заказ'}</Text>
            <View style={[styles.badge, { backgroundColor: stateColor + '20', borderColor: stateColor + '40' }]}>
              <Text style={[styles.badgeText, { color: stateColor }]}>{TASK_STATE_LABELS[item.state] ?? item.state}</Text>
            </View>
          </View>
          <Text style={styles.cardAddr} numberOfLines={1}>📍 {item.to_location?.address ?? '—'}</Text>
          {item.price_final && <Text style={styles.cardPrice}>{item.price_final} ₽</Text>}
          <Text style={styles.cardDate}>{new Date(item.created_at ?? '').toLocaleDateString('ru')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Мои заказы</Text>
          <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(client)/voice')} activeOpacity={0.85}>
            <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
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
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadMyTasks} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>Заказов пока нет</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(client)/voice')} activeOpacity={0.85}>
                  <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
                  <Text style={styles.emptyBtnText}>Создать первый заказ</Text>
                </TouchableOpacity>
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
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(139,92,246,0.12)',
  },

  header:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title:    { flex: 1, fontSize: 24, fontWeight: '800', color: COLORS.text },
  newBtn:   { borderRadius: RADIUS.full, overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 9 },
  newBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14, position: 'relative' },

  list: { paddingHorizontal: 16, paddingBottom: 100 },

  card:   { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 10 },
  cardBg: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  cardAccent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderRadius: 2 },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  cardTitle:  { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  badge:      { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeText:  { fontSize: 12, fontWeight: '600' },
  cardAddr:   { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  cardPrice:  { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  cardDate:   { fontSize: 12, color: COLORS.textLight },

  empty:       { alignItems: 'center', paddingTop: 80 },
  emptyIcon:   { fontSize: 48, marginBottom: 16 },
  emptyText:   { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 20 },
  emptyBtn:    { borderRadius: RADIUS.xl, overflow: 'hidden', paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText:{ color: '#fff', fontWeight: '700', fontSize: 15, position: 'relative' },
});
