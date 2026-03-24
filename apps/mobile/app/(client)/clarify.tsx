import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTaskStore } from '../../src/stores/taskStore';
import { COLORS } from '../../src/constants/config';

export default function ClarifyScreen() {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { creation, parseText, answerClarification, isCreating } = useTaskStore();
  const [manualText, setManualText] = useState('');

  const question = creation.nextQuestion;
  const isManualMode = mode === 'text' && !creation.taskId;

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;
    try {
      await parseText(manualText.trim());
    } catch {
      Alert.alert('Ошибка', 'Не удалось обработать задание');
    }
  };

  const handleAnswer = async () => {
    if (!question) return;
    setIsSubmitting(true);
    try {
      await answerClarification(question.field, answer);
      setAnswer('');
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить ответ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!question) return;
    setIsSubmitting(true);
    try {
      await answerClarification(question.field, null, true);
      setAnswer('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Переходим дальше когда вопросов больше нет
  useEffect(() => {
    if (creation.taskId && !creation.nextQuestion) {
      router.replace('/(client)/confirm');
    }
  }, [creation.nextQuestion, creation.taskId]);

  if (isManualMode) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Опишите задание</Text>
          <Text style={styles.subtitle}>Например: «Купи молоко в Lidl и привези домой»</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={manualText}
            onChangeText={setManualText}
            placeholder="Что нужно сделать?"
            multiline
            numberOfLines={4}
            autoFocus
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.btn, (!manualText.trim() || isCreating) && styles.btnDisabled]}
            onPress={handleManualSubmit}
            disabled={!manualText.trim() || isCreating}
          >
            <Text style={styles.btnText}>{isCreating ? 'Обрабатываем...' : 'Далее'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!question) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.progressRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.title}>{question.question_text}</Text>

        {question.options ? (
          <View style={styles.optionsList}>
            {question.options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionBtn, answer === opt && styles.optionBtnActive]}
                onPress={() => setAnswer(opt)}
              >
                <Text style={[styles.optionText, answer === opt && styles.optionTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TextInput
            style={styles.input}
            value={answer}
            onChangeText={setAnswer}
            placeholder="Введите ответ..."
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAnswer}
            keyboardType={question.input_type === 'number' ? 'number-pad' : 'default'}
          />
        )}

        <TouchableOpacity
          style={[styles.btn, (!answer || isSubmitting) && styles.btnDisabled]}
          onPress={handleAnswer}
          disabled={!answer || isSubmitting}
        >
          <Text style={styles.btnText}>{isSubmitting ? 'Отправляем...' : 'Ответить'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} disabled={isSubmitting}>
          <Text style={styles.skipText}>Пропустить</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 40, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 24 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, marginBottom: 24 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 16, fontSize: 16, color: COLORS.text, marginBottom: 16,
    backgroundColor: COLORS.card,
  },
  textArea: { height: 120 },
  optionsList: { marginBottom: 16 },
  optionBtn: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, marginBottom: 8, backgroundColor: COLORS.card,
  },
  optionBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  optionText: { fontSize: 16, color: COLORS.text },
  optionTextActive: { color: COLORS.primary, fontWeight: '600' },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { padding: 16, alignItems: 'center' },
  skipText: { color: COLORS.textMuted, fontSize: 15 },
});
