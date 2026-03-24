import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS } from '../../src/constants/config';

export default function VerifyScreen() {
  const [code, setCode] = useState('');
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, isLoading } = useAuthStore();
  const router = useRouter();

  const handleVerify = async () => {
    if (code.length < 4) {
      Alert.alert('Ошибка', 'Введите код из SMS');
      return;
    }
    try {
      const { is_new_user } = await verifyOtp(phone, code);
      if (is_new_user) {
        router.replace({ pathname: '/(auth)/register', params: { phone } });
      }
      // Если не новый — authStore уже установил user, _layout перенаправит
    } catch {
      Alert.alert('Ошибка', 'Неверный код. Попробуйте снова.');
      setCode('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>⚡ Quicky</Text>
        <Text style={styles.title}>Введите код</Text>
        <Text style={styles.subtitle}>Мы отправили SMS на номер{'\n'}{phone}</Text>

        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="1234"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleVerify}
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.btn, (!code || isLoading) && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={!code || isLoading}
        >
          <Text style={styles.btnText}>
            {isLoading ? 'Проверяем...' : 'Подтвердить'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Изменить номер</Text>
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
  subtitle: { fontSize: 15, color: COLORS.textMuted, marginBottom: 32, lineHeight: 22 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 16, fontSize: 32, fontWeight: '700', color: COLORS.text, marginBottom: 16,
    backgroundColor: COLORS.card, letterSpacing: 8,
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { marginTop: 20, alignItems: 'center' },
  backText: { color: COLORS.primary, fontSize: 15 },
});
