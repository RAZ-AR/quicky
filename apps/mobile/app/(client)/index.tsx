import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { COLORS, SHADOW, TASK_STATE_COLORS, TASK_STATE_LABELS } from '../../src/constants/config';

export default function ClientHomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { myTasks, loadMyTasks } = useTaskStore();

  useEffect(() => { loadMyTasks(); }, []);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Доброе утро' : greetHour < 18 ? 'Добрый день' : 'Добрый вечер';

  const activeTasks = myTasks.filter(t => ['published', 'accepted', 'in_progress', 'pending_client'].includes(t.state));
  const recentTasks = myTasks.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{user?.name ?? 'Клиент'}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        </View>

        {/* Hero CTA */}
        <View style={[styles.heroCard, SHADOW.md]}>
          <Text style={styles.heroTitle}>Нужна помощь?</Text>
          <Text style={styles.heroSubtitle}>Опишите задание голосом или текстом</Text>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[styles.heroBtn, styles.heroBtnPrimary]}
              onPress={() => router.push('/(client)/voice')}
            >
              <Text style={styles.heroBtnIcon}>🎙️</Text>
              <Text style={styles.heroBtnText}>Голосом</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.heroBtn, styles.heroBtnSecondary]}
              onPress={() => router.push({ pathname: '/(client)/clarify', params: { mode: 'text' } })}
            >
              <Text style={styles.heroBtnIcon}>✏️</Text>
              <Text style={[styles.heroBtnText, { color: COLORS.primary }]}>Текстом</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick access */}
        <Text style={styles.sectionTitle}>Быстрый доступ</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: COLORS.primaryLight }]} onPress={() => router.push('/(client)/tasks/')}>
            <Text style={styles.quickIcon}>📦</Text>
            <Text style={[styles.quickLabel, { color: COLORS.primary }]}>Купить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: COLORS.infoLight }]} onPress={() => router.push('/(client)/tasks/')}>
            <Text style={styles.quickIcon}>🚗</Text>
            <Text style={[styles.quickLabel, { color: COLORS.info }]}>Отвезти</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: COLORS.successLight }]} onPress={() => router.push('/(client)/tasks/')}>
            <Text style={styles.quickIcon}>📋</Text>
            <Text style={[styles.quickLabel, { color: COLORS.success }]}>Поручение</Text>
          </TouchableOpacity>
        </View>

        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Активные заказы</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                <Text style={styles.seeAll}>Все →</Text>
              </TouchableOpacity>
            </View>
            {activeTasks.slice(0, 2).map(task => (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskCard, SHADOW.sm]}
                onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: task.id } })}
              >
                <View style={styles.taskCardLeft}>
                  <Text style={styles.taskCardTitle} numberOfLines={1}>{task.item_description ?? 'Заказ'}</Text>
                  <Text style={styles.taskCardAddr} numberOfLines={1}>📍 {task.to_location?.address ?? '—'}</Text>
                </View>
                <View style={[styles.stateBadge, { backgroundColor: TASK_STATE_COLORS[task.state] + '20' }]}>
                  <Text style={[styles.stateBadgeText, { color: TASK_STATE_COLORS[task.state] }]}>
                    {TASK_STATE_LABELS[task.state]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Recent */}
        {recentTasks.length > 0 && activeTasks.length === 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Последние заказы</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/tasks/')}>
                <Text style={styles.seeAll}>Все →</Text>
              </TouchableOpacity>
            </View>
            {recentTasks.map(task => (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskCard, SHADOW.sm]}
                onPress={() => router.push({ pathname: '/(client)/tasks/[id]', params: { id: task.id } })}
              >
                <View style={styles.taskCardLeft}>
                  <Text style={styles.taskCardTitle} numberOfLines={1}>{task.item_description ?? 'Заказ'}</Text>
                  <Text style={styles.taskCardAddr} numberOfLines={1}>📍 {task.to_location?.address ?? '—'}</Text>
                </View>
                <View style={[styles.stateBadge, { backgroundColor: TASK_STATE_COLORS[task.state] + '20' }]}>
                  <Text style={[styles.stateBadgeText, { color: TASK_STATE_COLORS[task.state] }]}>
                    {TASK_STATE_LABELS[task.state]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  heroCard: { backgroundColor: COLORS.primary, borderRadius: 24, padding: 24, marginBottom: 24 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 20 },
  heroActions: { flexDirection: 'row', gap: 12 },
  heroBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, gap: 8 },
  heroBtnPrimary: { backgroundColor: 'rgba(255,255,255,0.2)' },
  heroBtnSecondary: { backgroundColor: '#fff' },
  heroBtnIcon: { fontSize: 18 },
  heroBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  seeAll: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  quickIcon: { fontSize: 28, marginBottom: 8 },
  quickLabel: { fontSize: 12, fontWeight: '600' },
  taskCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  taskCardLeft: { flex: 1, marginRight: 12 },
  taskCardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  taskCardAddr: { fontSize: 12, color: COLORS.textMuted },
  stateBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  stateBadgeText: { fontSize: 12, fontWeight: '600' },
});
