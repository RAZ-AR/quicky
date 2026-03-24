import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { COLORS, SHADOW } from '../../src/constants/config';

export default function ExecutorProfileScreen() {
  const { user, logout } = useAuthStore();

  const stats = [
    { label: 'Рейтинг', value: user?.rating_avg ? `${user.rating_avg} ★` : '—' },
    { label: 'Выполнено', value: user?.rating_count ? `${user.rating_count}` : '0' },
    { label: 'Уровень', value: 'Pro' },
  ];

  const menuItems = [
    { icon: '📝', label: 'Редактировать профиль', action: () => {} },
    { icon: '🔔', label: 'Уведомления', action: () => {} },
    { icon: '🌍', label: 'Зона работы', action: () => {} },
    { icon: '💳', label: 'Реквизиты', action: () => {} },
    { icon: '📊', label: 'Статистика', action: () => {} },
    { icon: '❓', label: 'Помощь', action: () => {} },
  ];

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Профиль</Text>
        </View>

        {/* Profile card */}
        <View style={[styles.profileCard, SHADOW.md]}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={styles.onlineBadge}><Text style={styles.onlineBadgeText}>Онлайн</Text></View>
          </View>
          <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Исполнитель</Text>
          </View>
          <Text style={styles.profilePhone}>{user?.phone ?? '—'}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map(s => (
            <View key={s.label} style={[styles.statCard, SHADOW.sm]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={[styles.menuCard, SHADOW.sm]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={item.label} style={[styles.menuItem, i < menuItems.length - 1 && styles.menuDivider]} onPress={item.action}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  profileCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  onlineBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.success, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 2, borderColor: COLORS.card },
  onlineBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  roleBadge: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 8 },
  roleText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  profilePhone: { fontSize: 14, color: COLORS.textMuted },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  menuCard: { backgroundColor: COLORS.card, borderRadius: 20, marginBottom: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  menuChevron: { fontSize: 22, color: COLORS.textMuted },
  logoutBtn: { backgroundColor: COLORS.dangerLight, borderRadius: 16, padding: 16, alignItems: 'center' },
  logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 16 },
});
