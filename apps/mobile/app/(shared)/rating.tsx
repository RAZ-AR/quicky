import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { api } from '../../src/services/api';
import { COLORS, RADIUS, GRADIENTS } from '../../src/constants/config';

const STAR_LABELS = ['', 'Плохо', 'Неплохо', 'Нормально', 'Хорошо', 'Отлично!'];

export default function RatingScreen() {
  const router = useRouter();
  const { taskId, rateeId } = useLocalSearchParams<{ taskId: string; rateeId: string }>();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) { Alert.alert('Выберите оценку'); return; }
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />

      {/* Ambient glow — gold tint for success */}
      <View style={[styles.glowCenter, { opacity: stars > 0 ? 0.25 + stars * 0.05 : 0.12 }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.container}>

            {/* Success badge */}
            <View style={styles.successBadge}>
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['rgba(16,185,129,0.30)', 'rgba(6,182,212,0.15)']} style={StyleSheet.absoluteFill} />
              <View style={styles.successBorder} />
              <Text style={{ fontSize: 48, position: 'relative' }}>🎉</Text>
            </View>

            <Text style={styles.title}>Задание выполнено!</Text>
            <Text style={styles.subtitle}>Оцените работу исполнителя</Text>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setStars(s)} activeOpacity={0.7}>
                  <Text style={[styles.star, s <= stars && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            {stars > 0 && (
              <View style={styles.starLabelWrap}>
                <Text style={styles.starLabel}>{STAR_LABELS[stars]}</Text>
              </View>
            )}

            {/* Comment input */}
            <View style={styles.inputWrap}>
              <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.inputBg} />
              <TextInput
                style={styles.textArea}
                value={comment}
                onChangeText={setComment}
                placeholder="Оставить комментарий (необязательно)"
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, (stars === 0 || isSubmitting) && { opacity: 0.45 }]}
              onPress={handleSubmit}
              disabled={stars === 0 || isSubmitting}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#F59E0B', '#D97706']} style={StyleSheet.absoluteFill} />
              <Text style={styles.submitText}>{isSubmitting ? 'Отправляем...' : '⭐ Отправить оценку'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Пропустить</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  kav:  { flex: 1 },
  glowCenter: {
    position: 'absolute', top: '25%', left: '10%',
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(245,158,11,0.20)',
  },

  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },

  successBadge:  { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(16,185,129,0.40)' },

  title:    { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textMuted, marginBottom: 28, textAlign: 'center' },

  starsRow:     { flexDirection: 'row', gap: 6, marginBottom: 12 },
  star:         { fontSize: 44, color: COLORS.glass },
  starActive:   { color: '#F59E0B' },

  starLabelWrap:{ marginBottom: 20 },
  starLabel:    { fontSize: 16, fontWeight: '700', color: '#F59E0B' },

  inputWrap: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 20, width: '100%' },
  inputBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  textArea:  { padding: 18, fontSize: 15, color: COLORS.text, height: 110, position: 'relative', textAlignVertical: 'top' },

  submitBtn:  { borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center', width: '100%', marginBottom: 12 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff', position: 'relative' },

  skipBtn:  { paddingVertical: 14 },
  skipText: { color: COLORS.textMuted, fontSize: 15 },
});
