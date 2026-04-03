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

  const micBg = isRecording
    ? COLORS.danger
    : isProcessing
    ? COLORS.primary
    : COLORS.glassViolet;

  const micIconColor = (isRecording || isProcessing) ? '#fff' : COLORS.text;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

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
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },

    // Top bar
    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: C.bgLayer,
      borderWidth: 1, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    backIcon:  { color: C.text, fontSize: 18 },
    topTitle:  { fontSize: 17, fontWeight: '700', color: C.text },

    // Center
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

    status: {
      fontSize: 22, fontWeight: '700', color: C.text,
      marginBottom: 56, textAlign: 'center', letterSpacing: -0.3,
    },
    errorText: { color: C.danger, fontSize: 14, marginBottom: 20, textAlign: 'center' },

    // Mic button
    micBtn: {
      width: 130, height: 130, borderRadius: 65,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 48,
    },
    micWrap: {
      width: 110, height: 110, borderRadius: 55,
      borderWidth: 1,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 48,
    },
    micIcon: { fontSize: 52 },

    hint: {
      fontSize: 15, color: C.textMuted, textAlign: 'center',
      lineHeight: 22, maxWidth: 260,
    },

    retryBtn: {
      marginTop: 32, borderRadius: R.full,
      backgroundColor: C.bgLayer,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 24, paddingVertical: 12,
    },
    retryText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  });
}
