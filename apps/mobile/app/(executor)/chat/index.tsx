/**
 * Chat list — список активных чатов по задачам
 */
import React, { useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '../../../src/stores/taskStore';
import {
  RADIUS, SHADOW, NEO, CATEGORIES, TASK_STATE_LABELS, type AppColors,
} from '../../../src/constants/config';
import { useAppTheme } from '../../../src/hooks/useAppTheme';

// ── Mock last-messages per task ───────────────────────────────────────────────
const MOCK_LAST: Record<string, { text: string; fromClient: boolean; time: string }> = {
  'my-1': { text: 'Молоко 3.2% пожалуйста 🙏',       fromClient: true,  time: new Date(Date.now() - 600000).toISOString() },
  'my-2': { text: 'Принял, выдвигаюсь',               fromClient: false, time: new Date(Date.now() - 7100000).toISOString() },
};

function formatTime(iso: string): string {
  const d    = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)    return 'только что';
  if (diff < 3600)  return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ChatListScreen() {
  const { myTasks, isLoading, loadMyTasks, setActiveTask } = useTaskStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);
  const router = useRouter();

  useEffect(() => { loadMyTasks(); }, []);

  const activeTasks = myTasks.length > 0
    ? myTasks.filter(t => ['accepted', 'in_progress', 'pending_client'].includes(t.state))
    : [
        { id: 'my-1', state: 'in_progress', category: 'shopping', item_description: 'Купить продукты в Пятёрочке', price_final: 450 },
        { id: 'my-2', state: 'accepted',    category: 'delivery',  item_description: 'Доставить посылку из СДЭК',  price_final: 600 },
      ] as any[];

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>

        <View style={styles.header}>
          <Text style={styles.title}>Сообщения</Text>
          {activeTasks.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeTasks.length}</Text>
            </View>
          )}
        </View>

        <FlatList
          data={activeTasks}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadMyTasks} tintColor={COLORS.executor} />
          }
          renderItem={({ item }) => {
            const cat     = CATEGORIES.find(c => c.key === item.category) ?? CATEGORIES[CATEGORIES.length - 1];
            const last    = MOCK_LAST[item.id];
            const unread  = last?.fromClient;

            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  setActiveTask(item);
                  router.push({ pathname: '/(executor)/chat/[taskId]', params: { taskId: item.id } });
                }}
                activeOpacity={0.8}
              >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: cat.dark + '25' }]}>
                  <Ionicons name={cat.icon as any} size={20} color={cat.dark} />
                  {unread && <View style={[styles.unreadDot, { backgroundColor: COLORS.executor }]} />}
                </View>

                {/* Meta */}
                <View style={styles.meta}>
                  <View style={styles.topRow}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{item.item_description ?? 'Задание'}</Text>
                    {last && <Text style={styles.timeText}>{formatTime(last.time)}</Text>}
                  </View>
                  <View style={styles.bottomRow}>
                    <Text
                      style={[styles.preview, unread && { color: COLORS.text, fontWeight: '600' }]}
                      numberOfLines={1}
                    >
                      {last
                        ? (last.fromClient ? last.text : `Вы: ${last.text}`)
                        : 'Нет сообщений — начните диалог'}
                    </Text>
                  </View>
                  <View style={[styles.statePill, { backgroundColor: COLORS.executor + '18' }]}>
                    <Text style={[styles.stateText, { color: COLORS.executor }]}>
                      {TASK_STATE_LABELS[item.state] ?? item.state}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Нет активных чатов</Text>
              <Text style={styles.emptySub}>Чаты появляются при принятии задания или когда клиент пишет первым</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },

    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    },
    title:     { flex: 1, fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.6 },
    badge:     { backgroundColor: C.executor, borderRadius: RADIUS.full, minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    badgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },

    list: { paddingHorizontal: 16, paddingBottom: 120 },

    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: C.bgLayer, borderRadius: RADIUS.xl,
      padding: 14, marginBottom: 10,
      ...(isDark ? SHADOW.sm : NEO.card),
    },
    avatar: {
      width: 52, height: 52, borderRadius: 26,
      alignItems: 'center', justifyContent: 'center',
    },
    unreadDot: {
      position: 'absolute', top: 1, right: 1,
      width: 13, height: 13, borderRadius: 7,
      borderWidth: 2, borderColor: C.bg,
    },

    meta:      { flex: 1, gap: 3 },
    topRow:    { flexDirection: 'row', alignItems: 'center' },
    taskTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
    timeText:  { fontSize: 12, color: C.textMuted },
    bottomRow: { flexDirection: 'row', alignItems: 'center' },
    preview:   { flex: 1, fontSize: 13, color: C.textMuted },
    statePill: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
    stateText: { fontSize: 11, fontWeight: '700' },

    empty:      { alignItems: 'center', paddingTop: 100, gap: 12, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
    emptySub:   { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  });
}
