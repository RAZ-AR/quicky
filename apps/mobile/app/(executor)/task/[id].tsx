import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Modal, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTaskStore } from '../../../src/stores/taskStore';
import { useAppTheme } from '../../../src/hooks/useAppTheme';
import { api } from '../../../src/services/api';
import {
  RADIUS, SHADOW, NEO, CATEGORIES, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors,
} from '../../../src/constants/config';

// ── Step index ────────────────────────────────────────────────────────────────
function getStepIndex(state: string): number {
  return (
    {
      draft: 0, pending_confirm: 0, published: 0,
      accepted: 1,
      in_progress: 2,
      pending_client: 3,
      completed: 4, rated: 4,
    } as Record<string, number>
  )[state] ?? 0;
}

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ state, color }: { state: string; color: string }) {
  const idx   = getStepIndex(state);
  const TOTAL = 5;
  const DOT   = 22;
  return (
    <View style={dots.row}>
      {Array.from({ length: TOTAL }).map((_, i) => {
        const done   = i < idx;
        const active = i === idx;
        const future = i > idx;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <View style={[dots.line, { backgroundColor: done ? color : `${color}40` }]} />
            )}
            <View
              style={[
                dots.dot,
                { width: DOT, height: DOT, borderRadius: DOT / 2 },
                done   && { backgroundColor: color },
                active && { backgroundColor: color, opacity: 1 },
                future && { backgroundColor: `${color}20`, borderWidth: 1.5, borderColor: `${color}50` },
              ]}
            >
              {(done || active) && (
                <View style={[dots.inner, { backgroundColor: future ? 'transparent' : 'rgba(255,255,255,0.35)' }]} />
              )}
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

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ExecutorTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeTask, loadTask, acceptTask, startTask, completeTask, cancelTask, reportProblem } = useTaskStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);
  const [completing, setCompleting] = useState(false);
  const [problemVisible, setProblemVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const task = activeTask?.id === id ? activeTask : null;

  useEffect(() => {
    if (id) loadTask(id);
  }, [id]);

  const cat     = CATEGORIES.find(c => c.key === task?.category) ?? CATEGORIES[CATEGORIES.length - 1];
  const cardBg  = cat.dark;
  const textCol = cat.darkText ?? '#1A1410';

  // ── Complete with photo ──
  const handleComplete = async () => {
    setCompleting(true);
    try {
      Alert.alert(
        'Завершить задание',
        'Прикрепить фото выполнения?',
        [
          {
            text: 'Без фото',
            onPress: async () => {
              try {
                await completeTask(id!);
                router.back();
              } catch {
                Alert.alert('Ошибка', 'Не удалось завершить');
              } finally {
                setCompleting(false);
              }
            },
          },
          {
            text: 'Выбрать фото',
            onPress: async () => {
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  quality: 0.8,
                });
                if (!result.canceled) {
                  const formData = new FormData();
                  formData.append('file', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
                  const { data } = await api.post('/upload/photo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                  await completeTask(id!, data.url);
                } else {
                  await completeTask(id!);
                }
                router.back();
              } catch {
                Alert.alert('Ошибка', 'Не удалось завершить');
              } finally {
                setCompleting(false);
              }
            },
          },
        ],
      );
    } catch {
      setCompleting(false);
    }
  };

  const handleReportProblem = async (type: 'item_not_available' | 'need_clarification' | 'price_change') => {
    setProblemVisible(false);
    setIsProcessing(true);
    try {
      await reportProblem(id!, { problem_type: type });
      await loadTask(id!);
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить сообщение');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={task ? textCol : COLORS.text} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero card (category color bg) */}
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
                  <View style={styles.infoRow}>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.infoLabel}>Примечания</Text>
                    <Text style={styles.infoVal} numberOfLines={3}>{(task as any).notes}</Text>
                  </View>
                ) : null}
              </View>

              {/* Actions by state */}
              <View style={styles.actions}>
                {task.state === 'published' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.executor }]}
                    onPress={async () => {
                      setIsProcessing(true);
                      try { await acceptTask(id!); loadTask(id!); }
                      catch { Alert.alert('Ошибка'); }
                      finally { setIsProcessing(false); }
                    }}
                    disabled={isProcessing}
                    activeOpacity={0.85}
                  >
                    {isProcessing
                      ? <ActivityIndicator color={isDark ? '#0F1F0F' : '#fff'} />
                      : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={20} color={isDark ? '#0F1F0F' : '#fff'} />
                          <Text style={styles.actionBtnText}>Взять задание</Text>
                        </>
                      )}
                  </TouchableOpacity>
                )}

                {task.state === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.executor }]}
                    onPress={async () => {
                      setIsProcessing(true);
                      try { await startTask(id!); loadTask(id!); }
                      catch { Alert.alert('Ошибка'); }
                      finally { setIsProcessing(false); }
                    }}
                    disabled={isProcessing}
                    activeOpacity={0.85}
                  >
                    {isProcessing
                      ? <ActivityIndicator color={isDark ? '#0F1F0F' : '#fff'} />
                      : (
                        <>
                          <Ionicons name="play-circle-outline" size={20} color={isDark ? '#0F1F0F' : '#fff'} />
                          <Text style={styles.actionBtnText}>Начать выполнение</Text>
                        </>
                      )}
                  </TouchableOpacity>
                )}

                {task.state === 'in_progress' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.executor }]}
                      onPress={handleComplete}
                      disabled={completing}
                      activeOpacity={0.85}
                    >
                      {completing
                        ? <ActivityIndicator color={isDark ? '#0F1F0F' : '#fff'} />
                        : (
                          <>
                            <Ionicons name="checkmark-done-outline" size={20} color={isDark ? '#0F1F0F' : '#fff'} />
                            <Text style={styles.actionBtnText}>Завершить</Text>
                          </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.warning + 'DD' }]}
                      onPress={() => setProblemVisible(true)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="warning-outline" size={20} color="#fff" />
                      <Text style={styles.actionBtnText}>Сообщить о проблеме</Text>
                    </TouchableOpacity>
                  </>
                )}

                {task.state === 'pending_client' && (
                  <View style={styles.waitingBanner}>
                    <Ionicons name="hourglass-outline" size={24} color={COLORS.warning} />
                    <Text style={styles.waitingText}>Ожидаем ответа клиента...</Text>
                  </View>
                )}

                {(task.state === 'completed' || task.state === 'rated') && (
                  <View style={styles.doneBanner}>
                    <Ionicons name="checkmark-circle" size={32} color={COLORS.executor} />
                    <Text style={styles.doneText}>Задание завершено</Text>
                  </View>
                )}

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

      {/* Problem modal */}
      <Modal
        visible={problemVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProblemVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setProblemVisible(false)} activeOpacity={1} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Тип проблемы</Text>
              <TouchableOpacity
                onPress={() => setProblemVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {PROBLEM_TYPES.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={styles.problemOption}
                  onPress={() => handleReportProblem(p.key)}
                  activeOpacity={0.75}
                >
                  <View style={styles.problemIconWrap}>
                    <Ionicons name={p.icon as any} size={20} color={COLORS.warning} />
                  </View>
                  <Text style={styles.problemOptionText}>{p.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.cancelOptionBtn}
                onPress={() => setProblemVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelOptionText}>Отмена</Text>
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
      position: 'absolute',
      top: 12, left: 16, zIndex: 10,
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.bgLayer,
      alignItems: 'center', justifyContent: 'center',
      ...(isDark ? SHADOW.sm : NEO.pressed),
    },

    // Hero
    hero: {
      marginHorizontal: 16, marginTop: 64, marginBottom: 16,
      borderRadius: R.xl, padding: 20,
      minHeight: 160,
      ...(isDark ? SHADOW.md : NEO.card),
    },
    heroTop: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    heroPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 5,
    },
    heroPillText:  { fontSize: 12, fontWeight: '700' },
    heroPrice:     { fontSize: 36, fontWeight: '800', marginBottom: 6, letterSpacing: -1 },
    heroDesc:      { fontSize: 14, lineHeight: 20, opacity: 0.85 },

    // Content
    content: { paddingHorizontal: 16 },

    // Info card
    infoCard: {
      backgroundColor: C.bgLayer,
      borderRadius: R.xl,
      padding: 16,
      marginBottom: 16,
      ...(isDark ? SHADOW.sm : NEO.card),
    },
    infoRow: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: C.divider,
    },
    infoLabel: { fontSize: 13, color: C.textMuted, width: 60, marginTop: 1 },
    infoVal:   { flex: 1, fontSize: 14, color: C.text, fontWeight: '500', lineHeight: 20 },

    // Actions
    actions: { gap: 10, marginBottom: 16 },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: R.xl, paddingVertical: 16,
    },
    actionBtnText: { fontSize: 16, fontWeight: '700', color: isDark ? '#0F1F0F' : '#fff' },
    cancelActionBtn: {
      backgroundColor: C.dangerGlow,
      borderWidth: 1.5, borderColor: C.danger + '40',
    },

    waitingBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: C.warningGlow,
      borderRadius: R.xl, paddingVertical: 18,
      borderWidth: 1, borderColor: C.warning + '40',
    },
    waitingText: { fontSize: 15, fontWeight: '600', color: C.warning },

    doneBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: C.executorGlow,
      borderRadius: R.xl, paddingVertical: 18,
      borderWidth: 1, borderColor: C.executor + '40',
    },
    doneText: { fontSize: 15, fontWeight: '700', color: C.executor },

    // Modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: C.bgLayer,
      borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl,
      paddingBottom: 32,
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: 'center', marginTop: 10, marginBottom: 4,
    },
    modalTitleRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 12,
    },
    modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    modalCloseBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: C.bgElevated,
      alignItems: 'center', justifyContent: 'center',
    },
    modalBody: { paddingHorizontal: 20 },

    problemOption: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      padding: 14, borderRadius: R.lg,
      backgroundColor: C.bgElevated,
      borderWidth: 1, borderColor: C.border,
      marginBottom: 10,
    },
    problemIconWrap: {
      width: 40, height: 40, borderRadius: R.md,
      backgroundColor: C.warningGlow,
      alignItems: 'center', justifyContent: 'center',
    },
    problemOptionText: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },

    cancelOptionBtn: {
      alignItems: 'center', paddingVertical: 14,
    },
    cancelOptionText: { fontSize: 15, color: C.textMuted, fontWeight: '600' },
  });
}
