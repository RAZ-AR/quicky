import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Modal, StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTaskStore } from '../../../src/stores/taskStore';
import { useAppTheme } from '../../../src/hooks/useAppTheme';
import { joinTaskRoom, leaveTaskRoom, getSocketInstance } from '../../../src/services/socket';
import { EXEC_GRAD, EXEC_GRAD_DARK } from '../../../src/components/GradBtn';
import {
  RADIUS, SHADOW, NEO, CATEGORIES, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors,
} from '../../../src/constants/config';

// ── Step index ────────────────────────────────────────────────────────────────
function getStepIndex(state: string): number {
  return ({ draft: 0, pending_confirm: 0, published: 0, accepted: 1, in_progress: 2, pending_client: 3, completed: 4, rated: 4 } as Record<string, number>)[state] ?? 0;
}

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ state, color }: { state: string; color: string }) {
  const idx = getStepIndex(state);
  const TOTAL = 5;
  const DOT = 22;
  return (
    <View style={dots.row}>
      {Array.from({ length: TOTAL }).map((_, i) => {
        const done   = i < idx;
        const active = i === idx;
        const future = i > idx;
        return (
          <React.Fragment key={i}>
            {i > 0 && <View style={[dots.line, { backgroundColor: done ? color : `${color}40` }]} />}
            <View style={[
              dots.dot, { width: DOT, height: DOT, borderRadius: DOT / 2 },
              done   && { backgroundColor: color },
              active && { backgroundColor: color },
              future && { backgroundColor: `${color}20`, borderWidth: 1.5, borderColor: `${color}50` },
            ]}>
              {(done || active) && <View style={[dots.inner, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}
const dots = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
  line:  { flex: 1, height: 3, borderRadius: 2 },
  dot:   { alignItems: 'center', justifyContent: 'center' },
  inner: { width: 8, height: 8, borderRadius: 4 },
});

// ── Problem types ─────────────────────────────────────────────────────────────
const PROBLEM_TYPES = [
  { key: 'item_not_available' as const, label: 'Товар недоступен',  icon: 'close-circle-outline' },
  { key: 'need_clarification' as const, label: 'Нужно уточнение',   icon: 'help-circle-outline' },
  { key: 'price_change'       as const, label: 'Изменение цены',    icon: 'cash-outline' },
];

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 16 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity key={i} onPress={() => onChange(i)} activeOpacity={0.7}>
          <Ionicons name={i <= value ? 'star' : 'star-outline'} size={38} color={i <= value ? '#FFD700' : '#C0C0C8'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ExecutorTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { activeTask, loadTask, acceptTask, startTask, cancelTask, reportProblem, rateTask, setActiveTask } = useTaskStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  const [isProcessing,  setIsProcessing]  = useState(false);
  const [problemVisible,setProblemVisible]= useState(false);

  // Rating modal
  const [ratingVisible, setRatingVisible] = useState(false);
  const [starValue,     setStarValue]     = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSaving,  setRatingSaving]  = useState(false);

  // activeTask предзаполнен перед навигацией — показываем сразу, loadTask обновит в фоне
  const task = (activeTask?.id === id ? activeTask : null) as any;

  // ── Load task + join socket room ──────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    loadTask(id);
    joinTaskRoom(id);

    const socket = getSocketInstance();
    if (socket) {
      const onStateChanged = (payload: { task_id: string; new_state: string }) => {
        if (payload.task_id === id) loadTask(id);
      };
      const onCompleted = (payload: { task_id: string }) => {
        if (payload.task_id === id) {
          loadTask(id);
          setRatingVisible(true);  // предложить оценить после завершения
        }
      };
      socket.on('task_state_changed', onStateChanged);
      socket.on('task_completed',     onCompleted);
      return () => {
        socket.off('task_state_changed', onStateChanged);
        socket.off('task_completed',     onCompleted);
        leaveTaskRoom(id);
      };
    }
    return () => leaveTaskRoom(id);
  }, [id]);

  const cat     = CATEGORIES.find(c => c.key === task?.category) ?? CATEGORIES[CATEGORIES.length - 1];
  const cardBg  = cat.dark;
  const textCol = cat.darkText ?? '#1A1410';

  // ── Report problem ────────────────────────────────────────────────────────
  const handleReportProblem = async (type: 'item_not_available' | 'need_clarification' | 'price_change') => {
    setProblemVisible(false);
    setIsProcessing(true);
    try {
      await reportProblem(id!, { problem_type: type });
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить сообщение');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Submit rating ─────────────────────────────────────────────────────────
  const handleSubmitRating = async () => {
    if (!task?.client_id) {
      Alert.alert('Ошибка', 'Не удалось определить заказчика для оценки');
      return;
    }
    setRatingSaving(true);
    try {
      await rateTask(id!, starValue, ratingComment.trim() || undefined, task?.client_id);
      setRatingVisible(false);
      router.back();
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить оценку');
    } finally {
      setRatingSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={task ? textCol : COLORS.text} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Hero */}
          {task ? (
            <View style={[styles.hero, { backgroundColor: cardBg }]}>
              <View style={styles.heroTop}>
                <View style={[styles.heroPill, { backgroundColor: textCol + '20' }]}>
                  <Ionicons name={cat.icon as any} size={12} color={textCol} />
                  <Text style={[styles.heroPillText, { color: textCol }]}>{cat.label}</Text>
                </View>
                <View style={[styles.heroPill, { backgroundColor: textCol + '20' }]}>
                  <Text style={[styles.heroPillText, { color: textCol }]}>{TASK_STATE_LABELS[task.state] ?? task.state}</Text>
                </View>
              </View>
              <Text style={[styles.heroPrice, { color: textCol }]}>{task.price_final ?? '—'} ₽</Text>
              <Text style={[styles.heroDesc, { color: textCol }]} numberOfLines={3}>{task.item_description}</Text>
              <StepDots state={task.state} color={textCol} />
            </View>
          ) : (
            <View style={[styles.hero, { backgroundColor: COLORS.bgLayer }]}>
              <ActivityIndicator color={COLORS.executor} />
            </View>
          )}

          {task && (
            <View style={styles.content}>

              {/* Info card */}
              <View style={styles.infoCard}>
                {task.from_location?.address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="radio-button-on-outline" size={16} color={COLORS.executor} />
                    <Text style={styles.infoLabel}>Откуда</Text>
                    <Text style={styles.infoVal} numberOfLines={2}>{task.from_location.address}</Text>
                  </View>
                )}
                {task.to_location?.address && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.danger} />
                    <Text style={styles.infoLabel}>Куда</Text>
                    <Text style={styles.infoVal} numberOfLines={2}>{task.to_location.address}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Ionicons name="cash-outline" size={16} color={COLORS.executor} />
                  <Text style={styles.infoLabel}>Оплата</Text>
                  <Text style={styles.infoVal}>{task.payment_method === 'cash' ? 'Наличные' : 'Карта'}</Text>
                </View>
                {(task as any).notes ? (
                  <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.infoLabel}>Заметки</Text>
                    <Text style={styles.infoVal} numberOfLines={4}>{(task as any).notes}</Text>
                  </View>
                ) : null}
              </View>

              {/* Client info */}
              {(task.client || task.executor) && (
                <View style={styles.clientCard}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>
                      {(task.client?.name ?? task.executor?.name)?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>{task.client?.name ?? task.executor?.name}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={13} color="#FFD700" />
                      <Text style={styles.ratingText}>
                        {task.client?.rating_avg?.toFixed?.(1) ?? task.executor?.rating_avg?.toFixed?.(1) ?? '—'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => router.push({ pathname: '/(executor)/chat/[taskId]', params: { taskId: id } })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={COLORS.executor} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Actions by state */}
              <View style={styles.actions}>

                {task.state === 'published' && (
                  <TouchableOpacity
                    style={styles.actionBtnWrap}
                    onPress={async () => {
                      setIsProcessing(true);
                      try { await acceptTask(id!); await loadTask(id!); }
                      catch { Alert.alert('Ошибка', 'Не удалось принять задание'); }
                      finally { setIsProcessing(false); }
                    }}
                    disabled={isProcessing}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={isDark ? EXEC_GRAD_DARK : EXEC_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.actionBtnGrad}>
                      {isProcessing
                        ? <ActivityIndicator color="#fff" />
                        : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.actionBtnText}>Взять задание</Text></>}
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {task.state === 'accepted' && (
                  <>
                    <TouchableOpacity
                      style={styles.actionBtnWrap}
                      onPress={async () => {
                        setIsProcessing(true);
                        try { await startTask(id!); }
                        catch { Alert.alert('Ошибка'); }
                        finally { setIsProcessing(false); }
                      }}
                      disabled={isProcessing}
                      activeOpacity={0.85}
                    >
                      <LinearGradient colors={isDark ? EXEC_GRAD_DARK : EXEC_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.actionBtnGrad}>
                        {isProcessing
                          ? <ActivityIndicator color="#fff" />
                          : <><Ionicons name="play-circle-outline" size={20} color="#fff" /><Text style={styles.actionBtnText}>Начать выполнение</Text></>}
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.chatActionBtn]}
                      onPress={() => router.push({ pathname: '/(executor)/chat/[taskId]', params: { taskId: id } })}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.executor} />
                      <Text style={[styles.actionBtnText, { color: COLORS.executor }]}>Написать клиенту</Text>
                    </TouchableOpacity>
                  </>
                )}

                {task.state === 'in_progress' && (
                  <>
                    <TouchableOpacity
                      style={styles.actionBtnWrap}
                      onPress={() => router.push({ pathname: '/(executor)/scan-qr', params: { taskId: id } })}
                      activeOpacity={0.85}
                    >
                      <LinearGradient colors={isDark ? EXEC_GRAD_DARK : EXEC_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.actionBtnGrad}>
                        <Ionicons name="qr-code-outline" size={20} color="#fff" />
                        <Text style={styles.actionBtnText}>Сканировать QR и завершить</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.chatActionBtn]}
                      onPress={() => router.push({ pathname: '/(executor)/chat/[taskId]', params: { taskId: id } })}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.executor} />
                      <Text style={[styles.actionBtnText, { color: COLORS.executor }]}>Написать клиенту</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.warnActionBtn]}
                      onPress={() => setProblemVisible(true)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="warning-outline" size={20} color={COLORS.warning} />
                      <Text style={[styles.actionBtnText, { color: COLORS.warning }]}>Сообщить о проблеме</Text>
                    </TouchableOpacity>
                  </>
                )}

                {task.state === 'pending_client' && (
                  <>
                    <View style={styles.waitingBanner}>
                      <Ionicons name="hourglass-outline" size={24} color={COLORS.warning} />
                      <Text style={styles.waitingText}>Ожидаем ответа клиента...</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.chatActionBtn]}
                      onPress={() => router.push({ pathname: '/(executor)/chat/[taskId]', params: { taskId: id } })}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.executor} />
                      <Text style={[styles.actionBtnText, { color: COLORS.executor }]}>Написать клиенту</Text>
                    </TouchableOpacity>
                  </>
                )}

                {(task.state === 'completed' || task.state === 'rated') && (
                  <View style={styles.doneBanner}>
                    <Ionicons name="checkmark-circle" size={32} color={COLORS.executor} />
                    <Text style={styles.doneText}>
                      {task.state === 'rated' ? 'Задание оценено' : 'Задание завершено'}
                    </Text>
                  </View>
                )}

                {/* Кнопка оценить — если завершено но ещё не оценено */}
                {task.state === 'completed' && (
                  <TouchableOpacity
                    style={styles.actionBtnWrap}
                    onPress={() => setRatingVisible(true)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#FFD700', '#FFA500']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.actionBtnGrad}>
                      <Ionicons name="star-outline" size={20} color="#fff" />
                      <Text style={styles.actionBtnText}>Оценить клиента</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {/* Отказаться — для published/accepted */}
                {['published', 'accepted'].includes(task.state) && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelActionBtn]}
                    onPress={() =>
                      Alert.alert('Отказаться от задания?', '', [
                        { text: 'Нет', style: 'cancel' },
                        {
                          text: 'Отказаться',
                          style: 'destructive',
                          onPress: async () => {
                            try { await cancelTask(id!, 'executor_cancel'); router.back(); }
                            catch {}
                          },
                        },
                      ])
                    }
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
                    <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Отказаться</Text>
                  </TouchableOpacity>
                )}

              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Problem modal ── */}
      <Modal visible={problemVisible} transparent animationType="slide" onRequestClose={() => setProblemVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setProblemVisible(false)} activeOpacity={1} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Тип проблемы</Text>
              <TouchableOpacity onPress={() => setProblemVisible(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {PROBLEM_TYPES.map(p => (
                <TouchableOpacity key={p.key} style={styles.problemOption} onPress={() => handleReportProblem(p.key)} activeOpacity={0.75}>
                  <View style={styles.problemIconWrap}>
                    <Ionicons name={p.icon as any} size={20} color={COLORS.warning} />
                  </View>
                  <Text style={styles.problemOptionText}>{p.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelOptionBtn} onPress={() => setProblemVisible(false)} activeOpacity={0.7}>
                <Text style={styles.cancelOptionText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Rating modal ── */}
      <Modal visible={ratingVisible} transparent animationType="slide" onRequestClose={() => { setRatingVisible(false); router.back(); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.ratingSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.ratingHeader}>
              <Text style={styles.ratingTitle}>Оцените клиента</Text>
              <Text style={styles.ratingSubtitle}>Задание завершено</Text>
            </View>

            <StarRow value={starValue} onChange={setStarValue} />

            <View style={styles.ratingCommentWrap}>
              <TextInput
                style={styles.ratingCommentInput}
                placeholder="Оставить комментарий (необязательно)"
                placeholderTextColor={COLORS.textMuted}
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.ratingCounter}>{ratingComment.length}/200</Text>
            </View>

            <View style={styles.ratingBtns}>
              <TouchableOpacity
                style={styles.ratingSkipBtn}
                onPress={() => { setRatingVisible(false); router.back(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.ratingSkipText}>Пропустить</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ratingSendWrap}
                onPress={handleSubmitRating}
                disabled={ratingSaving}
                activeOpacity={0.85}
              >
                <LinearGradient colors={isDark ? EXEC_GRAD_DARK : EXEC_GRAD} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.ratingSendGrad}>
                  {ratingSaving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.ratingSendText}>Отправить</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    backBtn: {
      position: 'absolute', top: 12, left: 16, zIndex: 10,
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.bgLayer,
      alignItems: 'center', justifyContent: 'center',
      ...(isDark ? SHADOW.sm : NEO.pressed),
    },

    // Hero
    hero: {
      marginHorizontal: 16, marginTop: 64, marginBottom: 16,
      borderRadius: R.xl, padding: 20, minHeight: 160,
      ...(isDark ? SHADOW.md : NEO.card),
    },
    heroTop:      { flexDirection: 'row', gap: 8, marginBottom: 12 },
    heroPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 5 },
    heroPillText: { fontSize: 12, fontWeight: '700' },
    heroPrice:    { fontSize: 36, fontWeight: '800', marginBottom: 6, letterSpacing: -1 },
    heroDesc:     { fontSize: 14, lineHeight: 20, opacity: 0.85 },

    // Content
    content: { paddingHorizontal: 16 },

    // Info card
    infoCard: {
      backgroundColor: C.bgLayer, borderRadius: R.xl, padding: 16, marginBottom: 12,
      ...(isDark ? SHADOW.sm : NEO.card),
    },
    infoRow: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider,
    },
    infoLabel: { fontSize: 13, color: C.textMuted, width: 60, marginTop: 1 },
    infoVal:   { flex: 1, fontSize: 14, color: C.text, fontWeight: '500', lineHeight: 20 },

    // Client card
    clientCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: C.bgLayer, borderRadius: R.xl, padding: 14, marginBottom: 12,
      ...(isDark ? SHADOW.sm : NEO.card),
    },
    clientAvatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: isDark ? C.glassCyan : C.executor + '18',
      alignItems: 'center', justifyContent: 'center',
    },
    clientAvatarText: { fontSize: 18, fontWeight: '800', color: C.executor },
    clientName:       { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
    ratingRow:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText:       { fontSize: 13, color: C.textMuted, fontWeight: '600' },
    callBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: isDark ? C.glassCyan : C.executor + '18',
      alignItems: 'center', justifyContent: 'center',
      ...(isDark ? SHADOW.sm : NEO.pressed),
    },

    // Actions
    actions: { gap: 10, marginBottom: 16 },
    actionBtnWrap: {
      borderRadius: R.xl,
      shadowColor: '#45BFFF', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.38, shadowRadius: 10, elevation: 6,
    },
    actionBtnGrad: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: R.xl, paddingVertical: 16,
    },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: R.xl, paddingVertical: 16,
    },
    actionBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    chatActionBtn: {
      backgroundColor: isDark ? C.executorGlow : C.executor + '12',
      borderWidth: 1.5, borderColor: C.executor + '40',
    },
    warnActionBtn: {
      backgroundColor: isDark ? C.warningGlow : 'rgba(255,149,0,0.10)',
      borderWidth: 1.5, borderColor: C.warning + '50',
    },
    cancelActionBtn: {
      backgroundColor: isDark ? C.dangerGlow : 'rgba(255,59,48,0.08)',
      borderWidth: 1.5, borderColor: C.danger + '40',
    },

    waitingBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: C.warningGlow, borderRadius: R.xl, paddingVertical: 18,
      borderWidth: 1, borderColor: C.warning + '40',
    },
    waitingText: { fontSize: 15, fontWeight: '600', color: C.warning },

    doneBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: C.executorGlow, borderRadius: R.xl, paddingVertical: 18,
      borderWidth: 1, borderColor: C.executor + '40',
    },
    doneText: { fontSize: 15, fontWeight: '700', color: C.executor },

    // Problem modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: C.bgLayer,
      borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl, paddingBottom: 32,
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2, backgroundColor: C.border,
      alignSelf: 'center', marginTop: 10, marginBottom: 4,
    },
    modalTitleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    modalTitle:    { flex: 1, fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    modalCloseBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center',
    },
    modalBody: { paddingHorizontal: 20 },

    problemOption: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      padding: 14, borderRadius: R.lg,
      backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, marginBottom: 10,
    },
    problemIconWrap: {
      width: 40, height: 40, borderRadius: R.md,
      backgroundColor: C.warningGlow, alignItems: 'center', justifyContent: 'center',
    },
    problemOptionText: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
    cancelOptionBtn:   { alignItems: 'center', paddingVertical: 14 },
    cancelOptionText:  { fontSize: 15, color: C.textMuted, fontWeight: '600' },

    // Rating modal
    ratingSheet: {
      backgroundColor: C.bgLayer,
      borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl, paddingBottom: 36,
    },
    ratingHeader:   { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
    ratingTitle:    { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
    ratingSubtitle: { fontSize: 13, color: C.textMuted, marginTop: 4 },

    ratingCommentWrap: { marginHorizontal: 20, marginBottom: 16 },
    ratingCommentInput: {
      backgroundColor: C.bgElevated,
      borderRadius: R.lg,
      padding: 14,
      color: C.text,
      fontSize: 14,
      lineHeight: 20,
      minHeight: 72,
      textAlignVertical: 'top',
      borderWidth: 1, borderColor: C.border,
    },
    ratingCounter: {
      alignSelf: 'flex-end',
      color: C.textMuted,
      fontSize: 12,
      marginTop: 6,
    },

    ratingBtns:    { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
    ratingSkipBtn: {
      flex: 1, paddingVertical: 14, alignItems: 'center',
      borderRadius: R.xl,
      backgroundColor: isDark ? C.bgElevated : 'rgba(26,28,42,0.06)',
    },
    ratingSkipText: { fontSize: 15, fontWeight: '600', color: C.textMuted },
    ratingSendWrap: {
      flex: 2, borderRadius: R.xl,
      shadowColor: '#45BFFF', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.38, shadowRadius: 10, elevation: 6,
    },
    ratingSendGrad: {
      borderRadius: R.xl, paddingVertical: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    ratingSendText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
