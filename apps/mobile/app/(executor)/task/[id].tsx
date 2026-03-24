import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTaskStore } from '../../../src/stores/taskStore';
import { getSocket, joinTaskRoom, leaveTaskRoom } from '../../../src/services/socket';
import { useAuthStore } from '../../../src/stores/authStore';
import { COLORS, TASK_STATE_LABELS } from '../../../src/constants/config';
import type { ProblemData } from '../../../src/stores/taskStore';

const PROBLEM_TYPES = [
  { key: 'item_not_available', label: '🚫 Товар недоступен' },
  { key: 'need_clarification', label: '❓ Нужно уточнение' },
  { key: 'price_change', label: '💰 Изменение цены' },
] as const;

export default function ExecutorTaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTask, loadTask, acceptTask, startTask, reportProblem, completeTask, cancelTask } = useTaskStore();
  const { token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProblemModal, setShowProblemModal] = useState(false);

  useEffect(() => {
    loadTask(id).finally(() => setIsLoading(false));

    if (token) {
      const socket = getSocket(token);
      joinTaskRoom(id);
      socket.on('task_state_changed', ({ task_id }) => {
        if (task_id === id) loadTask(id);
      });
      socket.on('client_response', ({ task_id }) => {
        if (task_id === id) loadTask(id);
      });
      socket.on('timeout_warning', ({ task_id }) => {
        if (task_id === id) Alert.alert('⏰ Внимание', 'Клиент скоро не ответит — задание будет отменено');
      });
      return () => {
        leaveTaskRoom(id);
        socket.off('task_state_changed');
        socket.off('client_response');
        socket.off('timeout_warning');
      };
    }
  }, [id]);

  const withProcessing = async (fn: () => Promise<void>) => {
    setIsProcessing(true);
    try { await fn(); } catch (e: unknown) {
      Alert.alert('Ошибка', (e as Error).message ?? 'Что-то пошло не так');
    } finally { setIsProcessing(false); }
  };

  const handleAccept = () => withProcessing(async () => {
    await acceptTask(id);
  });

  const handleStart = () => withProcessing(async () => {
    await startTask(id);
  });

  const handleComplete = () => {
    Alert.alert('Задание выполнено?', 'Подтвердите завершение', [
      { text: 'Нет', style: 'cancel' },
      { text: 'Да, завершить', onPress: () => withProcessing(async () => {
        await completeTask(id);
        router.replace({ pathname: '/(shared)/rating', params: { taskId: id, rateeId: activeTask!.client_id } });
      })},
    ]);
  };

  const handleReportProblem = (type: ProblemData['problem_type']) => {
    setShowProblemModal(false);
    withProcessing(async () => {
      await reportProblem(id, { problem_type: type });
    });
  };

  const handleCancel = () => {
    Alert.alert('Отказаться от задания?', '', [
      { text: 'Нет', style: 'cancel' },
      { text: 'Да', style: 'destructive', onPress: () => withProcessing(async () => {
        await cancelTask(id, 'Исполнитель отказался');
        router.back();
      })},
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

        <View style={styles.priceHighlight}>
          <Text style={styles.priceAmount}>{task.price_final ?? '—'} ₽</Text>
          <Text style={styles.priceMethod}>{task.payment_method === 'cash' ? '💵 Наличные' : '💳 Карта'}</Text>
        </View>

        <View style={styles.card}>
          <DetailRow label="Что нужно" value={task.item_description ?? '—'} />
          <DetailRow label="Куда доставить" value={task.to_location?.address ?? '—'} />
          {task.from_location && <DetailRow label="Откуда забрать" value={task.from_location.address} />}
          {task.notes && <DetailRow label="Примечания" value={task.notes} />}
        </View>

        {/* Действия в зависимости от статуса */}
        {task.state === 'published' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn, isProcessing && styles.btnDisabled]}
            onPress={handleAccept}
            disabled={isProcessing}
          >
            <Text style={styles.actionBtnText}>{isProcessing ? 'Принимаем...' : '✓ Принять задание'}</Text>
          </TouchableOpacity>
        )}

        {task.state === 'accepted' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.startBtn, isProcessing && styles.btnDisabled]}
            onPress={handleStart}
            disabled={isProcessing}
          >
            <Text style={styles.actionBtnText}>{isProcessing ? 'Запускаем...' : '🚀 Начать выполнение'}</Text>
          </TouchableOpacity>
        )}

        {task.state === 'in_progress' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn, isProcessing && styles.btnDisabled]}
              onPress={handleComplete}
              disabled={isProcessing}
            >
              <Text style={styles.actionBtnText}>{isProcessing ? '...' : '✅ Задание выполнено'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.problemBtn, isProcessing && styles.btnDisabled]}
              onPress={() => setShowProblemModal(true)}
              disabled={isProcessing}
            >
              <Text style={styles.problemBtnText}>⚠️ Сообщить о проблеме</Text>
            </TouchableOpacity>
          </>
        )}

        {task.state === 'pending_client' && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingText}>⏳ Ожидаем ответа клиента...</Text>
            <Text style={styles.waitingHint}>Если клиент не ответит, задание будет отменено</Text>
          </View>
        )}

        {['published', 'accepted'].includes(task.state) && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Отказаться</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Модалка выбора типа проблемы */}
      <Modal visible={showProblemModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Тип проблемы</Text>
            {PROBLEM_TYPES.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={styles.modalOption}
                onPress={() => handleReportProblem(p.key)}
              >
                <Text style={styles.modalOptionText}>{p.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowProblemModal(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusLabel: { fontSize: 15, color: COLORS.textMuted },
  statusValue: { fontSize: 15, fontWeight: '700' },
  priceHighlight: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    padding: 20, alignItems: 'center', marginBottom: 16,
  },
  priceAmount: { fontSize: 40, fontWeight: '800', color: '#fff' },
  priceMethod: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { flex: 1, fontSize: 14, color: COLORS.textMuted },
  rowValue: { flex: 2, fontSize: 14, fontWeight: '500', color: COLORS.text },
  actionBtn: {
    borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12,
  },
  acceptBtn: { backgroundColor: '#10b981' },
  startBtn: { backgroundColor: COLORS.primary },
  completeBtn: { backgroundColor: '#10b981' },
  problemBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5, borderColor: '#f59e0b',
  },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  problemBtnText: { color: '#b45309', fontSize: 15, fontWeight: '600' },
  waitingCard: {
    backgroundColor: '#fef3c7', borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#f59e0b', alignItems: 'center',
  },
  waitingText: { fontSize: 16, fontWeight: '600', color: '#b45309', marginBottom: 6 },
  waitingHint: { fontSize: 13, color: '#92400e', textAlign: 'center' },
  cancelBtn: {
    borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#ef4444',
  },
  cancelBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalOption: {
    padding: 16, borderRadius: 12,
    backgroundColor: COLORS.card, marginBottom: 8,
  },
  modalOptionText: { fontSize: 16, color: COLORS.text },
  modalCancel: { padding: 16, alignItems: 'center' },
  modalCancelText: { color: COLORS.textMuted, fontSize: 15 },
});
