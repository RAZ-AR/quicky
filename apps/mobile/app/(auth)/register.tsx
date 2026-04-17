import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { RADIUS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

// Quicky static palette (register is always light)
const Q = {
  bg:    '#F3F1EC',
  card:  '#FFFFFF',
  ink:   '#14141A',
  ink50: 'rgba(20,20,26,0.52)',
  ink08: 'rgba(20,20,26,0.08)',
  acid:  '#D6F24A',
  mint:  '#C9E9D0',
};

export default function RegisterScreen() {
  const { temp_token, suggested_name } = useLocalSearchParams<{ temp_token: string; suggested_name: string }>();
  const [name, setName] = useState(suggested_name ?? '');
  const [role, setRole] = useState<'client' | 'executor' | null>(null);
  const { completeSocialRegistration, isLoading } = useAuthStore();
  const { isDark } = useAppTheme();

  const ROLES = [
    { key: 'client'   as const, emoji: '🛍️', title: 'Заказчик',    desc: 'Создаю задания',      activeBg: Q.acid },
    { key: 'executor' as const, emoji: '⚡',  title: 'Исполнитель', desc: 'Выполняю и зарабатываю', activeBg: Q.mint },
  ];

  const handleRegister = async () => {
    if (!name.trim()) { Alert.alert('Ошибка', 'Введите ваше имя'); return; }
    if (!role)        { Alert.alert('Ошибка', 'Выберите роль');    return; }
    if (!temp_token)  { Alert.alert('Ошибка', 'Сессия истекла, войдите снова'); return; }
    try {
      await completeSocialRegistration(temp_token, name.trim(), role);
    } catch {
      Alert.alert('Ошибка', 'Не удалось завершить регистрацию. Попробуйте снова.');
    }
  };

  const canSubmit = name.trim().length > 0 && !!role && !isLoading;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Logo */}
            <View style={s.logoArea}>
              <View style={s.logoMark}>
                <Text style={{ fontSize: 32 }}>⚡</Text>
              </View>
              <Text style={s.logoText}>Quicky</Text>
            </View>

            {/* Form card */}
            <View style={s.card}>
              <Text style={s.title}>Создать аккаунт</Text>
              <Text style={s.subtitle}>Как вас зовут?</Text>

              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="Ваше имя"
                placeholderTextColor={Q.ink50}
                autoCapitalize="words"
                autoFocus
                returnKeyType="next"
              />

              <Text style={s.roleTitle}>Кем вы хотите быть?</Text>

              <View style={s.rolesRow}>
                {ROLES.map((r) => {
                  const isActive = role === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[s.roleCard, isActive && { backgroundColor: r.activeBg, borderColor: 'transparent' }]}
                      onPress={() => setRole(r.key)}
                      activeOpacity={0.85}
                    >
                      <View style={s.roleIconWrap}>
                        <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
                      </View>
                      <Text style={[s.roleName, isActive && { color: Q.ink }]}>{r.title}</Text>
                      <Text style={[s.roleDesc, isActive && { color: `${Q.ink}80` }]}>{r.desc}</Text>
                      {isActive && (
                        <View style={s.roleCheck}>
                          <Text style={{ fontSize: 11, color: Q.ink }}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[s.btn, !canSubmit && { opacity: 0.45 }]}
                onPress={handleRegister}
                disabled={!canSubmit}
                activeOpacity={0.85}
              >
                <Text style={s.btnText}>{isLoading ? 'Создаём аккаунт...' : 'Начать →'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const cardShadow = {
  shadowColor: '#14141A', shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Q.bg },
  safe: { flex: 1 },
  kav:  { flex: 1 },

  scroll: { paddingHorizontal: 24, paddingTop: 20 },

  logoArea: { alignItems: 'center', marginBottom: 24, gap: 8 },
  logoMark: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: Q.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 28, fontWeight: '800', color: Q.ink, letterSpacing: -1 },

  card: {
    backgroundColor: Q.card, borderRadius: RADIUS.xxl, padding: 24,
    ...cardShadow,
  },

  title:    { fontSize: 22, fontWeight: '800', color: Q.ink, marginBottom: 6, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: Q.ink50, marginBottom: 16 },

  input: {
    backgroundColor: Q.bg, borderRadius: RADIUS.xl,
    borderWidth: 1.5, borderColor: Q.ink08,
    padding: 18, fontSize: 18, color: Q.ink, marginBottom: 24,
  },

  roleTitle: { fontSize: 14, color: Q.ink50, marginBottom: 12, fontWeight: '600' },

  rolesRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleCard: {
    flex: 1, borderRadius: RADIUS.xl, padding: 16, alignItems: 'center', gap: 6,
    backgroundColor: Q.bg, borderWidth: 2, borderColor: Q.ink08,
    position: 'relative',
  },
  roleIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.50)',
    alignItems: 'center', justifyContent: 'center',
  },
  roleName: { fontSize: 14, fontWeight: '800', color: Q.ink, textAlign: 'center' },
  roleDesc: { fontSize: 11, color: Q.ink50, textAlign: 'center', lineHeight: 14 },
  roleCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.60)',
    alignItems: 'center', justifyContent: 'center',
  },

  btn: {
    borderRadius: 999, paddingVertical: 16, alignItems: 'center',
    backgroundColor: Q.ink,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20, shadowRadius: 10, elevation: 6,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: Q.acid, letterSpacing: -0.2 },
});
