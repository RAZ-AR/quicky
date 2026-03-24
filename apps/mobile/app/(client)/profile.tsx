import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { COLORS, SHADOW } from '../../src/constants/config';
import { useEffect } from 'react';

export default function ClientProfileScreen() {
  const { user, logout } = useAuthStore();
  const { myTasks, loadMyTasks } = useTaskStore();

  useEffect(() => { loadMyTasks(); }, []);

  const completed = myTasks.filter(t => t.state === 'completed' || t.state === 'rated').length;
  const active = myTasks.filter(t => ['published', 'accepted', 'in_progress'].includes(t.state)).length;

  const menuItems = [
    { icon: '📝', label: 'Редактировать профиль', action: () => {} },
    { icon: '🔔', label: 'Уведомления', action: () => {} },
    { icon: '📍', label: 'Мои адреса', action: () => {} },
    { icon: '💬', label: 'Поддержка', action: () => {} },
    { icon: '📜', label: 'История заказов', action: () => {} },
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
        <View style={styles.header}>
          <Text style={styles.title}>Профиль</Text>
        </View>

        {/* Profile card */}
        <View style={[styles.profileCard, SHADOW.md]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Клиент</Text>
          </View>
          <Text style={styles.profilePhone}>{user?.phone ?? '—'}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, SHADOW.sm]}>
            <Text style={styles.statValue}>{myTasks.length}</Text>
            <Text style={styles.statLabel}>Всего заказов</Text>
          </View>
          <View style={[styles.statCard, SHADOW.sm]}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{completed}</Text>
            <Text style={styles.statLabel}>Выполнено</Text>
          </View>
          <View style={[styles.statCard, SHADOW.sm]}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{active}</Text>
            <Text style={styles.statLabel}>Активных</Text>
          </View>
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
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  roleBadge: { backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 8 },
  roleText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  profilePhone: { fontSize: 14, color: COLORS.textMuted },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', textAlign: 'center' },
  menuCard: { backgroundColor: COLORS.card, borderRadius: 20, marginBottom: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  menuChevron: { fontSize: 22, color: COLORS.textMuted },
  logoutBtn: { backgroundColor: COLORS.dangerLight, borderRadius: 16, padding: 16, alignItems: 'center' },
  logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 16 },
});
