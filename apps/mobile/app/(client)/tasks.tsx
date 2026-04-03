import { useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import type { Task } from '../../src/services/api';

export default function ClientTasksTab() {
  const router = useRouter();
  const { myTasks, isLoading, loadMyTasks } = useTaskStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  useEffect(() => { loadMyTasks(); }, []);

  const renderItem = ({ item }: { item: Task }) => {
    const stateColor = TASK_STATE_COLORS[item.state] ?? COLORS.textMuted;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: item.id } })}
        activeOpacity={0.8}
      >
        <View style={[styles.stateBar, { backgroundColor: stateColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.item_description ?? 'Заказ'}</Text>
              <Text style={styles.cardAddr} numberOfLines={1}>
                {item.to_location?.address ? `📍 ${item.to_location.address}` : '—'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: stateColor + '18' }]}>
              <Text style={[styles.badgeText, { color: stateColor }]}>
                {TASK_STATE_LABELS[item.state] ?? item.state}
              </Text>
            </View>
          </View>
          <View style={styles.cardBottom}>
            {item.price_final && (
              <Text style={[styles.cardPrice, { color: stateColor }]}>{item.price_final} ₽</Text>
            )}
            <Text style={styles.cardDate}>
              {new Date(item.created_at ?? '').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Мои заказы</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => router.push('/(client)/voice')}
            activeOpacity={0.85}
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
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadMyTasks} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>Заказов пока нет</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(client)/voice')}
                  activeOpacity={0.85}
                >
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

function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },

    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    },
    title: { flex: 1, fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.8 },
    newBtn: {
      borderRadius: R.full,
      backgroundColor: C.primary,
      paddingHorizontal: 18, paddingVertical: 10,
    },
    newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    list: { paddingHorizontal: 16, paddingBottom: 100 },

    card: {
      borderRadius: R.xl, marginBottom: 10,
      backgroundColor: C.glass,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', overflow: 'hidden',
    },
    stateBar: { width: 4, borderTopLeftRadius: R.xl, borderBottomLeftRadius: R.xl },
    cardContent: { flex: 1, padding: 16 },

    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
    badge: { borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    cardAddr: { fontSize: 13, color: C.textMuted, marginTop: 2 },

    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardPrice: { fontSize: 16, fontWeight: '800' },
    cardDate: { fontSize: 12, color: C.textLight },

    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 20 },
    emptyBtn: {
      borderRadius: R.xl,
      backgroundColor: C.primary,
      paddingHorizontal: 24, paddingVertical: 14,
    },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
