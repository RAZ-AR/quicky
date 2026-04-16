import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, SHADOW, CATEGORIES, RECOMMENDED_PRICES, type AppColors, type CategoryKey } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

const TOTAL_STEPS = 3;

export default function CreateOrderScreen() {
  const router  = useRouter();
  const { parseText, isCreating, creation, confirmTask } = useTaskStore();
  const { COLORS, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  const [step,        setStep]        = useState(0);
  const [category,    setCategory]    = useState<CategoryKey | null>(null);
  const [description, setDescription] = useState('');
  const [address,     setAddress]     = useState('');

  const selectedCat = CATEGORIES.find(c => c.key === category);
  const priceHint   = category ? RECOMMENDED_PRICES[category] : null;

  const canNext = [
    !!category,
    description.trim().length > 5,
    true,
  ][step];

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      // Final step: submit
      await parseText(description);
      router.push('/(client)/clarify');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.root}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <SafeAreaView style={styles.safe} edges={['top']}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => step > 0 ? setStep(s => s - 1) : router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Новый заказ</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Progress dots */}
          <View style={styles.progressDots}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i <= step
                    ? { backgroundColor: COLORS.primary, width: i === step ? 24 : 8 }
                    : { backgroundColor: COLORS.border },
                ]}
              />
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* ── STEP 0: Choose category ── */}
            {step === 0 && (
              <View>
                <Text style={styles.stepTitle}>Что нужно сделать?</Text>
                <Text style={styles.stepSub}>Выберите категорию заказа</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map(cat => {
                    const active = category === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[
                          styles.catCard,
                          { backgroundColor: active ? COLORS.primary : COLORS.bgLayer },
                          active && SHADOW.sm,
                        ]}
                        onPress={() => setCategory(cat.key as CategoryKey)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.catLabel, { color: active ? '#fff' : COLORS.text }]}>
                          {cat.label}
                        </Text>
                        {RECOMMENDED_PRICES[cat.key] && (
                          <Text style={[styles.catPrice, { color: active ? 'rgba(255,255,255,0.75)' : COLORS.textMuted }]}>
                            {RECOMMENDED_PRICES[cat.key].min}–{RECOMMENDED_PRICES[cat.key].max} ₽
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── STEP 1: Describe task ── */}
            {step === 1 && (
              <View>
                <Text style={styles.stepTitle}>Опишите задание</Text>
                {selectedCat && (
                  <Text style={styles.stepSub}>
                    {selectedCat.label}
                    {priceHint ? ` · Рекомендуем ${priceHint.min}–${priceHint.max} ₽` : ''}
                  </Text>
                )}
                <View style={styles.inputCard}>
                  <TextInput
                    style={styles.textInput}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Например: Купить молоко в Пятёрочке на Ленина..."
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>
                {priceHint && (
                  <View style={[styles.hintCard, { backgroundColor: COLORS.primaryGlow }]}>
                    <Text style={[styles.hintTitle, { color: COLORS.primary }]}>
                      Рекомендуемая цена
                    </Text>
                    <Text style={[styles.hintPrice, { color: COLORS.primary }]}>
                      {priceHint.min}–{priceHint.max} ₽
                    </Text>
                    <Text style={[styles.hintSub, { color: COLORS.primary }]}>
                      На основе похожих заказов
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── STEP 2: Address + Confirm ── */}
            {step === 2 && (
              <View>
                <Text style={styles.stepTitle}>Адрес и подтверждение</Text>
                <Text style={styles.stepSub}>Куда нужно приехать исполнителю?</Text>

                <View style={styles.inputCard}>
                  <TextInput
                    style={[styles.textInput, { minHeight: 48, paddingTop: 0 }]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Введите адрес..."
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>

                {/* Summary */}
                <View style={[styles.summaryCard, { backgroundColor: COLORS.bgLayer }]}>
                  <Text style={styles.summaryTitle}>Ваш заказ</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Категория</Text>
                    <Text style={styles.summaryVal}>{selectedCat?.label ?? '—'}</Text>
                  </View>
                  <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.summaryKey}>Описание</Text>
                    <Text style={[styles.summaryVal, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                      {description}
                    </Text>
                  </View>
                  {priceHint && (
                    <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.summaryKey}>Рекомендуемая цена</Text>
                      <Text style={[styles.summaryVal, { color: COLORS.primary }]}>
                        {priceHint.min}–{priceHint.max} ₽
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Bottom CTA */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.nextBtn,
                { backgroundColor: canNext ? COLORS.primary : COLORS.bgElevated },
                canNext && SHADOW.orange,
              ]}
              onPress={handleNext}
              disabled={!canNext || isCreating}
              activeOpacity={0.85}
            >
              <Text style={[styles.nextBtnText, { color: canNext ? '#fff' : COLORS.textMuted }]}>
                {isCreating ? 'Отправляем...' : step < TOTAL_STEPS - 1 ? 'Далее' : 'Создать заказ'}
              </Text>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
    safe:   { flex: 1 },
    scroll: { paddingHorizontal: 20 },

    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bgLayer, alignItems: 'center', justifyContent: 'center' },
    backIcon:    { fontSize: 20, color: C.text, fontWeight: '600' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },

    progressDots: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 28 },
    progressDot:  { height: 8, borderRadius: 4 },

    stepTitle: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 6 },
    stepSub:   { fontSize: 14, color: C.textMuted, marginBottom: 20 },

    // Category grid
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catCard:      {
      width: '47%',
      borderRadius: R.xl,
      paddingVertical: 18, paddingHorizontal: 16,
    },
    catLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    catPrice: { fontSize: 12 },

    // Input
    inputCard: {
      backgroundColor: C.bgLayer,
      borderRadius: R.xl,
      padding: 16, marginBottom: 16,
    },
    textInput: {
      fontSize: 15, color: C.text,
      minHeight: 120,
    },

    // Price hint
    hintCard:  { borderRadius: R.xl, padding: 16 },
    hintTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    hintPrice: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
    hintSub:   { fontSize: 12 },

    // Summary
    summaryCard:  { borderRadius: R.xl, padding: 16, marginTop: 8 },
    summaryTitle: { fontSize: 13, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider },
    summaryKey:   { fontSize: 13, color: C.textMuted },
    summaryVal:   { fontSize: 13, fontWeight: '600', color: C.text },

    // Footer
    footer:      { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 24 },
    nextBtn:     { borderRadius: R.full, paddingVertical: 16, alignItems: 'center' },
    nextBtnText: { fontSize: 16, fontWeight: '700' },
  });
}
