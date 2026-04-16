import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { RADIUS, CATEGORIES, type AppColors, type CategoryKey } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function ExecutorProfileScreen() {
  const { user, logout } = useAuthStore();
  const { COLORS, isDark, preference, setPreference } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  // Services the executor offers (local state — persist to backend TODO)
  const [selectedServices, setSelectedServices] = useState<CategoryKey[]>(
    ['shopping', 'delivery'] as CategoryKey[]
  );

  const toggleService = (key: CategoryKey) => {
    setSelectedServices(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const stats = [
    { label: 'Рейтинг',   value: user?.rating_avg  ? `${user.rating_avg.toFixed(1)}` : '—', suffix: '★', color: '#C89640' },
    { label: 'Сделано',   value: user?.rating_count ? `${user.rating_count}` : '0',          suffix: '',  color: COLORS.executor },
    { label: 'Уровень',   value: 'Pro',                                                        suffix: '',  color: COLORS.primary },
  ];

  const menuItems = [
    { icon: '📝', label: 'Редактировать профиль' },
    { icon: '🔔', label: 'Уведомления' },
    { icon: '🌍', label: 'Зона работы' },
    { icon: '💳', label: 'Реквизиты' },
    { icon: '📊', label: 'Статистика' },
    { icon: '❓', label: 'Помощь' },
  ];

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar hero */}
          <View style={styles.heroSection}>
            <View style={[styles.avatarRing, { backgroundColor: COLORS.glassCyan }]}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>● Онлайн</Text>
            </View>
            <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.roleText}>⚡ Исполнитель</Text>
            </View>
            <Text style={styles.profilePhone}>{user?.phone ?? '—'}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {stats.map(({ value, label, suffix, color }) => (
              <View key={label} style={[styles.statCard, { backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border }]}>
                <Text style={[styles.statValue, { color }]}>{value}<Text style={styles.statSuffix}>{suffix}</Text></Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* My Services */}
          <View style={styles.servicesCard}>
            <View style={styles.servicesHeader}>
              <Text style={styles.cardSectionTitle}>Мои услуги</Text>
              <Text style={styles.servicesHint}>Выберите что умеете</Text>
            </View>
            <View style={styles.servicesGrid}>
              {CATEGORIES.map(cat => {
                const active = selectedServices.includes(cat.key as CategoryKey);
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.serviceChip,
                      active
                        ? { backgroundColor: cat.color, borderColor: 'transparent' }
                        : { backgroundColor: 'transparent', borderColor: COLORS.border }
                    ]}
                    onPress={() => toggleService(cat.key as CategoryKey)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.serviceChipIcon}>{cat.icon}</Text>
                    <Text style={[
                      styles.serviceChipLabel,
                      { color: active ? (isDark ? '#1A1714' : cat.textColor) : COLORS.textMuted }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={[styles.saveServicesBtn, { backgroundColor: COLORS.primary }]} activeOpacity={0.85}>
              <Text style={[styles.saveServicesBtnText, { color: isDark ? '#1A1714' : '#F5F3EF' }]}>
                Сохранить услуги
              </Text>
            </TouchableOpacity>
          </View>

          {/* Menu */}
          <View style={[styles.menuCard, { backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border }]}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, i < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.divider }]}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Theme */}
          <View style={[styles.themeCard, { backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border }]}>
            <Text style={styles.cardSectionTitle}>Тема</Text>
            <View style={styles.themeRow}>
              {([
                { key: 'light', label: 'Светлая', icon: '☀️' },
                { key: 'dark',  label: 'Тёмная',  icon: '🌙' },
                { key: 'system',label: 'Система', icon: '⚙️' },
              ] as const).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.themeBtn,
                    preference === t.key
                      ? { backgroundColor: COLORS.primary }
                      : { backgroundColor: COLORS.bgElevated }
                  ]}
                  onPress={() => setPreference(t.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.themeBtnIcon}>{t.icon}</Text>
                  <Text style={[
                    styles.themeBtnLabel,
                    preference === t.key && { color: isDark ? '#1A1714' : '#F5F3EF', fontWeight: '700' }
                  ]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: COLORS.dangerGlow, borderWidth: 1, borderColor: COLORS.danger + '40' }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={[styles.logoutText, { color: COLORS.danger }]}>Выйти из аккаунта</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
    safe:   { flex: 1 },
    scroll: { paddingHorizontal: 20 },

    heroSection:    { alignItems: 'center', paddingTop: 16, paddingBottom: 28 },
    avatarRing:     {
      width: 88, height: 88, borderRadius: 44,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    avatarText:     { fontSize: 34, fontWeight: '800', color: isDark ? C.text : '#0E3A34' },
    onlineBadge:    { backgroundColor: C.successGlow, borderRadius: R.full, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: C.success + '40', marginBottom: 10 },
    onlineBadgeText:{ fontSize: 12, color: C.success, fontWeight: '700' },
    profileName:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
    roleBadge:      { borderRadius: R.full, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 8 },
    roleText:       { color: isDark ? '#1A1714' : '#F5F3EF', fontWeight: '700', fontSize: 13 },
    profilePhone:   { fontSize: 14, color: C.textMuted },

    statsRow:  { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statCard:  { flex: 1, borderRadius: R.xl, paddingVertical: 16, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
    statSuffix:{ fontSize: 14 },
    statLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase' as const },

    servicesCard:   { borderRadius: R.xl, padding: 16, marginBottom: 12, backgroundColor: C.glass, borderWidth: 1, borderColor: C.border },
    servicesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    cardSectionTitle:{ fontSize: 16, fontWeight: '800', color: C.text },
    servicesHint:   { fontSize: 12, color: C.textMuted },
    servicesGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    serviceChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.full, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
    serviceChipIcon:{ fontSize: 15 },
    serviceChipLabel:{ fontSize: 13, fontWeight: '600' },
    saveServicesBtn:{ borderRadius: R.full, paddingVertical: 12, alignItems: 'center' },
    saveServicesBtnText: { fontSize: 14, fontWeight: '700' },

    menuCard:    { borderRadius: R.xl, marginBottom: 12, overflow: 'hidden' },
    menuItem:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15 },
    menuIcon:    { fontSize: 20, marginRight: 14 },
    menuLabel:   { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
    menuChevron: { fontSize: 22, color: C.textMuted },

    themeCard:     { borderRadius: R.xl, padding: 16, marginBottom: 12 },
    themeRow:      { flexDirection: 'row', gap: 8, marginTop: 12 },
    themeBtn:      { flex: 1, borderRadius: R.lg, paddingVertical: 10, alignItems: 'center' },
    themeBtnIcon:  { fontSize: 18, marginBottom: 2 },
    themeBtnLabel: { fontSize: 11, color: C.textMuted },

    logoutBtn:  { borderRadius: R.xl, alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
    logoutText: { fontWeight: '700', fontSize: 16 },
  });
}
