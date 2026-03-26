import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTaskStore } from '../../src/stores/taskStore';
import { COLORS, RADIUS, GRADIENTS } from '../../src/constants/config';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Наличные', icon: '💵' },
  { key: 'card', label: 'Карта',    icon: '💳' },
];

export default function ConfirmScreen() {
  const router = useRouter();
  const { creation, confirmTask, resetCreation } = useTaskStore();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isConfirming, setIsConfirming] = useState(false);

  const parsed = creation.parsed;
  if (!parsed) return null;

  const price = parsed.price_suggested ?? 500;

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

  const handleCancel = () => { resetCreation(); router.replace('/(client)/'); };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowAccent} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Back */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.backBtnBg} />
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Проверьте задание</Text>
          <Text style={styles.subtitle}>Всё верно? Публикуем — исполнители увидят заказ</Text>

          {/* Task details card */}
          <View style={styles.card}>
            <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.cardBg} />
            <View style={{ position: 'relative', padding: 20 }}>
              {parsed.category && <DetailRow label="📌 Категория"   value={parsed.category} />}
              <DetailRow label="📦 Что нужно"   value={parsed.item_description ?? '—'} />
              {parsed.from_location && <DetailRow label="🏪 Откуда"  value={parsed.from_location.address} />}
              <DetailRow label="📍 Куда"         value={parsed.to_location?.address ?? '—'} last />
            </View>
          </View>

          {/* Price hero */}
          <View style={styles.priceCard}>
            <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(139,92,246,0.35)', 'rgba(6,182,212,0.20)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.priceBorder} />
            <View style={{ position: 'relative', padding: 20, alignItems: 'center' }}>
              <Text style={styles.priceLabel}>Рекомендованная стоимость</Text>
              <Text style={styles.priceValue}>{price} ₽</Text>
              <View style={styles.aiPill}>
                <Text style={styles.aiPillText}>✦ Рассчитано AI</Text>
              </View>
            </View>
          </View>

          {/* Payment method */}
          <Text style={styles.sectionTitle}>Способ оплаты</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={styles.paymentBtn}
                onPress={() => setPaymentMethod(m.key)}
                activeOpacity={0.8}
              >
                <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[
                  styles.paymentBg,
                  paymentMethod === m.key && { backgroundColor: COLORS.glassViolet, borderColor: COLORS.primary + '60' },
                ]} />
                {paymentMethod === m.key && (
                  <LinearGradient colors={GRADIENTS.primary} style={styles.paymentActiveGlow} />
                )}
                <Text style={styles.paymentIcon}>{m.icon}</Text>
                <Text style={[styles.paymentLabel, paymentMethod === m.key && { color: COLORS.primaryLight, fontWeight: '700' }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            style={[styles.confirmBtn, isConfirming && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={isConfirming}
            activeOpacity={0.85}
          >
            <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
            <Text style={styles.confirmText}>
              {isConfirming ? 'Публикуем...' : `Опубликовать за ${price} ₽`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Отмена</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  glowAccent: {
    position: 'absolute', top: '20%', right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },

  topBar:    { paddingHorizontal: 20, paddingTop: 8 },
  backBtn:   { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  backBtnBg: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: 19, borderWidth: 1, borderColor: COLORS.glassBorder },
  backIcon:  { color: COLORS.text, fontSize: 18, position: 'relative' },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  title:    { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, marginBottom: 20, lineHeight: 22 },

  card:   { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 16 },
  cardBg: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },

  row:        { flexDirection: 'row', paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  rowLabel:   { flex: 1, fontSize: 14, color: COLORS.textMuted },
  rowValue:   { flex: 2, fontSize: 14, fontWeight: '500', color: COLORS.text },

  priceCard:   { borderRadius: RADIUS.xxl, overflow: 'hidden', marginBottom: 20 },
  priceBorder: { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS.xxl, borderWidth: 1, borderColor: COLORS.glassBorder },
  priceLabel:  { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  priceValue:  { fontSize: 44, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  aiPill: {
    backgroundColor: COLORS.glassViolet, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  aiPillText: { fontSize: 12, color: COLORS.primaryLight, fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  paymentRow:   { flexDirection: 'row', gap: 12, marginBottom: 24 },
  paymentBtn:   { flex: 1, borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center' },
  paymentBg:    { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  paymentActiveGlow: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
  paymentIcon:  { fontSize: 26, marginBottom: 4, position: 'relative' },
  paymentLabel: { fontSize: 14, color: COLORS.text, position: 'relative' },

  confirmBtn:  { borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#fff', position: 'relative' },

  cancelBtn:  { paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontSize: 15 },
});
