import { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useVoiceRecorder } from '../../src/hooks/useVoiceRecorder';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function VoiceScreen() {
  const router = useRouter();
  const { state: recState, error, startRecording, stopRecording, reset } = useVoiceRecorder();
  const { parseVoice, isCreating, creation } = useTaskStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  const handleStop = async () => {
    const uri = await stopRecording();
    if (!uri) return;
    try { await parseVoice(uri); }
    catch { Alert.alert('Ошибка', 'Не удалось распознать речь. Попробуйте снова.'); }
  };

  useEffect(() => {
    if (creation.taskId) {
      if (creation.nextQuestion) router.replace('/(client)/clarify');
      else router.replace('/(client)/confirm');
    }
  }, [creation.taskId, creation.nextQuestion]);

  const isProcessing = recState === 'stopping' || isCreating;
  const isRecording  = recState === 'recording';

  const statusText = isCreating ? 'Обрабатываем...'
    : recState === 'stopping' ? 'Загружаем...'
    : isRecording ? 'Слушаю...'
    : recState === 'error' ? 'Ошибка записи'
    : 'Нажмите и говорите';

  // Voice screen always uses dark ink background
  const micBg = isRecording
    ? '#D93838'
    : isProcessing
    ? '#D6F24A'
    : 'rgba(255,255,255,0.10)';

  const micIconColor = isProcessing ? '#14141A' : '#fff';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => { reset(); router.back(); }}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Голосовой ввод</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Center content */}
        <View style={styles.center}>
          <Text style={styles.status}>{statusText}</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Mic button or spinner */}
          {isProcessing ? (
            <View style={[styles.micWrap, { backgroundColor: COLORS.bgLayer, borderColor: COLORS.border }]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.micBtn, { backgroundColor: micBg }]}
              onPress={isRecording ? handleStop : startRecording}
              activeOpacity={0.85}
            >
              <Text style={[styles.micIcon, { color: micIconColor }]}>
                {isRecording ? '⏹' : '🎙️'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.hint}>
            {isRecording ? 'Нажмите чтобы остановить'
              : isProcessing ? 'Подождите, обрабатываем...'
              : 'Расскажите что нужно сделать'}
          </Text>

          {recState === 'error' && (
            <TouchableOpacity onPress={reset} style={styles.retryBtn} activeOpacity={0.7}>
              <Text style={styles.retryText}>Попробовать снова</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0E0E10' },
    safe: { flex: 1 },

    // Top bar
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center', justifyContent: 'center',
    },
    backIcon:  { color: '#fff', fontSize: 18 },
    topTitle:  { fontSize: 17, fontWeight: '700', color: '#fff' },

    // Center
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

    status: {
      fontSize: 22, fontWeight: '700', color: '#fff',
      marginBottom: 56, textAlign: 'center', letterSpacing: -0.3,
    },
    errorText: { color: '#FF6B6B', fontSize: 14, marginBottom: 20, textAlign: 'center' },

    // Mic button
    micBtn: {
      width: 140, height: 140, borderRadius: 70,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 48,
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.10)',
    },
    micWrap: {
      width: 140, height: 140, borderRadius: 70,
      borderWidth: 2, borderColor: '#D6F24A',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 48,
    },
    micIcon: { fontSize: 52 },

    hint: {
      fontSize: 15, color: 'rgba(255,255,255,0.50)', textAlign: 'center',
      lineHeight: 22, maxWidth: 260,
    },

    retryBtn: {
      marginTop: 32, borderRadius: R.full,
      backgroundColor: 'rgba(255,255,255,0.08)',
      paddingHorizontal: 24, paddingVertical: 12,
    },
    retryText: { color: '#D6F24A', fontSize: 15, fontWeight: '600' },
  });
}
