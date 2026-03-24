import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS } from '../../src/constants/config';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const { sendOtp, isLoading } = useAuthStore();
  const router = useRouter();

  const handleNext = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 9) {
      Alert.alert('Ошибка', 'Введите корректный номер телефона');
      return;
    }
    try {
      await sendOtp(cleaned);
      router.push({ pathname: '/(auth)/verify', params: { phone: cleaned } });
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить код. Попробуйте снова.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>⚡ Quicky</Text>
        <Text style={styles.title}>Введите номер телефона</Text>
        <Text style={styles.subtitle}>Мы отправим вам код подтверждения</Text>

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+381 60 123 4567"
          keyboardType="phone-pad"
          autoFocus
          returnKeyType="next"
          onSubmitEditing={handleNext}
        />

        <TouchableOpacity
          style={[styles.btn, (!phone || isLoading) && styles.btnDisabled]}
          onPress={handleNext}
          disabled={!phone || isLoading}
        >
          <Text style={styles.btnText}>
            {isLoading ? 'Отправляем...' : 'Получить код'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: { fontSize: 32, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, marginBottom: 32 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 16, fontSize: 18, color: COLORS.text, marginBottom: 16,
    backgroundColor: COLORS.card,
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
