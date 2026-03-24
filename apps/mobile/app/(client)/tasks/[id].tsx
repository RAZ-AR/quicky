import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTaskStore } from '../../../src/stores/taskStore';
import { getSocket, joinTaskRoom, leaveTaskRoom } from '../../../src/services/socket';
import { useAuthStore } from '../../../src/stores/authStore';
import { COLORS, TASK_STATE_LABELS } from '../../../src/constants/config';

export default function ClientTaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTask, loadTask, respondToProblem, cancelTask } = useTaskStore();
  const { token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingMessage, setPendingMessage] = useState<{ id: string; content: string } | null>(null);

  useEffect(() => {
    loadTask(id).finally(() => setIsLoading(false));

    if (token) {
      const socket = getSocket(token);
      joinTaskRoom(id);

      socket.on('task_state_changed', ({ task_id, new_state }) => {
        if (task_id === id) loadTask(id);
      });

      socket.on('new_message', ({ task_id, message }) => {
        if (task_id === id) {
          setPendingMessage({ id: message.id, content: message.content });
          loadTask(id);
        }
      });

      return () => {
        leaveTaskRoom(id);
        socket.off('task_state_changed');
        socket.off('new_message');
      };
    }
  }, [id]);

  const handleRespond = async (response: string) => {
    if (!pendingMessage) return;
    try {
      await respondToProblem(id, pendingMessage.id, response);
      setPendingMessage(null);
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить ответ');
    }
  };

  const handleCancel = () => {
    Alert.alert('Отменить задание?', 'Это действие нельзя отменить', [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Да, отменить',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelTask(id, 'Отменено клиентом');
            router.back();
          } catch {
            Alert.alert('Ошибка', 'Не удалось отменить');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const task = activeTask;
  if (!task) return null;

  const canCancel = ['draft', 'pending_confirm', 'published'].includes(task.state);
  const hasProblem = task.state === 'pending_client';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Задание</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Статус</Text>
          <Text style={[styles.statusValue, { color: COLORS.primary }]}>
            {TASK_STATE_LABELS[task.state] ?? task.state}
          </Text>
        </View>

        <View style={styles.card}>
          <DetailRow label="Что нужно" value={task.item_description ?? '—'} />
          <DetailRow label="Куда доставить" value={task.to_location?.address ?? '—'} />
          {task.from_location && <DetailRow label="Откуда забрать" value={task.from_location.address} />}
          {task.price_final && <DetailRow label="Стоимость" value={`${task.price_final} ₽`} />}
          {task.payment_method && <DetailRow label="Оплата" value={task.payment_method === 'cash' ? 'Наличные' : 'Карта'} />}
        </View>

        {task.executor && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Исполнитель</Text>
            <Text style={styles.executorName}>{task.executor.name}</Text>
            {task.executor.rating_avg && (
              <Text style={styles.executorRating}>⭐ {task.executor.rating_avg.toFixed(1)}</Text>
            )}
          </View>
        )}

        {/* Сообщение от исполнителя о проблеме */}
        {hasProblem && pendingMessage && (
          <View style={styles.problemCard}>
            <Text style={styles.problemTitle}>⚠️ Сообщение от исполнителя</Text>
            <Text style={styles.problemText}>{pendingMessage.content}</Text>
            <View style={styles.problemBtns}>
              <TouchableOpacity
                style={[styles.problemBtn, styles.acceptBtn]}
                onPress={() => handleRespond('accept')}
              >
                <Text style={styles.acceptBtnText}>Принять</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.problemBtn, styles.rejectBtn]}
                onPress={() => handleRespond('reject')}
              >
                <Text style={styles.rejectBtnText}>Отклонить</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Задание завершено — оценить */}
        {task.state === 'completed' && (
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={() => router.push({ pathname: '/(shared)/rating', params: { taskId: id, rateeId: task.executor_id! } })}
          >
            <Text style={styles.rateBtnText}>⭐ Оценить исполнителя</Text>
          </TouchableOpacity>
        )}

        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Отменить задание</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  loader: { marginTop: 60 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { color: COLORS.primary, fontSize: 16, width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  container: { padding: 16 },
  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  statusLabel: { fontSize: 15, color: COLORS.textMuted },
  statusValue: { fontSize: 15, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 8 },
  executorName: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  executorRating: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { flex: 1, fontSize: 14, color: COLORS.textMuted },
  rowValue: { flex: 2, fontSize: 14, fontWeight: '500', color: COLORS.text },
  problemCard: {
    backgroundColor: '#fff7ed', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#f59e0b',
  },
  problemTitle: { fontSize: 16, fontWeight: '700', color: '#b45309', marginBottom: 8 },
  problemText: { fontSize: 15, color: COLORS.text, marginBottom: 16, lineHeight: 22 },
  problemBtns: { flexDirection: 'row', gap: 12 },
  problemBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  acceptBtn: { backgroundColor: '#10b981' },
  rejectBtn: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: '#ef4444' },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rejectBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  rateBtn: {
    backgroundColor: '#f59e0b', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  rateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#ef4444',
  },
  cancelBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
