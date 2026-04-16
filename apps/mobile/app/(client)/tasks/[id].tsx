import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTaskStore } from '../../../src/stores/taskStore';
import { getSocket, joinTaskRoom, leaveTaskRoom } from '../../../src/services/socket';
import { useAuthStore } from '../../../src/stores/authStore';
import { RADIUS, SHADOW, CATEGORIES, type AppColors } from '../../../src/constants/config';
import { useAppTheme } from '../../../src/hooks/useAppTheme';
import { useLang } from '../../../src/hooks/useLang';

// ── Status bar steps ─────────────────────────────────────────────────────────
function getStepIndex(state: string): number {
  const map: Record<string, number> = {
    draft: 0, pending_confirm: 0, published: 0,
    accepted: 1,
    in_progress: 2,
    pending_client: 3,
    completed: 4, rated: 4,
  };
  return map[state] ?? 0;
}

// Icon shapes for each step (rendered as styled Views, not emoji)
const STEP_ICONS = ['D', 'P', 'T', 'R', 'V'];

function StatusStepBar({ state, accent, labels }: {
  state: string; accent: string; labels: string[];
}) {
  const idx = getStepIndex(state);
  return (
    <View style={ssb.container}>
      {/* Track with dots and lines */}
      <View style={ssb.track}>
        {STEP_ICONS.map((_, i) => (
          <React.Fragment key={i}>
            <View style={ssb.stepCol}>
              {/* Circle */}
              <View style={[
                ssb.circle,
                i < idx  && { backgroundColor: accent },
                i === idx && { backgroundColor: accent, transform: [{ scale: 1.15 }] },
                i > idx  && { backgroundColor: 'transparent', borderWidth: 2, borderColor: 'rgba(28,28,30,0.15)' },
              ]}>
                {i < idx  && <View style={[ssb.checkDot, { backgroundColor: '#fff' }]} />}
                {i === idx && <View style={[ssb.innerDot, { backgroundColor: '#fff' }]} />}
              </View>
              {/* Label below */}
              <Text style={[ssb.stepLabel, { color: i <= idx ? accent : 'rgba(28,28,30,0.35)' }]}
                numberOfLines={1}>
                {labels[i]}
              </Text>
            </View>
            {i < STEP_ICONS.length - 1 && (
              <View style={[ssb.line, i < idx && { backgroundColor: accent }]} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const ssb = StyleSheet.create({
  container:  { paddingVertical: 8 },
  track:      { flexDirection: 'row', alignItems: 'flex-start' },
  stepCol:    { alignItems: 'center', width: 52 },
  circle:     { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(28,28,30,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  checkDot:   { width: 10, height: 10, borderRadius: 5 },
  innerDot:   { width: 8, height: 8, borderRadius: 4 },
  line:       { flex: 1, height: 2, backgroundColor: 'rgba(28,28,30,0.10)', marginTop: 13, marginHorizontal: -2 },
  stepLabel:  { fontSize: 9, fontWeight: '600', textAlign: 'center', letterSpacing: 0.2 },
});

// ── Mock data (duplicated here so detail screen works standalone) ─────────────
const MOCK_TASKS: any[] = [
  {
    id: 'mock-1', state: 'in_progress',
    item_description: 'Купить продукты: молоко, хлеб, яйца в Пятёрочке на Ленина',
    category: 'shopping',
    from_location: { address: 'Пятёрочка, ул. Ленина, 10' },
    to_location:   { address: 'пр. Победы, 45, кв. 12' },
    price_final: 450, payment_method: 'cash',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    executor: { name: 'Алексей К.', rating_avg: 4.8 }, executor_id: 'ex-1',
  },
  {
    id: 'mock-2', state: 'completed',
    item_description: 'Доставить посылку из СДЭК в офис',
    category: 'delivery',
    from_location: { address: 'СДЭК, ул. Садовая, 23' },
    to_location:   { address: 'БЦ "Альфа", пр. Маркса, 1' },
    price_final: 600, payment_method: 'card',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    executor: { name: 'Мария В.', rating_avg: 4.9 }, executor_id: 'ex-2',
  },
  {
    id: 'mock-3', state: 'published',
    item_description: 'Забрать вещи из химчистки и отвезти домой',
    category: 'errand',
    from_location: { address: 'Химчистка "Снежинка", ул. Попова, 7' },
    to_location:   { address: 'ул. Гагарина, 100, кв. 5' },
    price_final: 350, payment_method: 'cash',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    executor: null, executor_id: null,
  },
  {
    id: 'mock-4', state: 'rated',
    item_description: 'Клининг квартиры 2 комнаты',
    category: 'cleaning',
    from_location: null,
    to_location: { address: 'ул. Мира, 15, кв. 8' },
    price_final: 1800, payment_method: 'card',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    executor: { name: 'Анна С.', rating_avg: 5.0 }, executor_id: 'ex-3',
  },
];

// ── Main screen ──────────────────────────────────────────────────────────────
export default function ClientTaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTask, myTasks, loadTask, respondToProblem, cancelTask } = useTaskStore();
  const { token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingMessage, setPendingMessage] = useState<{ id: string; content: string } | null>(null);
  const { COLORS, isDark } = useAppTheme();
  const { t } = useLang();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  useEffect(() => {
    if (id.startsWith('mock-')) {
      setIsLoading(false);
      return;
    }
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
    Alert.alert(t.cancel, 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Да, отменить', style: 'destructive', onPress: async () => {
        try { await cancelTask(id, 'Отменено клиентом'); router.back(); }
        catch { Alert.alert('Ошибка', 'Не удалось отменить'); }
      }},
    ]);
  };

  const task = id.startsWith('mock-')
    ? MOCK_TASKS.find(m => m.id === id)
    : (activeTask ?? myTasks.find((t: any) => t.id === id));

  if (isLoading) return (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  if (!task) return (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: COLORS.textMuted }}>Заказ не найден</Text>
    </View>
  );

  const cat        = CATEGORIES.find(c => c.key === task.category);
  const stepLabels = [t.stepCreated, t.stepHasExecutor, t.stepTaken, t.stepEnRoute, t.stepDelivered];
  const canCancel  = ['draft','pending_confirm','published'].includes(task.state);
  const hasProblem = task.state === 'pending_client';

  const paymentLabel = task.payment_method === 'cash' ? t.cash : t.card;
  const dateStr = task.created_at
    ? new Date(task.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : '—';

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backIcon}>{t.back}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.orderDetails}</Text>
          <View style={[styles.catBadge, { backgroundColor: cat?.color ?? COLORS.primaryGlow }]}>
            <Text style={[styles.catBadgeText, { color: cat?.textColor ?? COLORS.primary }]}>
              {cat?.label ?? 'Заказ'}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Status bar */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t.orderStatus}</Text>
            <StatusStepBar state={task.state} accent={COLORS.primary} labels={stepLabels} />
          </View>

          {/* Details card: what / from / to */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              {cat?.label?.toUpperCase() ?? 'ЗАКАЗ'} · {dateStr}
            </Text>

            {/* What */}
            <View style={styles.detailBlock}>
              <Text style={styles.detailKey}>{t.whatNeeded}</Text>
              <Text style={styles.detailVal}>{task.item_description ?? '—'}</Text>
            </View>

            {/* From */}
            {task.from_location?.address && (
              <View style={[styles.detailBlock, styles.detailBorder]}>
                <Text style={styles.detailKey}>{t.fromWhere}</Text>
                <View style={styles.addrRow}>
                  <View style={[styles.addrDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.detailVal}>{task.from_location.address}</Text>
                </View>
              </View>
            )}

            {/* To */}
            {task.to_location?.address && (
              <View style={[styles.detailBlock, styles.detailBorder]}>
                <Text style={styles.detailKey}>{t.toWhere}</Text>
                <View style={styles.addrRow}>
                  <View style={[styles.addrDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.detailVal}>{task.to_location.address}</Text>
                </View>
              </View>
            )}

            {/* Price & Payment */}
            <View style={[styles.detailRowInline, styles.detailBorder]}>
              <View style={styles.inlineCell}>
                <Text style={styles.detailKey}>{t.price}</Text>
                <Text style={[styles.priceVal, { color: COLORS.primary }]}>
                  {task.price_final ? `${task.price_final} ₽` : '—'}
                </Text>
              </View>
              <View style={[styles.inlineCell, styles.inlineCellRight]}>
                <Text style={styles.detailKey}>{t.payment}</Text>
                <Text style={styles.detailVal}>{paymentLabel}</Text>
              </View>
            </View>
          </View>

          {/* Executor */}
          {task.executor && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t.executor}</Text>
              <View style={styles.executorRow}>
                <View style={[styles.executorAvatar, { backgroundColor: COLORS.glassCyan }]}>
                  <Text style={[styles.executorAvatarText, { color: COLORS.executor }]}>
                    {task.executor.name?.[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.executorName}>{task.executor.name}</Text>
                  {task.executor.rating_avg && (
                    <Text style={styles.executorRating}>
                      {task.executor.rating_avg.toFixed(1)} / 5.0
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Problem from executor */}
          {hasProblem && pendingMessage && (
            <View style={[styles.card, { borderWidth: 1, borderColor: COLORS.warning + '60' }]}>
              <Text style={[styles.cardLabel, { color: COLORS.warning }]}>
                Сообщение от исполнителя
              </Text>
              <Text style={styles.problemText}>{pendingMessage.content}</Text>
              <View style={styles.problemBtns}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                  onPress={() => handleRespond('accept')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionBtnText}>Принять</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: COLORS.dangerGlow, borderWidth: 1, borderColor: COLORS.danger + '50' }]}
                  onPress={() => handleRespond('reject')}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Отклонить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Rate */}
          {(task.state === 'completed' || task.state === 'rated') && task.executor_id && (
            <TouchableOpacity
              style={[styles.rateBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => router.push({ pathname: '/(shared)/rating', params: { taskId: id, rateeId: task.executor_id } })}
              activeOpacity={0.85}
            >
              <Text style={styles.rateBtnText}>{t.rate}</Text>
            </TouchableOpacity>
          )}

          {/* Cancel */}
          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: COLORS.dangerGlow, borderWidth: 1, borderColor: COLORS.danger + '40' }]}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelBtnText, { color: COLORS.danger }]}>{t.cancel}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
    safe:   { flex: 1 },
    scroll: { paddingHorizontal: 16, paddingTop: 8 },

    header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
    backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: C.bgLayer, alignItems: 'center', justifyContent: 'center', ...SHADOW.sm },
    backIcon:    { color: C.text, fontSize: 18, fontWeight: '600' },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: C.text },
    catBadge:    { borderRadius: R.full, paddingHorizontal: 12, paddingVertical: 5 },
    catBadgeText:{ fontSize: 12, fontWeight: '700' },

    card:        { backgroundColor: C.bgLayer, borderRadius: R.xl, padding: 18, marginBottom: 12, ...SHADOW.sm },
    cardLabel:   { fontSize: 11, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

    // Detail rows
    detailBlock:       { paddingVertical: 12 },
    detailBorder:      { borderTopWidth: 1, borderTopColor: C.divider },
    detailKey:         { fontSize: 12, color: C.textMuted, fontWeight: '500', marginBottom: 6 },
    detailVal:         { fontSize: 15, fontWeight: '600', color: C.text, lineHeight: 22, flex: 1 },
    addrRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    addrDot:           { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
    detailRowInline:   { flexDirection: 'row', paddingVertical: 12 },
    inlineCell:        { flex: 1 },
    inlineCellRight:   { borderLeftWidth: 1, borderLeftColor: C.divider, paddingLeft: 16 },
    priceVal:          { fontSize: 22, fontWeight: '800', marginTop: 2 },

    // Executor
    executorRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
    executorAvatar:     { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    executorAvatarText: { fontWeight: '800', fontSize: 20 },
    executorName:       { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
    executorRating:     { fontSize: 13, color: C.textMuted },

    // Problem
    problemText: { fontSize: 14, color: C.text, marginBottom: 14, lineHeight: 20 },
    problemBtns: { flexDirection: 'row', gap: 10 },
    actionBtn:   { flex: 1, borderRadius: R.lg, paddingVertical: 13, alignItems: 'center' },
    actionBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff' },

    rateBtn:     { backgroundColor: C.primary, borderRadius: R.xl, paddingVertical: 16, alignItems: 'center', marginBottom: 10, ...SHADOW.orange },
    rateBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    cancelBtn:   { borderRadius: R.xl, paddingVertical: 14, alignItems: 'center' },
    cancelBtnText:{ fontSize: 14, fontWeight: '600' },
  });
}
