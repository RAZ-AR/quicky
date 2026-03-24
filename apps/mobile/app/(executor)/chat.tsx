import { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTaskStore } from '../../src/stores/taskStore';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS, SHADOW, TASK_STATE_COLORS, TASK_STATE_LABELS } from '../../src/constants/config';

export default function ExecutorChatScreen() {
  const router = useRouter();
  const { myTasks, loadMyTasks } = useTaskStore();
  const { user } = useAuthStore();

  useEffect(() => { loadMyTasks(); }, []);

  const chats = myTasks.filter(t => ['accepted', 'in_progress', 'pending_client', 'completed'].includes(t.state));

  const renderItem = ({ item }: { item: any }) => {
    const hasUnread = item.state === 'pending_client';
    return (
      <TouchableOpacity
        style={[styles.chatCard, SHADOW.sm]}
        onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } })}
      >
        <View style={styles.chatAvatar}>
          <Text style={styles.chatAvatarText}>К</Text>
          <View style={[styles.onlineDot, { backgroundColor: item.state === 'in_progress' ? COLORS.success : COLORS.textLight }]} />
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatRow}>
            <Text style={styles.chatName} numberOfLines={1}>{item.item_description ?? 'Заказ'}</Text>
            <Text style={styles.chatTime}>{formatTime(item.created_at)}</Text>
          </View>
          <View style={styles.chatRow}>
            <Text style={styles.chatPreview} numberOfLines={1}>
              📍 {item.to_location?.address ?? '—'}
            </Text>
            {hasUnread && <View style={styles.unreadDot} />}
          </View>
          <View style={[styles.stateBadge, { backgroundColor: TASK_STATE_COLORS[item.state] + '20' }]}>
            <Text style={[styles.stateBadgeText, { color: TASK_STATE_COLORS[item.state] }]}>
              {TASK_STATE_LABELS[item.state]}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Сообщения</Text>
      </View>

      {/* Support chat */}
      <TouchableOpacity style={[styles.supportCard, SHADOW.sm]}>
        <View style={[styles.chatAvatar, { backgroundColor: COLORS.primaryLight }]}>
          <Text style={{ fontSize: 20 }}>🎧</Text>
        </View>
        <View style={styles.chatContent}>
          <Text style={[styles.chatName, { color: COLORS.primary }]}>Поддержка Quicky</Text>
          <Text style={styles.chatPreview}>Мы готовы помочь</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Заказы</Text>

      <FlatList
        data={chats}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>Нет активных чатов</Text>
            <Text style={styles.emptyHint}>Сообщения от клиентов появятся здесь</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  sectionLabel: { paddingHorizontal: 20, paddingBottom: 8, fontSize: 13, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { paddingHorizontal: 20, paddingBottom: 90 },
  supportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, marginHorizontal: 20, marginBottom: 8, borderRadius: 16, padding: 14 },
  chatCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginBottom: 8 },
  chatAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12, position: 'relative' },
  chatAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: COLORS.card },
  chatContent: { flex: 1 },
  chatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  chatName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  chatTime: { fontSize: 12, color: COLORS.textMuted },
  chatPreview: { flex: 1, fontSize: 13, color: COLORS.textMuted },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  stateBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  stateBadgeText: { fontSize: 11, fontWeight: '600' },
  chevron: { fontSize: 22, color: COLORS.textMuted, marginLeft: 8 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: COLORS.textMuted },
});
