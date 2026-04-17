import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Наличные', icon: '💵' },
  { key: 'card', label: 'Карта',    icon: '💳' },
];

export default function ConfirmScreen() {
  const router = useRouter();
  const { creation, confirmTask, resetCreation } = useTaskStore();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isConfirming, setIsConfirming] = useState(false);
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

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

  const handleCancel = () => { resetCreation(); router.replace('/(client)'); };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Back */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Проверьте задание</Text>
          <Text style={styles.subtitle}>Всё верно? Публикуем — исполнители увидят заказ</Text>

          {/* Task details card */}
          <View style={styles.card}>
            {parsed.category && <DetailRow label="📌 Категория"   value={parsed.category} styles={styles} />}
            <DetailRow label="📦 Что нужно"   value={parsed.item_description ?? '—'} styles={styles} />
            {parsed.from_location && <DetailRow label="🏪 Откуда"  value={parsed.from_location.address} styles={styles} />}
            <DetailRow label="📍 Куда"         value={parsed.to_location?.address ?? '—'} last styles={styles} />
          </View>

          {/* Price hero */}
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Рекомендованная стоимость</Text>
            <Text style={styles.priceValue}>{price} ₽</Text>
            <View style={styles.aiPill}>
              <Text style={styles.aiPillText}>✦ Рассчитано AI</Text>
            </View>
          </View>

          {/* Payment method */}
          <Text style={styles.sectionTitle}>Способ оплаты</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.paymentBtn,
                  paymentMethod === m.key && styles.paymentBtnActive,
                ]}
                onPress={() => setPaymentMethod(m.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.paymentIcon}>{m.icon}</Text>
                <Text style={[
                  styles.paymentLabel,
                  paymentMethod === m.key && { color: '#14141A', fontWeight: '700' },
                ]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            style={[styles.confirmBtn, isConfirming && { opacity: 0.55 }]}
            onPress={handleConfirm}
            disabled={isConfirming}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmText}>
              {isConfirming ? 'Публикуем...' : `Опубликовать за ${price} ₽`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Отмена</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function DetailRow({ label, value, last, styles }: { label: string; value: string; last?: boolean; styles: any }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function makeStyles(C: AppColors, isDark: boolean) {
  const card = {
    shadowColor: '#14141A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.06, shadowRadius: 16, elevation: 4,
  };
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },

    topBar:  { paddingHorizontal: 20, paddingTop: 8 },
    backBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: C.bgLayer,
      alignItems: 'center', justifyContent: 'center',
      ...card,
    },
    backIcon: { color: C.text, fontSize: 18 },

    scroll: { paddingHorizontal: 20, paddingTop: 12 },

    title:    { fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 6, letterSpacing: -0.6 },
    subtitle: { fontSize: 15, color: C.textMuted, marginBottom: 20, lineHeight: 22 },

    // Task details card
    card: {
      backgroundColor: C.bgLayer,
      borderRadius: RADIUS.xl, padding: 20, marginBottom: 16,
      ...card,
    },
    row:        { flexDirection: 'row', paddingVertical: 10 },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: C.divider },
    rowLabel:   { flex: 1, fontSize: 14, color: C.textMuted },
    rowValue:   { flex: 2, fontSize: 14, fontWeight: '500', color: C.text },

    // Price card
    priceCard: {
      backgroundColor: '#0E0E10',
      borderRadius: RADIUS.xxl, padding: 24,
      alignItems: 'center', marginBottom: 24,
      shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.20, shadowRadius: 20, elevation: 10,
    },
    priceLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
    priceValue:  { fontSize: 48, fontWeight: '800', color: '#D6F24A', marginBottom: 12, letterSpacing: -2 },
    aiPill: {
      backgroundColor: 'rgba(214,242,74,0.15)',
      borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: 'rgba(214,242,74,0.30)',
    },
    aiPillText: { fontSize: 12, color: '#D6F24A', fontWeight: '600' },

    // Payment
    sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12 },
    paymentRow:   { flexDirection: 'row', gap: 12, marginBottom: 24 },
    paymentBtn:   {
      flex: 1, backgroundColor: C.bgLayer, borderRadius: RADIUS.xl,
      paddingVertical: 18, alignItems: 'center', gap: 6,
      borderWidth: 2, borderColor: C.border,
      ...card,
    },
    paymentBtnActive: {
      borderColor: '#D6F24A', backgroundColor: 'rgba(214,242,74,0.08)',
    },
    paymentIcon:  { fontSize: 26 },
    paymentLabel: { fontSize: 14, color: C.textMuted, fontWeight: '600' },

    // Confirm button
    confirmBtn: {
      borderRadius: 999, paddingVertical: 18,
      alignItems: 'center', marginBottom: 12,
      backgroundColor: '#0E0E10',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.20, shadowRadius: 10, elevation: 6,
    },
    confirmText: { fontSize: 16, fontWeight: '800', color: '#D6F24A', letterSpacing: -0.2 },

    cancelBtn:  { paddingVertical: 14, alignItems: 'center' },
    cancelText: { color: C.textMuted, fontSize: 15 },
  });
}
