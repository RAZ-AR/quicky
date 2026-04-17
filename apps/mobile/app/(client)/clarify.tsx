import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  const question     = creation.nextQuestion;
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

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Back */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            {!isManualMode && question && (
              <View style={styles.progressRow}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
                ))}
              </View>
            )}
            <View style={{ width: 42 }} />
          </View>

          <View style={styles.container}>
            {/* Title */}
            <Text style={styles.title}>
              {isManualMode ? 'Опишите задание' : question?.question_text ?? ''}
            </Text>
            {isManualMode && (
              <Text style={styles.subtitle}>Например: «Купи молоко в Lidl и привези домой»</Text>
            )}

            {/* Input or options */}
            {isManualMode ? (
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
            ) : question?.options ? (
              <View style={styles.optionsList}>
                {question.options.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionBtn, answer === opt && styles.optionBtnActive]}
                    onPress={() => setAnswer(opt)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionText, answer === opt && styles.optionTextActive]}>
                      {opt}
                    </Text>
                    {answer === opt && (
                      <View style={styles.optionCheck}>
                        <Text style={{ fontSize: 12, color: '#14141A' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
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
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (isManualMode ? !manualText.trim() || isCreating : !answer || isSubmitting) && { opacity: 0.45 },
              ]}
              onPress={isManualMode ? handleManualSubmit : handleAnswer}
              disabled={isManualMode ? !manualText.trim() || isCreating : !answer || isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.submitText}>
                {isManualMode ? (isCreating ? 'Обрабатываем...' : 'Далее →') : (isSubmitting ? 'Отправляем...' : 'Ответить')}
              </Text>
            </TouchableOpacity>

            {!isManualMode && (
              <TouchableOpacity onPress={handleSkip} disabled={isSubmitting} style={styles.skipBtn} activeOpacity={0.7}>
                <Text style={styles.skipText}>Пропустить</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, isDark: boolean) {
  const card = {
    shadowColor: '#14141A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.06, shadowRadius: 12, elevation: 4,
  };
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },
    kav:  { flex: 1 },

    // Top bar
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
    },
    backBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: C.bgLayer, alignItems: 'center', justifyContent: 'center',
      ...card,
    },
    backIcon: { color: C.text, fontSize: 18 },

    progressRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', flex: 1 },
    dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: C.border },
    dotActive:   { backgroundColor: '#D6F24A', width: 28, borderRadius: 4 },

    // Content
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },

    title:    { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: C.textMuted, marginBottom: 28, lineHeight: 22 },

    // Inputs
    input: {
      backgroundColor: C.bgLayer,
      borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: C.border,
      padding: 18, fontSize: 16, color: C.text, marginBottom: 20,
      ...card,
    },
    textArea: {
      backgroundColor: C.bgLayer,
      borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: C.border,
      padding: 18, fontSize: 16, color: C.text, height: 140, marginBottom: 20,
      ...card,
    },

    // Options
    optionsList: { marginBottom: 20, gap: 10 },
    optionBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: C.bgLayer, borderRadius: RADIUS.lg,
      borderWidth: 1.5, borderColor: C.border,
      padding: 16, ...card,
    },
    optionBtnActive: {
      borderColor: '#D6F24A', backgroundColor: 'rgba(214,242,74,0.08)',
    },
    optionText:      { fontSize: 16, color: C.text },
    optionTextActive:{ fontSize: 16, color: '#14141A', fontWeight: '700' },
    optionCheck: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: '#D6F24A',
      alignItems: 'center', justifyContent: 'center',
    },

    // Submit
    submitBtn: {
      borderRadius: 999, paddingVertical: 18, alignItems: 'center',
      marginBottom: 12, backgroundColor: '#0E0E10',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.20, shadowRadius: 10, elevation: 6,
    },
    submitText: { fontSize: 16, fontWeight: '800', color: '#D6F24A', letterSpacing: -0.2 },

    skipBtn:  { paddingVertical: 14, alignItems: 'center' },
    skipText: { color: C.textMuted, fontSize: 15 },
  });
}
