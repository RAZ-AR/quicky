import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function ClarifyScreen() {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualText, setManualText] = useState('');
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { creation, parseText, answerClarification, isCreating } = useTaskStore();
  const { COLORS, GRADIENTS, isDark, blurTint } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const question    = creation.nextQuestion;
  const isManualMode = mode === 'text' && !creation.taskId;

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;
    try { await parseText(manualText.trim()); }
    catch { Alert.alert('Ошибка', 'Не удалось обработать задание'); }
  };

  const handleAnswer = async () => {
    if (!question) return;
    setIsSubmitting(true);
    try { await answerClarification(question.field, answer); setAnswer(''); }
    catch { Alert.alert('Ошибка', 'Не удалось отправить ответ'); }
    finally { setIsSubmitting(false); }
  };

  const handleSkip = async () => {
    if (!question) return;
    setIsSubmitting(true);
    try { await answerClarification(question.field, null, true); setAnswer(''); }
    finally { setIsSubmitting(false); }
  };

  useEffect(() => {
    if (creation.taskId && !creation.nextQuestion) router.replace('/(client)/confirm');
  }, [creation.nextQuestion, creation.taskId]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowCenter} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Back */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
              <View style={styles.backBtnBg} />
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.container}>

            {/* Progress dots (for clarify mode) */}
            {!isManualMode && question && (
              <View style={styles.progressRow}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
                ))}
              </View>
            )}

            {/* Title */}
            <Text style={styles.title}>
              {isManualMode ? 'Опишите задание' : question?.question_text ?? ''}
            </Text>
            {isManualMode && (
              <Text style={styles.subtitle}>Например: «Купи молоко в Lidl и привези домой»</Text>
            )}

            {/* Input or options */}
            {isManualMode ? (
              <View style={styles.inputWrap}>
                <BlurView intensity={18} tint={blurTint} style={StyleSheet.absoluteFill} />
                <View style={styles.inputBg} />
                <TextInput
                  style={styles.textArea}
                  value={manualText}
                  onChangeText={setManualText}
                  placeholder="Что нужно сделать?"
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  numberOfLines={4}
                  autoFocus
                  textAlignVertical="top"
                />
              </View>
            ) : question?.options ? (
              <View style={styles.optionsList}>
                {question.options.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.optionBtn}
                    onPress={() => setAnswer(opt)}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={18} tint={blurTint} style={StyleSheet.absoluteFill} />
                    <View style={[
                      styles.optionBg,
                      answer === opt && { backgroundColor: COLORS.glassViolet, borderColor: COLORS.primary + '60' },
                    ]} />
                    {answer === opt && <View style={styles.optionCheck} />}
                    <Text style={[styles.optionText, answer === opt && { color: COLORS.primaryLight, fontWeight: '600' }]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.inputWrap}>
                <BlurView intensity={18} tint={blurTint} style={StyleSheet.absoluteFill} />
                <View style={styles.inputBg} />
                <TextInput
                  style={styles.input}
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder="Введите ответ..."
                  placeholderTextColor={COLORS.textLight}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleAnswer}
                  keyboardType={question?.input_type === 'number' ? 'number-pad' : 'default'}
                />
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, (isManualMode ? !manualText.trim() || isCreating : !answer || isSubmitting) && { opacity: 0.45 }]}
              onPress={isManualMode ? handleManualSubmit : handleAnswer}
              disabled={isManualMode ? !manualText.trim() || isCreating : !answer || isSubmitting}
              activeOpacity={0.85}
            >
              <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
              <Text style={styles.submitText}>
                {isManualMode ? (isCreating ? 'Обрабатываем...' : 'Далее →') : (isSubmitting ? 'Отправляем...' : 'Ответить')}
              </Text>
            </TouchableOpacity>

            {!isManualMode && (
              <TouchableOpacity onPress={handleSkip} disabled={isSubmitting} style={styles.skipBtn}>
                <Text style={styles.skipText}>Пропустить</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, C_RADIUS = RADIUS) {
  return StyleSheet.create({
    root:       { flex: 1, backgroundColor: C.bg },
    safe:       { flex: 1 },
    kav:        { flex: 1 },
    glowCenter: { position: 'absolute', top: '30%', left: '10%', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(139,92,246,0.12)' },

    topBar:   { paddingHorizontal: 20, paddingTop: 8 },
    backBtn:  { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    backBtnBg:{ ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: 19, borderWidth: 1, borderColor: C.glassBorder },
    backIcon: { color: C.text, fontSize: 18, position: 'relative' },

    container:   { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
    progressRow: { flexDirection: 'row', gap: 8, marginBottom: 32, justifyContent: 'center' },
    dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: C.glass },
    dotActive:   { backgroundColor: C.primary, width: 28, borderRadius: 4 },

    title:    { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 8 },
    subtitle: { fontSize: 15, color: C.textMuted, marginBottom: 28, lineHeight: 22 },

    inputWrap:{ borderRadius: C_RADIUS.xl, overflow: 'hidden', marginBottom: 20 },
    inputBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.xl, borderWidth: 1, borderColor: C.glassBorder },
    input:    { padding: 18, fontSize: 16, color: C.text, position: 'relative' },
    textArea: { padding: 18, fontSize: 16, color: C.text, height: 140, position: 'relative' },

    optionsList: { marginBottom: 20, gap: 8 },
    optionBtn:   { borderRadius: C_RADIUS.lg, overflow: 'hidden' },
    optionBg:    { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.lg, borderWidth: 1, borderColor: C.glassBorder },
    optionCheck: { position: 'absolute', right: 18, top: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
    optionText:  { fontSize: 16, color: C.text, padding: 16, position: 'relative' },

    submitBtn:  { borderRadius: C_RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
    submitText: { fontSize: 16, fontWeight: '700', color: '#fff', position: 'relative' },

    skipBtn:  { paddingVertical: 14, alignItems: 'center' },
    skipText: { color: C.textMuted, fontSize: 15 },
  });
}
