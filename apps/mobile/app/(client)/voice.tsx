import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useVoiceRecorder } from '../../src/hooks/useVoiceRecorder';
import { useTaskStore } from '../../src/stores/taskStore';
import { COLORS } from '../../src/constants/config';

export default function VoiceScreen() {
  const router = useRouter();
  const { state: recState, error, startRecording, stopRecording, reset } = useVoiceRecorder();
  const { parseVoice, isCreating, creation } = useTaskStore();

  const handleStop = async () => {
    const uri = await stopRecording();
    if (!uri) return;
    try {
      await parseVoice(uri);
    } catch {
      Alert.alert('Ошибка', 'Не удалось распознать речь. Попробуйте снова.');
    }
  };

  useEffect(() => {
    if (creation.taskId) {
      if (creation.nextQuestion) {
        router.replace('/(client)/clarify');
      } else {
        router.replace('/(client)/confirm');
      }
    }
  }, [creation.taskId, creation.nextQuestion]);

  const isProcessing = recState === 'stopping' || isCreating;
  const isRecording = recState === 'recording';

  const statusText = () => {
    if (isCreating) return 'Обрабатываем...';
    if (recState === 'stopping') return 'Загружаем...';
    if (isRecording) return 'Идёт запись...';
    if (recState === 'error') return 'Ошибка';
    return 'Нажмите и говорите';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => { reset(); router.back(); }} style={styles.back}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>

        <View style={styles.center}>
          <Text style={styles.title}>{statusText()}</Text>

          {error && <Text style={styles.error}>{error}</Text>}

          {isProcessing ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
          ) : (
            <TouchableOpacity
              style={[styles.voiceBtn, isRecording && styles.voiceBtnActive]}
              onPress={isRecording ? handleStop : startRecording}
            >
              <Text style={styles.voiceBtnIcon}>{isRecording ? '⏹' : '🎙️'}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.hint}>
            {isRecording ? 'Нажмите ещё раз чтобы остановить' : isProcessing ? 'Подождите...' : 'Скажите что нужно сделать'}
          </Text>

          {recState === 'error' && (
            <TouchableOpacity onPress={reset} style={styles.retryBtn}>
              <Text style={styles.retryText}>Попробовать снова</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 24 },
  back: { alignSelf: 'flex-start' },
  backText: { color: COLORS.primary, fontSize: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 40, textAlign: 'center' },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  spinner: { marginBottom: 24, width: 120, height: 120 },
  voiceBtn: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary, shadowOpacity: 0.4,
    shadowRadius: 20, elevation: 8,
  },
  voiceBtnActive: { backgroundColor: '#ef4444', shadowColor: '#ef4444' },
  voiceBtnIcon: { fontSize: 48 },
  hint: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center' },
  retryBtn: { marginTop: 20, padding: 12 },
  retryText: { color: COLORS.primary, fontSize: 16 },
});
