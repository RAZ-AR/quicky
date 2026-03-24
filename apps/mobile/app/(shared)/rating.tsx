import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/constants/config';

export default function RatingScreen() {
  const router = useRouter();
  const { taskId, rateeId } = useLocalSearchParams<{ taskId: string; rateeId: string }>();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) {
      Alert.alert('Выберите оценку');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/rating', { task_id: taskId, ratee_id: rateeId, stars, comment: comment.trim() || undefined });
      router.replace('/(client)/tasks/');
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить оценку');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => router.replace('/(client)/tasks/');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Задание выполнено!</Text>
        <Text style={styles.subtitle}>Оцените исполнителя</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setStars(s)}>
              <Text style={[styles.star, s <= stars && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Оставить комментарий (необязательно)"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.btn, (stars === 0 || isSubmitting) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={stars === 0 || isSubmitting}
        >
          <Text style={styles.btnText}>{isSubmitting ? 'Отправляем...' : 'Отправить оценку'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={styles.skip}>
          <Text style={styles.skipText}>Пропустить</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textMuted, marginBottom: 32 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  star: { fontSize: 48, color: COLORS.border },
  starActive: { color: '#f59e0b' },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 16, fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.card, width: '100%', marginBottom: 16,
    height: 100,
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', width: '100%',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skip: { padding: 16 },
  skipText: { color: COLORS.textMuted, fontSize: 15 },
});
