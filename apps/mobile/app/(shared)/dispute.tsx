import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/services/api';
import { COLORS } from '../../src/constants/config';

const DISPUTE_TYPES = [
  { key: 'not_delivered', label: 'Товар не доставлен' },
  { key: 'wrong_item', label: 'Не тот товар' },
  { key: 'damaged', label: 'Товар повреждён' },
  { key: 'overcharged', label: 'Завышена цена' },
  { key: 'other', label: 'Другое' },
] as const;

export default function DisputeScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const [disputeType, setDisputeType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!disputeType) {
      Alert.alert('Выберите тип спора');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Опишите проблему');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/dispute', {
        task_id: taskId,
        dispute_type: disputeType,
        description: description.trim(),
      });
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Открыть спор</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Что случилось?</Text>

        {DISPUTE_TYPES.map((d) => (
          <TouchableOpacity
            key={d.key}
            style={[styles.typeBtn, disputeType === d.key && styles.typeBtnActive]}
            onPress={() => setDisputeType(d.key)}
          >
            <Text style={[styles.typeText, disputeType === d.key && styles.typeTextActive]}>
              {d.label}
            </Text>
            {disputeType === d.key && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Опишите подробнее</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Расскажите что произошло..."
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.btn, (!disputeType || !description.trim() || isSubmitting) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!disputeType || !description.trim() || isSubmitting}
        >
          <Text style={styles.btnText}>{isSubmitting ? 'Отправляем...' : 'Открыть спор'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { color: COLORS.primary, fontSize: 16, width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  container: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 14, marginBottom: 8, backgroundColor: COLORS.card,
  },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  typeText: { flex: 1, fontSize: 15, color: COLORS.text },
  typeTextActive: { color: COLORS.primary, fontWeight: '600' },
  check: { fontSize: 18, color: COLORS.primary, fontWeight: '700' },
  label: { fontSize: 15, color: COLORS.textMuted, marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    padding: 16, fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.card, height: 130, marginBottom: 24,
  },
  btn: {
    backgroundColor: '#ef4444', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
