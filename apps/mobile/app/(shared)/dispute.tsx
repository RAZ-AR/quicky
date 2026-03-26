import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { api } from '../../src/services/api';
import { RADIUS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const DISPUTE_TYPES = [
  { key: 'not_delivered', label: '📦 Товар не доставлен' },
  { key: 'wrong_item',    label: '❌ Не тот товар'      },
  { key: 'damaged',       label: '💥 Товар повреждён'   },
  { key: 'overcharged',   label: '💸 Завышена цена'     },
  { key: 'other',         label: '❓ Другое'             },
] as const;

export default function DisputeScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const [disputeType, setDisputeType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { COLORS, GRADIENTS, isDark, blurTint } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  const canSubmit = !!disputeType && description.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!disputeType) { Alert.alert('Выберите тип спора'); return; }
    if (!description.trim()) { Alert.alert('Опишите проблему'); return; }
    setIsSubmitting(true);
    try {
      await api.post('/dispute', { task_id: taskId, dispute_type: disputeType, description: description.trim() });
      Alert.alert('Спор открыт', 'Мы рассмотрим вашу жалобу в течение 24 часов', [
        { text: 'ОК', onPress: () => router.replace('/(client)/tasks/') },
      ]);
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть спор');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowDanger} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
              <View style={styles.backBtnBg} />
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Открыть спор</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Text style={styles.title}>Что случилось?</Text>
            <Text style={styles.subtitle}>Выберите причину и опишите ситуацию</Text>

            {/* Type selection */}
            <View style={styles.typeList}>
              {DISPUTE_TYPES.map((d) => (
                <TouchableOpacity
                  key={d.key}
                  style={styles.typeBtn}
                  onPress={() => setDisputeType(d.key)}
                  activeOpacity={0.8}
                >
                  <BlurView intensity={18} tint={blurTint} style={StyleSheet.absoluteFill} />
                  <View style={[
                    styles.typeBg,
                    disputeType === d.key && { backgroundColor: COLORS.dangerGlow, borderColor: COLORS.danger + '60' },
                  ]} />
                  {disputeType === d.key && <View style={styles.typeCheck} />}
                  <Text style={[styles.typeText, disputeType === d.key && { color: '#FC8181', fontWeight: '600' }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <Text style={styles.inputLabel}>Опишите подробнее</Text>
            <View style={styles.inputWrap}>
              <BlurView intensity={18} tint={blurTint} style={StyleSheet.absoluteFill} />
              <View style={styles.inputBg} />
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Расскажите что произошло..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && { opacity: 0.45 }]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#EF4444', '#DC2626']} style={StyleSheet.absoluteFill} />
              <Text style={styles.submitText}>{isSubmitting ? 'Отправляем...' : '⚠️ Открыть спор'}</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, C_RADIUS = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },
    kav:  { flex: 1 },
    glowDanger: {
      position: 'absolute', top: '20%', right: -40,
      width: 220, height: 220, borderRadius: 110,
      backgroundColor: 'rgba(239,68,68,0.10)',
    },

    header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    backBtn:    { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    backBtnBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: 19, borderWidth: 1, borderColor: C.glassBorder },
    backIcon:   { color: C.text, fontSize: 18, position: 'relative' },
    headerTitle:{ flex: 1, fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center' },

    scroll: { paddingHorizontal: 20, paddingTop: 4 },

    title:    { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 6 },
    subtitle: { fontSize: 15, color: C.textMuted, marginBottom: 20, lineHeight: 22 },

    typeList: { gap: 8, marginBottom: 24 },
    typeBtn:  { borderRadius: C_RADIUS.lg, overflow: 'hidden' },
    typeBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.lg, borderWidth: 1, borderColor: C.glassBorder },
    typeCheck:{ position: 'absolute', right: 18, top: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger },
    typeText: { fontSize: 16, color: C.text, padding: 16, position: 'relative' },

    inputLabel: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 10 },
    inputWrap:  { borderRadius: C_RADIUS.xl, overflow: 'hidden', marginBottom: 24 },
    inputBg:    { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.xl, borderWidth: 1, borderColor: C.glassBorder },
    textArea:   { padding: 18, fontSize: 15, color: C.text, height: 140, position: 'relative', textAlignVertical: 'top' },

    submitBtn:  { borderRadius: C_RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center' },
    submitText: { fontSize: 16, fontWeight: '700', color: '#fff', position: 'relative' },
  });
}
