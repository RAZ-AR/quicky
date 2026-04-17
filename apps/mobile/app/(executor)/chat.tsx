import { useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '../../src/stores/taskStore';
import {
  RADIUS, SHADOW, NEO, CATEGORIES, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors,
} from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function ExecutorChatScreen() {
  const { myTasks, isLoading, loadMyTasks } = useTaskStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);
  const router = useRouter();

  useEffect(() => { loadMyTasks(); }, []);

  const activeTasks = myTasks.filter(t =>
    ['accepted', 'in_progress', 'pending_client'].includes(t.state)
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Задания в работе</Text>
          {activeTasks.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activeTasks.length}</Text>
            </View>
          )}
        </View>

        <FlatList
          data={activeTasks}
          keyExtractor={t => t.id}
          renderItem={({ item }) => {
            const cat        = CATEGORIES.find(c => c.key === item.category) ?? CATEGORIES[CATEGORIES.length - 1];
            const stateColor = TASK_STATE_COLORS[item.state] ?? COLORS.textMuted;
            const stateLabel = TASK_STATE_LABELS[item.state] ?? item.state;
            return (
              <TouchableOpacity
                style={[styles.card, { borderLeftColor: cat.dark, borderLeftWidth: 3 }]}
                onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } })}
                activeOpacity={0.8}
              >
                <View style={[styles.catIcon, { backgroundColor: cat.dark + '22' }]}>
                  <Ionicons name={cat.icon as any} size={18} color={cat.dark} />
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.item_description ?? 'Задание'}
                  </Text>
                  <Text style={styles.cardSub}>
                    {cat.label}{item.price_final ? ` · ${item.price_final} ₽` : ''}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: stateColor + '20' }]}>
                  <Text style={[styles.badgeText, { color: stateColor }]}>{stateLabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadMyTasks}
              tintColor={COLORS.executor}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={52} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Нет активных заданий</Text>
              <Text style={styles.emptySub}>Возьмите задание из ленты</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },

    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    },
    title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5, flex: 1 },
    countBadge: {
      backgroundColor: C.executor,
      borderRadius: R.full,
      minWidth: 26, height: 26,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 6,
    },
    countBadgeText: {
      fontSize: 13, fontWeight: '800',
      color: isDark ? '#0F1F0F' : '#fff',
    },

    list: { paddingHorizontal: 16, paddingBottom: 120 },

    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: C.bgLayer,
      borderRadius: R.xl,
      padding: 14,
      marginBottom: 10,
      ...(isDark ? SHADOW.sm : NEO.card),
    },
    catIcon: {
      width: 44, height: 44, borderRadius: R.md,
      alignItems: 'center', justifyContent: 'center',
    },
    cardMeta: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 3 },
    cardSub:   { fontSize: 13, color: C.textMuted },
    badge: {
      borderRadius: R.full,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    badgeText: { fontSize: 11, fontWeight: '700' },

    empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
    emptyText: { fontSize: 17, fontWeight: '700', color: C.text },
    emptySub:  { fontSize: 14, color: C.textMuted },
  });
}
