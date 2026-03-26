import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS, RADIUS, GRADIENTS } from '../../src/constants/config';

export default function ExecutorProfileScreen() {
  const { user, logout } = useAuthStore();

  const stats = [
    { label: 'Рейтинг',   value: user?.rating_avg   ? `${user.rating_avg.toFixed(1)} ★` : '—', color: '#F59E0B' },
    { label: 'Выполнено', value: user?.rating_count  ? `${user.rating_count}`              : '0', color: COLORS.executor },
    { label: 'Уровень',   value: 'Pro',                                                            color: COLORS.primaryLight },
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
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Avatar hero ──────────────────────── */}
          <View style={styles.heroSection}>
            <View style={styles.avatarRing}>
              <LinearGradient colors={GRADIENTS.executor} style={StyleSheet.absoluteFill} />
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            </View>
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>● Онлайн</Text>
            </View>
            <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
            <View style={styles.roleBadge}>
              <LinearGradient colors={GRADIENTS.executor} style={StyleSheet.absoluteFill} />
              <Text style={styles.roleText}>⚡ Исполнитель</Text>
            </View>
            <Text style={styles.profilePhone}>{user?.phone ?? '—'}</Text>
          </View>

          {/* ── Stats bento ──────────────────────── */}
          <View style={styles.statsRow}>
            {stats.map(({ value, label, color }) => (
              <View key={label} style={styles.statCard}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.statBg} />
                <View style={{ position: 'relative', alignItems: 'center' }}>
                  <Text style={[styles.statValue, { color }]}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Menu ─────────────────────────────── */}
          <View style={styles.menuCard}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
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

          {/* ── Logout ───────────────────────────── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.logoutBg} />
            <Text style={styles.logoutText}>Выйти из аккаунта</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: COLORS.bg },
  safe:  { flex: 1 },
  scroll:{ paddingHorizontal: 20 },

  glowTop: {
    position: 'absolute', top: -80, right: '20%',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(6,182,212,0.15)',
  },

  heroSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 28 },
  avatarRing:  {
    width: 92, height: 92, borderRadius: 46,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, padding: 2, overflow: 'hidden',
  },
  avatarInner: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: COLORS.bgLayer,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.glassBorder,
  },
  avatarText:   { fontSize: 34, fontWeight: '800', color: COLORS.text },

  onlineBadge:     { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.success + '40', marginBottom: 10 },
  onlineBadgeText: { fontSize: 12, color: COLORS.success, fontWeight: '700' },

  profileName: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  roleBadge:   {
    borderRadius: RADIUS.full, overflow: 'hidden',
    paddingHorizontal: 14, paddingVertical: 5, marginBottom: 8,
  },
  roleText:     { color: '#fff', fontWeight: '700', fontSize: 13, position: 'relative' },
  profilePhone: { fontSize: 14, color: COLORS.textMuted },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', paddingVertical: 16, alignItems: 'center' },
  statBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.glassBorder },
  statValue:{ fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel:{ fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase' },

  menuCard:   { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: 12 },
  menuBg:     { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.glass, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.glassBorder },
  menuItem:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  menuDivider:{ borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  menuIcon:   { fontSize: 20, marginRight: 14 },
  menuLabel:  { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  menuChevron:{ fontSize: 22, color: COLORS.textMuted },

  logoutBtn:  { borderRadius: RADIUS.xl, overflow: 'hidden', alignItems: 'center', paddingVertical: 16 },
  logoutBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.dangerGlow, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.danger + '40' },
  logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 16, position: 'relative' },
});
