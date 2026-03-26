import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS, RADIUS, GRADIENTS } from '../../src/constants/config';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const { sendOtp, isLoading } = useAuthStore();
  const router = useRouter();

  const handleNext = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 9) { Alert.alert('Ошибка', 'Введите корректный номер телефона'); return; }
    try {
      await sendOtp(cleaned);
      router.push({ pathname: '/(auth)/verify', params: { phone: cleaned } });
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить код. Попробуйте снова.');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glow1} />
      <View style={styles.glow2} />

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
            <Text style={styles.tagline}>Быстрые поручения рядом</Text>

            {/* Form card */}
            <View style={styles.formCard}>
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.formCardBg} />
              <View style={{ position: 'relative', padding: 24 }}>
                <Text style={styles.title}>Введите номер телефона</Text>
                <Text style={styles.subtitle}>Мы отправим вам код подтверждения</Text>

                <View style={styles.inputWrap}>
                  <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={styles.inputBg} />
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+381 60 123 4567"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={handleNext}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btn, (!phone || isLoading) && { opacity: 0.45 }]}
                  onPress={handleNext}
                  disabled={!phone || isLoading}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
                  <Text style={styles.btnText}>{isLoading ? 'Отправляем...' : 'Получить код →'}</Text>
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
  glow1: { position: 'absolute', top: '15%', left: '10%',  width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(139,92,246,0.18)' },
  glow2: { position: 'absolute', top: '45%', right: '-5%', width: 180, height: 180, borderRadius: 90,  backgroundColor: 'rgba(6,182,212,0.12)' },

  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  logoWrap:   { width: 80, height: 80, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  logoEmoji:  { fontSize: 40, position: 'relative' },
  logoText:   { fontSize: 36, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  tagline:    { fontSize: 15, color: COLORS.textMuted, marginBottom: 32 },

  formCard:   { borderRadius: RADIUS.xxl, overflow: 'hidden', width: '100%' },
  formCardBg: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: COLORS.glassBorder },

  title:    { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20, lineHeight: 20 },

  inputWrap: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 16 },
  inputBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bgLayer, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  input:     { padding: 18, fontSize: 18, color: COLORS.text, position: 'relative' },

  btn:     { borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff', position: 'relative' },
});
