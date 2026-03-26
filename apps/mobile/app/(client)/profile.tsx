import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, type AppColors } from '../../src/constants/config';
import { useEffect, useMemo } from 'react';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function ClientProfileScreen() {
  const { user, logout } = useAuthStore();
  const { myTasks, loadMyTasks } = useTaskStore();
  const { COLORS, GRADIENTS, isDark, blurTint, preference, setPreference } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  useEffect(() => { loadMyTasks(); }, []);

  const completed = myTasks.filter(t => t.state === 'completed' || t.state === 'rated').length;
  const active    = myTasks.filter(t => ['published', 'accepted', 'in_progress'].includes(t.state)).length;

  const menuItems = [
    { icon: '📝', label: 'Редактировать профиль' },
    { icon: '🔔', label: 'Уведомления' },
    { icon: '📍', label: 'Мои адреса' },
    { icon: '💬', label: 'Поддержка' },
    { icon: '📜', label: 'История заказов' },
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
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Avatar hero ────────────────────── */}
          <View style={styles.heroSection}>
            <View style={styles.avatarRing}>
              <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            </View>
            <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>✦ Клиент</Text>
            </View>
            <Text style={styles.profilePhone}>{user?.phone ?? '—'}</Text>
          </View>

          {/* ── Stats bento ────────────────────── */}
          <View style={styles.statsRow}>
            {[
              { value: myTasks.length, label: 'Всего',     color: COLORS.text },
              { value: completed,      label: 'Выполнено', color: COLORS.success },
              { value: active,         label: 'Активных',  color: COLORS.primary },
            ].map(({ value, label, color }) => (
              <View key={label} style={styles.statCard}>
                <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
                <View style={styles.statBg} />
                <View style={{ position: 'relative', alignItems: 'center' }}>
                  <Text style={[styles.statValue, { color }]}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Menu ───────────────────────────── */}
          <View style={styles.menuCard}>
            <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
            <View style={styles.menuBg} />
            <View style={{ position: 'relative' }}>
              {menuItems.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, i < menuItems.length - 1 && styles.menuDivider]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Theme ──────────────────────────────────────────────────────── */}
          <View style={styles.themeCard}>
            <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
            <View style={styles.themeCardBg} />
            <View style={{ position: 'relative', padding: 16 }}>
              <Text style={styles.themeTitle}>Тема оформления</Text>
              <View style={styles.themeRow}>
                {([
                  { key: 'light',  label: 'Светлая', icon: '☀️' },
                  { key: 'dark',   label: 'Тёмная',  icon: '🌙' },
                  { key: 'system', label: 'Система', icon: '⚙️' },
                ] as const).map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={styles.themeBtn}
                    onPress={() => setPreference(t.key)}
                    activeOpacity={0.8}
                  >
                    {preference === t.key && (
                      <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
                    )}
                    <View style={[styles.themeBtnBg, preference === t.key && { opacity: 0 }]} />
                    <Text style={styles.themeBtnIcon}>{t.icon}</Text>
                    <Text style={[styles.themeBtnLabel, preference === t.key && { color: '#fff', fontWeight: '700' }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ── Logout ─────────────────────────── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
            <View style={styles.logoutBg} />
            <Text style={styles.logoutText}>Выйти из аккаунта</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(C: AppColors, C_RADIUS = RADIUS) {
  return StyleSheet.create({
    root:  { flex: 1, backgroundColor: C.bg },
    safe:  { flex: 1 },
    scroll:{ paddingHorizontal: 20 },

    glowTop: {
      position: 'absolute', top: -80, left: '30%',
      width: 200, height: 200, borderRadius: 100,
      backgroundColor: 'rgba(139,92,246,0.20)',
    },

    heroSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 28 },
    avatarRing:  {
      width: 92, height: 92, borderRadius: 46,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 14, padding: 2,
    },
    avatarInner: {
      width: 86, height: 86, borderRadius: 43,
      backgroundColor: C.bgLayer,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.glassBorder,
    },
    avatarText:   { fontSize: 34, fontWeight: '800', color: C.text },
    profileName:  { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
    roleBadge:    {
      backgroundColor: C.glassViolet, borderRadius: C_RADIUS.full,
      paddingHorizontal: 14, paddingVertical: 5, marginBottom: 8,
      borderWidth: 1, borderColor: C.primary + '40',
    },
    roleText:     { color: C.primary, fontWeight: '700', fontSize: 13 },
    profilePhone: { fontSize: 14, color: C.textMuted },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statCard: { flex: 1, borderRadius: C_RADIUS.lg, overflow: 'hidden', paddingVertical: 16, alignItems: 'center' },
    statBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.lg, borderWidth: 1, borderColor: C.glassBorder },
    statValue:{ fontSize: 22, fontWeight: '800', marginBottom: 2 },
    statLabel:{ fontSize: 10, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase' },

    menuCard:   { borderRadius: C_RADIUS.xl, overflow: 'hidden', marginBottom: 12 },
    menuBg:     { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.xl, borderWidth: 1, borderColor: C.glassBorder },
    menuItem:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    menuDivider:{ borderBottomWidth: 1, borderBottomColor: C.divider },
    menuIcon:   { fontSize: 20, marginRight: 14 },
    menuLabel:  { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
    menuChevron:{ fontSize: 22, color: C.textMuted },

    themeCard:      { borderRadius: C_RADIUS.xl, overflow: 'hidden', marginBottom: 12 },
    themeCardBg:    { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.xl, borderWidth: 1, borderColor: C.glassBorder },
    themeTitle:     { fontSize: 13, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 12 },
    themeRow:       { flexDirection: 'row', gap: 8 },
    themeBtn:       { flex: 1, borderRadius: C_RADIUS.lg, overflow: 'hidden', paddingVertical: 10, alignItems: 'center' },
    themeBtnBg:     { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.lg, borderWidth: 1, borderColor: C.glassBorder },
    themeBtnIcon:   { fontSize: 18, marginBottom: 2, position: 'relative' as const },
    themeBtnLabel:  { fontSize: 11, color: C.textMuted, position: 'relative' as const },

    logoutBtn:  { borderRadius: C_RADIUS.xl, overflow: 'hidden', alignItems: 'center', paddingVertical: 16 },
    logoutBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: C.dangerGlow, borderRadius: C_RADIUS.xl, borderWidth: 1, borderColor: C.danger + '40' },
    logoutText: { color: C.danger, fontWeight: '700', fontSize: 16, position: 'relative' },
  });
}
