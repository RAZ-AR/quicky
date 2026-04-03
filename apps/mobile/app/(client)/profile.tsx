import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, type AppColors } from '../../src/constants/config';
import { useEffect, useMemo } from 'react';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function ClientProfileScreen() {
  const { user, logout } = useAuthStore();
  const { myTasks, loadMyTasks } = useTaskStore();
  const { COLORS, isDark, preference, setPreference } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  useEffect(() => { loadMyTasks(); }, []);

  const completed = myTasks.filter(t => t.state === 'completed' || t.state === 'rated').length;
  const active    = myTasks.filter(t => ['published', 'accepted', 'in_progress'].includes(t.state)).length;

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

          {/* ── Profile header ────────────────────── */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarRing}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>✦ Клиент</Text>
            </View>
            <Text style={styles.profilePhone}>{user?.phone ?? '—'}</Text>
          </View>

          {/* ── Stats row ─────────────────────────── */}
          <View style={styles.statsRow}>
            {[
              { value: myTasks.length, label: 'Всего',     color: COLORS.text },
              { value: completed,      label: 'Выполнено', color: COLORS.success },
              { value: active,         label: 'Активных',  color: COLORS.primary },
            ].map(({ value, label, color }) => (
              <View key={label} style={styles.statCard}>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* ── Settings group ────────────────────── */}
          <Text style={styles.groupLabel}>Настройки</Text>
          <View style={styles.settingsCard}>
            {[
              { icon: '📝', label: 'Редактировать профиль' },
              { icon: '🔔', label: 'Уведомления' },
              { icon: '📍', label: 'Мои адреса' },
              { icon: '💬', label: 'Поддержка' },
              { icon: '📜', label: 'История заказов' },
            ].map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, i > 0 && styles.menuDivider]}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconWrap}>
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Theme selector ────────────────────── */}
          <View style={styles.themeCard}>
            <Text style={styles.themeTitle}>Тема оформления</Text>
            <View style={styles.themeRow}>
              {([
                { key: 'light',  label: 'Светлая', icon: '☀️' },
                { key: 'dark',   label: 'Тёмная',  icon: '🌙' },
                { key: 'system', label: 'Система', icon: '⚙️' },
              ] as const).map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.themeBtn, preference === t.key && styles.themeBtnActive]}
                  onPress={() => setPreference(t.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.themeBtnIcon}>{t.icon}</Text>
                  <Text style={[styles.themeBtnLabel, preference === t.key && styles.themeBtnLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Help ──────────────────────────────── */}
          <TouchableOpacity style={styles.helpCard} activeOpacity={0.7}>
            <Text style={styles.helpIcon}>❓</Text>
            <Text style={styles.helpLabel}>Помощь и FAQ</Text>
            <Text style={styles.helpChevron}>›</Text>
          </TouchableOpacity>

          {/* ── Logout ────────────────────────────── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Выйти из аккаунта</Text>
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
    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    // Profile header
    profileHeader: { alignItems: 'center', paddingTop: 16, paddingBottom: 28 },
    avatarRing: {
      width: 88, height: 88, borderRadius: 44,
      backgroundColor: C.glassViolet,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 14,
      borderWidth: 2, borderColor: C.border,
    },
    avatarText:   { fontSize: 32, fontWeight: '800', color: C.text },
    profileName:  { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 8, letterSpacing: -0.3 },
    roleBadge: {
      backgroundColor: C.bgLayer,
      borderRadius: R.full,
      paddingHorizontal: 14, paddingVertical: 5, marginBottom: 8,
      borderWidth: 1, borderColor: C.border,
    },
    roleText:     { color: C.primary, fontWeight: '700', fontSize: 13 },
    profilePhone: { fontSize: 14, color: C.textMuted },

    // Stats
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
    statCard: {
      flex: 1, borderRadius: R.lg,
      backgroundColor: C.glass,
      borderWidth: 1, borderColor: C.border,
      paddingVertical: 16, alignItems: 'center',
    },
    statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
    statLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase' },

    // Settings card
    groupLabel: {
      fontSize: 12, fontWeight: '700', color: C.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
    },
    settingsCard: {
      borderRadius: R.xl, marginBottom: 12,
      backgroundColor: C.glass,
      borderWidth: 1, borderColor: C.border,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    menuDivider: {
      borderTopWidth: 1, borderTopColor: C.divider,
    },
    menuIconWrap: {
      width: 36, height: 36, borderRadius: R.md,
      backgroundColor: C.bgElevated,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 12,
    },
    menuIcon:    { fontSize: 17 },
    menuLabel:   { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
    menuChevron: { fontSize: 20, color: C.textMuted },

    // Theme card
    themeCard: {
      borderRadius: R.xl, marginBottom: 12,
      backgroundColor: C.glass,
      borderWidth: 1, borderColor: C.border,
      padding: 16,
    },
    themeTitle: {
      fontSize: 12, color: C.textMuted, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
    },
    themeRow: { flexDirection: 'row', gap: 8 },
    themeBtn: {
      flex: 1, borderRadius: R.lg,
      backgroundColor: C.bgElevated,
      borderWidth: 1, borderColor: C.border,
      paddingVertical: 12, alignItems: 'center',
    },
    themeBtnActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    themeBtnIcon:  { fontSize: 18, marginBottom: 2 },
    themeBtnLabel: { fontSize: 11, color: C.textMuted },
    themeBtnLabelActive: { color: '#fff', fontWeight: '700' },

    // Help card
    helpCard: {
      borderRadius: R.xl, marginBottom: 12,
      backgroundColor: C.glass,
      borderWidth: 1, borderColor: C.border,
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 16, gap: 12,
    },
    helpIcon:    { fontSize: 20 },
    helpLabel:   { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
    helpChevron: { fontSize: 20, color: C.textMuted },

    // Logout
    logoutBtn: {
      borderRadius: R.xl,
      backgroundColor: C.dangerGlow,
      borderWidth: 1, borderColor: C.danger + '25',
      alignItems: 'center', paddingVertical: 16,
    },
    logoutText: { color: C.danger, fontWeight: '700', fontSize: 15 },
  });
}
