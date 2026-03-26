import { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useVoiceRecorder } from '../../src/hooks/useVoiceRecorder';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function VoiceScreen() {
  const router = useRouter();
  const { state: recState, error, startRecording, stopRecording, reset } = useVoiceRecorder();
  const { parseVoice, isCreating, creation } = useTaskStore();
  const { COLORS, GRADIENTS, isDark, blurTint } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

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
    : isRecording ? 'Идёт запись...'
    : recState === 'error' ? 'Ошибка записи'
    : 'Нажмите и говорите';

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />

      {/* Ambient glow — меняется в зависимости от состояния */}
      <View style={[styles.glow, {
        backgroundColor: isRecording ? 'rgba(244,63,94,0.20)'
          : isProcessing ? 'rgba(139,92,246,0.20)'
          : 'rgba(139,92,246,0.12)',
      }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Back */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => { reset(); router.back(); }} style={styles.backBtn}>
            <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
            <View style={styles.backBtnBg} />
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.center}>
          {/* Status */}
          <Text style={styles.status}>{statusText}</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Mic button or spinner */}
          {isProcessing ? (
            <View style={styles.spinnerWrap}>
              <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
              <View style={styles.spinnerBg} />
              <ActivityIndicator size="large" color={COLORS.primary} style={{ position: 'relative' }} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.micBtn}
              onPress={isRecording ? handleStop : startRecording}
              activeOpacity={0.85}
            >
              {/* Ring glow */}
              {isRecording && <View style={styles.micRing} />}

              <BlurView intensity={25} tint={blurTint} style={StyleSheet.absoluteFill} />
              {isRecording ? (
                <LinearGradient colors={GRADIENTS.danger} style={StyleSheet.absoluteFill} />
              ) : (
                <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
              )}
              <View style={styles.micBorder} />
              <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎙️'}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.hint}>
            {isRecording ? 'Нажмите ещё раз чтобы остановить'
              : isProcessing ? 'Подождите...'
              : 'Скажите что нужно сделать'}
          </Text>

          {recState === 'error' && (
            <TouchableOpacity onPress={reset} style={styles.retryBtn}>
              <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
              <View style={styles.retryBg} />
              <Text style={styles.retryText}>Попробовать снова</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, C_RADIUS = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },

    glow: { position: 'absolute', top: '20%', left: '15%', width: 280, height: 280, borderRadius: 140 },

    topBar:    { paddingHorizontal: 20, paddingTop: 8 },
    backBtn:   { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    backBtnBg: { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: 19, borderWidth: 1, borderColor: C.glassBorder },
    backIcon:  { color: C.text, fontSize: 18, position: 'relative' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

    status:    { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 48, textAlign: 'center' },
    errorText: { color: C.danger, fontSize: 14, marginBottom: 20, textAlign: 'center' },

    spinnerWrap: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
    spinnerBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderWidth: 1, borderColor: C.glassBorder },

    micBtn:  { width: 140, height: 140, borderRadius: 70, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
    micRing: {
      position: 'absolute', width: 170, height: 170, borderRadius: 85,
      borderWidth: 2, borderColor: C.danger + '50',
      backgroundColor: C.dangerGlow,
    },
    micBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 70, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)' },
    micIcon:   { fontSize: 56, position: 'relative' },

    hint: { fontSize: 15, color: C.textMuted, textAlign: 'center', lineHeight: 22 },

    retryBtn: { marginTop: 28, borderRadius: C_RADIUS.full, overflow: 'hidden', paddingHorizontal: 24, paddingVertical: 12 },
    retryBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: C.glassViolet, borderRadius: C_RADIUS.full, borderWidth: 1, borderColor: C.primary + '50' },
    retryText:{ color: C.primaryLight, fontSize: 15, fontWeight: '600', position: 'relative' },
  });
}
