import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTaskStore } from '../../src/stores/taskStore';
import { COLORS } from '../../src/constants/config';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Наличные', icon: '💵' },
  { key: 'card', label: 'Карта', icon: '💳' },
];

export default function ConfirmScreen() {
  const router = useRouter();
  const { creation, confirmTask, resetCreation } = useTaskStore();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isConfirming, setIsConfirming] = useState(false);

  const parsed = creation.parsed;
  if (!parsed) return null;

  const suggestedPrice = parsed.price_suggested ?? 500;
  const [price] = useState(suggestedPrice);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await confirmTask(price, paymentMethod);
      resetCreation();
      router.replace('/(client)/tasks/');
    } catch {
      Alert.alert('Ошибка', 'Не удалось создать задание. Попробуйте снова.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    resetCreation();
    router.replace('/(client)/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Проверьте задание</Text>

        <View style={styles.card}>
          {parsed.category && <Row label="Категория" value={parsed.category} />}
          <Row label="Что нужно" value={parsed.item_description ?? '—'} />
          {parsed.from_location && <Row label="Откуда" value={parsed.from_location.address} />}
          <Row label="Куда" value={parsed.to_location?.address ?? '—'} />
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Стоимость</Text>
          <Text style={styles.priceValue}>{price} ₽</Text>
          <Text style={styles.priceHint}>Рекомендовано AI</Text>
        </View>

        <Text style={styles.sectionTitle}>Способ оплаты</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.paymentBtn, paymentMethod === m.key && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod(m.key)}
            >
              <Text style={styles.paymentIcon}>{m.icon}</Text>
              <Text style={[styles.paymentLabel, paymentMethod === m.key && styles.paymentLabelActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, isConfirming && styles.btnDisabled]}
          onPress={handleConfirm}
          disabled={isConfirming}
        >
          <Text style={styles.confirmBtnText}>
            {isConfirming ? 'Публикуем...' : `Опубликовать за ${price} ₽`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Отмена</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { flex: 1, fontSize: 14, color: COLORS.textMuted },
  rowValue: { flex: 2, fontSize: 14, fontWeight: '500', color: COLORS.text },
  priceCard: {
    backgroundColor: COLORS.primary + '15', borderRadius: 16,
    padding: 20, marginBottom: 20, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  priceLabel: { fontSize: 14, color: COLORS.primary, marginBottom: 4 },
  priceValue: { fontSize: 36, fontWeight: '800', color: COLORS.primary },
  priceHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  paymentRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  paymentBtn: {
    flex: 1, borderRadius: 12, padding: 14, alignItems: 'center',
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
  },
  paymentBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  paymentIcon: { fontSize: 24, marginBottom: 4 },
  paymentLabel: { fontSize: 14, color: COLORS.text },
  paymentLabelActive: { color: COLORS.primary, fontWeight: '600' },
  confirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  btnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 16, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontSize: 15 },
});
