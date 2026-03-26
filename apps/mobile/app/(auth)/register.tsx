import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS, RADIUS, GRADIENTS } from '../../src/constants/config';

const ROLES = [
  { key: 'client'   as const, emoji: '🛒', name: 'Клиент',      desc: 'Создаю задания — купить, доставить, помочь', gradient: GRADIENTS.primary },
  { key: 'executor' as const, emoji: '⚡', name: 'Исполнитель', desc: 'Выполняю задания и зарабатываю',              gradient: GRADIENTS.executor },
];

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'client' | 'executor' | null>(null);
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { register, isLoading } = useAuthStore();

  const handleRegister = async () => {
    if (!name.trim()) { Alert.alert('Ошибка', 'Введите ваше имя'); return; }
    if (!role)        { Alert.alert('Ошибка', 'Выберите роль');    return; }
    try {
      await register(phone, name.trim(), role);
    } catch {
      Alert.alert('Ошибка', 'Не удалось завершить регистрацию. Попробуйте снова.');
    }
  };

  const canSubmit = name.trim().length > 0 && !!role && !isLoading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Logo */}
            <View style={styles.logoArea}>
              <View style={styles.logoWrap}>
                <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
                <View style={styles.logoBorder} />
                <Text style={styles.logoEmoji}>⚡</Text>
              </View>
              <Text style={styles.logoText}>Quicky</Text>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.formCardBg} />
              <View style={{ position: 'relative', padding: 24 }}>
                <Text style={styles.title}>Создать аккаунт</Text>
                <Text style={styles.subtitle}>Как вас зовут?</Text>

                <View style={styles.inputWrap}>
                  <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={styles.inputBg} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ваше имя"
                    placeholderTextColor={COLORS.textLight}
                    autoCapitalize="words"
                    autoFocus
                    returnKeyType="next"
                  />
                </View>

                <Text style={styles.roleTitle}>Кем вы хотите быть?</Text>

                <View style={styles.rolesRow}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      style={styles.roleCard}
                      onPress={() => setRole(r.key)}
                      activeOpacity={0.85}
                    >
                      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
                      <View style={[
                        styles.roleCardBg,
                        role === r.key && { backgroundColor: r.key === 'client' ? COLORS.glassViolet : COLORS.glassCyan, borderColor: (r.key === 'client' ? COLORS.primary : COLORS.executor) + '60' },
                      ]} />
                      {role === r.key && (
                        <LinearGradient colors={r.gradient} style={[StyleSheet.absoluteFill, { opacity: 0.12 }]} />
                      )}
                      {role === r.key && <View style={[styles.roleCheck, { backgroundColor: r.key === 'client' ? COLORS.primary : COLORS.executor }]} />}
                      <View style={{ position: 'relative', alignItems: 'center', padding: 16 }}>
                        <Text style={styles.roleEmoji}>{r.emoji}</Text>
                        <Text style={[styles.roleName, role === r.key && { color: r.key === 'client' ? COLORS.primaryLight : COLORS.executorLight }]}>{r.name}</Text>
                        <Text style={styles.roleDesc}>{r.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.btn, !canSubmit && { opacity: 0.45 }]}
                  onPress={handleRegister}
                  disabled={!canSubmit}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={role === 'executor' ? GRADIENTS.executor : GRADIENTS.primary} style={StyleSheet.absoluteFill} />
                  <Text style={styles.btnText}>{isLoading ? 'Создаём аккаунт...' : 'Начать →'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  kav:  { flex: 1 },
  glow1: { position: 'absolute', top: '5%',  left: '5%',  width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(139,92,246,0.15)' },
  glow2: { position: 'absolute', top: '50%', right: '-5%',width: 180, height: 180, borderRadius: 90,  backgroundColor: 'rgba(6,182,212,0.10)' },

  scroll: { paddingHorizontal: 24, paddingTop: 20 },

  logoArea: { alignItems: 'center', marginBottom: 24 },
  logoWrap: { width: 68, height: 68, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoBorder:{ ...StyleSheet.absoluteFillObject, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  logoEmoji: { fontSize: 34, position: 'relative' },
  logoText:  { fontSize: 28, fontWeight: '800', color: COLORS.text },

  formCard:   { borderRadius: RADIUS.xxl, overflow: 'hidden' },
  formCardBg: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: COLORS.glassBorder },

  title:    { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 16 },

  inputWrap: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 24 },
  inputBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bgLayer, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  input:     { padding: 18, fontSize: 18, color: COLORS.text, position: 'relative' },

  roleTitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 12, fontWeight: '600' },

  rolesRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleCard:    { flex: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  roleCardBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  roleCheck:   { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
  roleEmoji:   { fontSize: 28, marginBottom: 6 },
  roleName:    { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4, textAlign: 'center' },
  roleDesc:    { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 16 },

  btn:     { borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff', position: 'relative' },
});
