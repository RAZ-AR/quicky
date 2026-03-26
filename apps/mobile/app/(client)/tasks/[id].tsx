import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTaskStore } from '../../../src/stores/taskStore';
import { getSocket, joinTaskRoom, leaveTaskRoom } from '../../../src/services/socket';
import { useAuthStore } from '../../../src/stores/authStore';
import { COLORS, RADIUS, GRADIENTS, TASK_STATE_COLORS, TASK_STATE_LABELS } from '../../../src/constants/config';

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
      socket.on('task_state_changed', ({ task_id }: any) => { if (task_id === id) loadTask(id); });
      socket.on('new_message', ({ task_id, message }: any) => {
        if (task_id === id) { setPendingMessage({ id: message.id, content: message.content }); loadTask(id); }
      });
      return () => { leaveTaskRoom(id); socket.off('task_state_changed'); socket.off('new_message'); };
    }
  }, [id]);

  const handleRespond = async (response: string) => {
    if (!pendingMessage) return;
    try { await respondToProblem(id, pendingMessage.id, response); setPendingMessage(null); }
    catch { Alert.alert('Ошибка', 'Не удалось отправить ответ'); }
  };

  const handleCancel = () => {
    Alert.alert('Отменить задание?', 'Это действие нельзя отменить', [
      { text: 'Нет', style: 'cancel' },
      { text: 'Да, отменить', style: 'destructive', onPress: async () => {
        try { await cancelTask(id, 'Отменено клиентом'); router.back(); }
        catch { Alert.alert('Ошибка', 'Не удалось отменить'); }
      }},
    ]);
  };

  if (isLoading) return (
    <View style={styles.root}>
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
    </View>
  );

  const task = activeTask;
  if (!task) return null;

  const stateColor  = TASK_STATE_COLORS[task.state] ?? COLORS.primary;
  const canCancel   = ['draft', 'pending_confirm', 'published'].includes(task.state);
  const hasProblem  = task.state === 'pending_client';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowAccent, { backgroundColor: stateColor + '20' }]} />

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
            <Text style={[styles.stateBadgeText, { color: stateColor }]}>
              {TASK_STATE_LABELS[task.state]}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Info card */}
          <View style={styles.card}>
            <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.cardBg} />
            <View style={{ position: 'relative', padding: 20 }}>
              <DetailRow label="📦 Что нужно"       value={task.item_description ?? '—'} />
              <DetailRow label="📍 Куда доставить"   value={task.to_location?.address ?? '—'} />
              {task.from_location && <DetailRow label="🏪 Откуда забрать" value={task.from_location.address} />}
              {task.price_final   && <DetailRow label="💰 Стоимость"     value={`${task.price_final} ₽`} last />}
              {task.payment_method && <DetailRow label="💳 Оплата" value={task.payment_method === 'cash' ? 'Наличные' : 'Карта'} last />}
            </View>
          </View>

          {/* Executor */}
          {task.executor && (
            <View style={styles.card}>
              <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[styles.cardBg, { backgroundColor: COLORS.glassCyan }]} />
              <View style={{ position: 'relative', padding: 20 }}>
                <Text style={styles.cardLabel}>Исполнитель</Text>
                <View style={styles.executorRow}>
                  <View style={styles.executorAvatar}>
                    <Text style={styles.executorAvatarText}>{task.executor.name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={styles.executorName}>{task.executor.name}</Text>
                    {task.executor.rating_avg && (
                      <Text style={styles.executorRating}>⭐ {task.executor.rating_avg.toFixed(1)}</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Problem from executor */}
          {hasProblem && pendingMessage && (
            <View style={styles.card}>
              <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={[styles.cardBg, { backgroundColor: COLORS.warningGlow }]} />
              <View style={[styles.cardBorderLeft, { borderLeftColor: COLORS.warning }]} />
              <View style={{ position: 'relative', padding: 20 }}>
                <Text style={styles.problemTitle}>⚠️ Сообщение от исполнителя</Text>
                <Text style={styles.problemText}>{pendingMessage.content}</Text>
                <View style={styles.problemBtns}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleRespond('accept')}>
                    <LinearGradient colors={GRADIENTS.success} style={StyleSheet.absoluteFill} />
                    <Text style={styles.actionBtnText}>Принять</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRespond('reject')}>
                    <View style={styles.rejectBtnBg} />
                    <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Отклонить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Rate button */}
          {task.state === 'completed' && (
            <TouchableOpacity
              style={styles.rateBtn}
              onPress={() => router.push({ pathname: '/(shared)/rating', params: { taskId: id, rateeId: task.executor_id! } })}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#F59E0B', '#D97706']} style={StyleSheet.absoluteFill} />
              <Text style={styles.rateBtnText}>⭐ Оценить исполнителя</Text>
            </TouchableOpacity>
          )}

          {/* Cancel */}
          {canCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
              <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.cancelBtnBg} />
              <Text style={styles.cancelBtnText}>Отменить задание</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
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

  glowAccent: { position: 'absolute', top: 80, right: -40, width: 200, height: 200, borderRadius: 100 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  backBtnBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: 19, borderWidth: 1, borderColor: COLORS.glassBorder },
  backIcon:    { color: COLORS.text, fontSize: 18, position: 'relative' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text },
  stateBadge:  { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  stateBadgeText: { fontSize: 12, fontWeight: '700' },

  card:        { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 12 },
  cardBg:      { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  cardBorderLeft: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderRadius: 2 },
  cardLabel:   { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  row:         { flexDirection: 'row', paddingVertical: 10 },
  rowDivider:  { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  rowLabel:    { flex: 1, fontSize: 14, color: COLORS.textMuted },
  rowValue:    { flex: 2, fontSize: 14, fontWeight: '500', color: COLORS.text },

  executorRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  executorAvatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.glassCyan, borderWidth: 1, borderColor: COLORS.executor + '40', alignItems: 'center', justifyContent: 'center' },
  executorAvatarText: { color: COLORS.executorLight, fontWeight: '700', fontSize: 18 },
  executorName:       { fontSize: 16, fontWeight: '600', color: COLORS.text },
  executorRating:     { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

  problemTitle: { fontSize: 15, fontWeight: '700', color: COLORS.warning, marginBottom: 8 },
  problemText:  { fontSize: 15, color: COLORS.text, marginBottom: 16, lineHeight: 22 },
  problemBtns:  { flexDirection: 'row', gap: 10 },
  acceptBtn:    { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', paddingVertical: 13, alignItems: 'center' },
  rejectBtn:    { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', paddingVertical: 13, alignItems: 'center' },
  rejectBtnBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.danger + '50' },
  actionBtnText:{ fontSize: 15, fontWeight: '700', color: '#fff', position: 'relative' },

  rateBtn:     { borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  rateBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', position: 'relative' },

  cancelBtn:    { borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  cancelBtnBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.danger + '40' },
  cancelBtnText:{ fontSize: 15, fontWeight: '600', color: COLORS.danger, position: 'relative' },
});
