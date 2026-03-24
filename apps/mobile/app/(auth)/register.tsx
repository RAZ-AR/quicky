import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS } from '../../src/constants/config';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'client' | 'executor' | null>(null);
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { register, isLoading } = useAuthStore();

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите ваше имя');
      return;
    }
    if (!role) {
      Alert.alert('Ошибка', 'Выберите роль');
      return;
    }
    try {
      await register(phone, name.trim(), role);
      // authStore установит user → _layout перенаправит
    } catch {
      Alert.alert('Ошибка', 'Не удалось завершить регистрацию. Попробуйте снова.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>⚡ Quicky</Text>
        <Text style={styles.title}>Создать аккаунт</Text>
        <Text style={styles.subtitle}>Как вас зовут?</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ваше имя"
          autoCapitalize="words"
          autoFocus
          returnKeyType="next"
        />

        <Text style={styles.roleTitle}>Кем вы хотите быть?</Text>

        <TouchableOpacity
          style={[styles.roleCard, role === 'client' && styles.roleCardActive]}
          onPress={() => setRole('client')}
        >
          <Text style={styles.roleEmoji}>🛒</Text>
          <View style={styles.roleInfo}>
            <Text style={[styles.roleName, role === 'client' && styles.roleNameActive]}>Клиент</Text>
            <Text style={styles.roleDesc}>Создаю задания — купить, доставить, помочь</Text>
          </View>
          {role === 'client' && <Text style={styles.check}>✓</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, role === 'executor' && styles.roleCardActive]}
          onPress={() => setRole('executor')}
        >
          <Text style={styles.roleEmoji}>🚴</Text>
          <View style={styles.roleInfo}>
            <Text style={[styles.roleName, role === 'executor' && styles.roleNameActive]}>Исполнитель</Text>
            <Text style={styles.roleDesc}>Выполняю задания и зарабатываю</Text>
          </View>
          {role === 'executor' && <Text style={styles.check}>✓</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, (!name.trim() || !role || isLoading) && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={!name.trim() || !role || isLoading}
        >
          <Text style={styles.btnText}>
            {isLoading ? 'Создаём аккаунт...' : 'Начать'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { padding: 24, paddingTop: 60 },
  logo: { fontSize: 32, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, marginBottom: 16 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 16, fontSize: 18, color: COLORS.text, marginBottom: 32,
    backgroundColor: COLORS.card,
  },
  roleTitle: { fontSize: 15, color: COLORS.textMuted, marginBottom: 12 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 16, marginBottom: 12, backgroundColor: COLORS.card,
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  roleEmoji: { fontSize: 32, marginRight: 12 },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  roleNameActive: { color: COLORS.primary },
  roleDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  check: { fontSize: 20, color: COLORS.primary, fontWeight: '700' },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
