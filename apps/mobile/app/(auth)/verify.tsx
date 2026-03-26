import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS, RADIUS, GRADIENTS } from '../../src/constants/config';

export default function VerifyScreen() {
  const [code, setCode] = useState('');
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, isLoading } = useAuthStore();
  const router = useRouter();

  const handleVerify = async () => {
    if (code.length < 4) { Alert.alert('Ошибка', 'Введите код из SMS'); return; }
    try {
      const { is_new_user } = await verifyOtp(phone, code);
      if (is_new_user) router.replace({ pathname: '/(auth)/register', params: { phone } });
    } catch {
      Alert.alert('Ошибка', 'Неверный код. Попробуйте снова.');
      setCode('');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowCenter} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inner}>

            {/* Logo */}
            <View style={styles.logoWrap}>
              <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
              <View style={styles.logoBorder} />
              <Text style={styles.logoEmoji}>⚡</Text>
            </View>
            <Text style={styles.logoText}>Quicky</Text>

            <View style={styles.formCard}>
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.formCardBg} />
              <View style={{ position: 'relative', padding: 24 }}>
                <Text style={styles.title}>Введите код</Text>
                <Text style={styles.subtitle}>Мы отправили SMS на номер{'\n'}{phone}</Text>

                <View style={styles.inputWrap}>
                  <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={styles.inputBg} />
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    placeholder="• • • •"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleVerify}
                    textAlign="center"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btn, (!code || isLoading) && { opacity: 0.45 }]}
                  onPress={handleVerify}
                  disabled={!code || isLoading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
                  <Text style={styles.btnText}>{isLoading ? 'Проверяем...' : 'Подтвердить'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                  <Text style={styles.backText}>← Изменить номер</Text>
                </TouchableOpacity>
              </View>
            </View>

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
  glowCenter: { position: 'absolute', top: '20%', left: '15%', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(139,92,246,0.15)' },

  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  logoWrap:   { width: 72, height: 72, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  logoEmoji:  { fontSize: 36, position: 'relative' },
  logoText:   { fontSize: 30, fontWeight: '800', color: COLORS.text, marginBottom: 28 },

  formCard:   { borderRadius: RADIUS.xxl, overflow: 'hidden', width: '100%' },
  formCardBg: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: COLORS.glassBorder },

  title:    { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20, lineHeight: 20 },

  inputWrap: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 16 },
  inputBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bgLayer, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  input:     { padding: 18, fontSize: 32, fontWeight: '700', color: COLORS.text, letterSpacing: 10, position: 'relative' },

  btn:     { borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff', position: 'relative' },

  backBtn:  { paddingVertical: 12, alignItems: 'center' },
  backText: { color: COLORS.primaryLight, fontSize: 15 },
});
