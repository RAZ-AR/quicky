import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTaskStore } from '../../../src/stores/taskStore';
import { getSocket, joinTaskRoom, leaveTaskRoom } from '../../../src/services/socket';
import { useAuthStore } from '../../../src/stores/authStore';
import { COLORS, RADIUS, GRADIENTS, TASK_STATE_COLORS, TASK_STATE_LABELS } from '../../../src/constants/config';
import type { ProblemData } from '../../../src/stores/taskStore';

const PROBLEM_TYPES = [
  { key: 'item_not_available', label: '🚫 Товар недоступен' },
  { key: 'need_clarification', label: '❓ Нужно уточнение' },
  { key: 'price_change',       label: '💰 Изменение цены' },
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
      socket.on('task_state_changed', ({ task_id }: any) => { if (task_id === id) loadTask(id); });
      socket.on('client_response',    ({ task_id }: any) => { if (task_id === id) loadTask(id); });
      socket.on('timeout_warning',    ({ task_id }: any) => { if (task_id === id) Alert.alert('⏰ Внимание', 'Клиент скоро не ответит'); });
      return () => { leaveTaskRoom(id); socket.off('task_state_changed'); socket.off('client_response'); socket.off('timeout_warning'); };
    }
  }, [id]);

  const withProcessing = async (fn: () => Promise<void>) => {
    setIsProcessing(true);
    try { await fn(); }
    catch (e: unknown) { Alert.alert('Ошибка', (e as Error).message ?? 'Что-то пошло не так'); }
    finally { setIsProcessing(false); }
  };

  const handleAccept   = () => withProcessing(() => acceptTask(id));
  const handleStart    = () => withProcessing(() => startTask(id));
  const handleComplete = () => Alert.alert('Задание выполнено?', 'Подтвердите завершение', [
    { text: 'Нет', style: 'cancel' },
    { text: 'Да, завершить', onPress: () => withProcessing(async () => {
      await completeTask(id);
      router.replace({ pathname: '/(shared)/rating', params: { taskId: id, rateeId: activeTask!.client_id } });
    })},
  ]);
  const handleReportProblem = (type: ProblemData['problem_type']) => {
    setShowProblemModal(false);
    withProcessing(() => reportProblem(id, { problem_type: type }));
  };
  const handleCancel = () => Alert.alert('Отказаться от задания?', '', [
    { text: 'Нет', style: 'cancel' },
    { text: 'Да', style: 'destructive', onPress: () => withProcessing(async () => {
      await cancelTask(id, 'Исполнитель отказался'); router.back();
    })},
  ]);

  if (isLoading) return (
    <View style={styles.root}>
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <ActivityIndicator size="large" color={COLORS.executor} style={styles.loader} />
    </View>
  );

  const task = activeTask;
  if (!task) return null;
  const stateColor = TASK_STATE_COLORS[task.state] ?? COLORS.executor;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.backBtnBg} />
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Задание</Text>
          <View style={[styles.stateBadge, { backgroundColor: stateColor + '20', borderColor: stateColor + '40' }]}>
            <Text style={[styles.stateBadgeText, { color: stateColor }]}>{TASK_STATE_LABELS[task.state]}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Price hero */}
          <View style={styles.priceCard}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(6,182,212,0.35)', 'rgba(139,92,246,0.20)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.priceBorder} />
            <View style={{ position: 'relative', padding: 24, alignItems: 'center' }}>
              <Text style={styles.priceAmount}>{task.price_final ?? '—'} ₽</Text>
              <Text style={styles.priceMethod}>
                {task.payment_method === 'cash' ? '💵 Наличные' : '💳 Карта'}
              </Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.card}>
            <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.cardBg} />
            <View style={{ position: 'relative', padding: 20 }}>
              <DetailRow label="📦 Что нужно"       value={task.item_description ?? '—'} />
              <DetailRow label="📍 Куда доставить"  value={task.to_location?.address ?? '—'} />
              {task.from_location && <DetailRow label="🏪 Откуда забрать" value={task.from_location.address} />}
              {task.notes && <DetailRow label="📝 Примечания" value={task.notes} last />}
            </View>
          </View>

          {/* Actions */}
          {task.state === 'published' && (
            <GlassButton
              label={isProcessing ? 'Принимаем...' : '✓ Принять задание'}
              gradient={GRADIENTS.success}
              onPress={handleAccept}
              disabled={isProcessing}
            />
          )}

          {task.state === 'accepted' && (
            <GlassButton
              label={isProcessing ? 'Запускаем...' : '🚀 Начать выполнение'}
              gradient={GRADIENTS.executor}
              onPress={handleStart}
              disabled={isProcessing}
            />
          )}

          {task.state === 'in_progress' && (
            <>
              <GlassButton
                label={isProcessing ? '...' : '✅ Задание выполнено'}
                gradient={GRADIENTS.success}
                onPress={handleComplete}
                disabled={isProcessing}
              />
              <TouchableOpacity
                style={[styles.ghostBtn, isProcessing && { opacity: 0.5 }]}
                onPress={() => setShowProblemModal(true)}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[styles.ghostBtnBg, { backgroundColor: COLORS.warningGlow, borderColor: COLORS.warning + '50' }]} />
                <Text style={[styles.ghostBtnText, { color: COLORS.warning }]}>⚠️ Сообщить о проблеме</Text>
              </TouchableOpacity>
            </>
          )}

          {task.state === 'pending_client' && (
            <View style={styles.waitingCard}>
              <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[styles.cardBg, { backgroundColor: COLORS.warningGlow }]} />
              <View style={{ position: 'relative', padding: 20, alignItems: 'center' }}>
                <Text style={styles.waitingText}>⏳ Ожидаем ответа клиента...</Text>
                <Text style={styles.waitingHint}>Если клиент не ответит — задание отменится</Text>
              </View>
            </View>
          )}

          {['published', 'accepted'].includes(task.state) && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
              <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.cancelBtnBg} />
              <Text style={styles.cancelBtnText}>Отказаться</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Problem modal */}
      <Modal visible={showProblemModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.modalBg} />
            <View style={{ position: 'relative', padding: 24 }}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Тип проблемы</Text>
              {PROBLEM_TYPES.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={styles.modalOption}
                  onPress={() => handleReportProblem(p.key)}
                  activeOpacity={0.8}
                >
                  <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={styles.modalOptionBg} />
                  <Text style={styles.modalOptionText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setShowProblemModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function GlassButton({ label, gradient, onPress, disabled }: {
  label: string; gradient: readonly string[]; onPress: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <LinearGradient colors={gradient as any} style={StyleSheet.absoluteFill} />
      <Text style={styles.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  safe:   { flex: 1 },
  loader: { flex: 1, justifyContent: 'center' as const },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },

  glowTop: { position: 'absolute', top: -80, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(6,182,212,0.15)' },

  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  backBtn:       { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  backBtnBg:     { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: 19, borderWidth: 1, borderColor: COLORS.glassBorder },
  backIcon:      { color: COLORS.text, fontSize: 18, position: 'relative' },
  headerTitle:   { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text },
  stateBadge:    { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  stateBadgeText:{ fontSize: 12, fontWeight: '700' },

  priceCard:  { borderRadius: RADIUS.xxl, overflow: 'hidden', marginBottom: 12 },
  priceBorder:{ ...StyleSheet.absoluteFillObject, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: COLORS.glassBorder },
  priceAmount:{ fontSize: 44, fontWeight: '800', color: COLORS.text },
  priceMethod:{ fontSize: 15, color: COLORS.textMuted, marginTop: 4 },

  card:     { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 12 },
  cardBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },

  row:        { flexDirection: 'row', paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  rowLabel:   { flex: 1, fontSize: 14, color: COLORS.textMuted },
  rowValue:   { flex: 2, fontSize: 14, fontWeight: '500', color: COLORS.text },

  actionBtn:     { borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', position: 'relative' },

  ghostBtn:    { borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  ghostBtnBg:  { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS.xl, borderWidth: 1 },
  ghostBtnText:{ fontSize: 15, fontWeight: '600', position: 'relative' },

  waitingCard: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 12 },
  waitingText: { fontSize: 16, fontWeight: '600', color: COLORS.warning, marginBottom: 6 },
  waitingHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  cancelBtn:     { borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  cancelBtnBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.danger + '40' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.danger, position: 'relative' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  modalBg:      { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bgLayer, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: COLORS.glassBorder },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.glassBorder, alignSelf: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalOption:  { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 8 },
  modalOptionBg:{ ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder },
  modalOptionText:{ fontSize: 16, color: COLORS.text, padding: 16, position: 'relative' },
  modalCancel:  { padding: 16, alignItems: 'center' },
  modalCancelText:{ color: COLORS.textMuted, fontSize: 15 },
});
