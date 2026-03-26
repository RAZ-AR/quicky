import { useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, TASK_STATE_COLORS, TASK_STATE_LABELS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function ExecutorChatScreen() {
  const router = useRouter();
  const { myTasks, loadMyTasks } = useTaskStore();
  const { COLORS, GRADIENTS, isDark, blurTint } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

  useEffect(() => { loadMyTasks(); }, []);

  const chats = myTasks.filter(t => ['accepted', 'in_progress', 'pending_client', 'completed'].includes(t.state));

  const renderItem = ({ item }: { item: any }) => {
    const hasUnread   = item.state === 'pending_client';
    const stateColor  = TASK_STATE_COLORS[item.state] ?? COLORS.executor;
    const isActive    = item.state === 'in_progress';

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => router.push({ pathname: '/(executor)/task/[id]', params: { id: item.id } })}
        activeOpacity={0.85}
      >
        <BlurView intensity={18} tint={blurTint} style={StyleSheet.absoluteFill} />
        <View style={styles.chatCardBg} />
        <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <LinearGradient colors={isActive ? GRADIENTS.executor : ['rgba(139,92,246,0.3)', 'rgba(6,182,212,0.2)']} style={StyleSheet.absoluteFill} />
            <View style={styles.avatarBorder} />
            <Text style={styles.avatarText}>К</Text>
            <View style={[styles.onlineDot, { backgroundColor: isActive ? COLORS.success : COLORS.textLight }]} />
          </View>

          {/* Content */}
          <View style={styles.chatContent}>
            <View style={styles.chatRow}>
              <Text style={styles.chatName} numberOfLines={1}>{item.item_description ?? 'Заказ'}</Text>
              <Text style={styles.chatTime}>{formatTime(item.created_at)}</Text>
            </View>
            <View style={styles.chatRow}>
              <Text style={styles.chatPreview} numberOfLines={1}>📍 {item.to_location?.address ?? '—'}</Text>
              {hasUnread && <View style={styles.unreadDot} />}
            </View>
            <View style={[styles.stateBadge, { backgroundColor: stateColor + '20', borderColor: stateColor + '40' }]}>
              <Text style={[styles.stateBadgeText, { color: stateColor }]}>{TASK_STATE_LABELS[item.state]}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Сообщения</Text>
        </View>

        {/* Support card */}
        <TouchableOpacity style={styles.supportCard} activeOpacity={0.85}>
          <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(139,92,246,0.20)', 'rgba(6,182,212,0.10)']} style={StyleSheet.absoluteFill} />
          <View style={styles.supportBorder} />
          <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center', padding: 14 }}>
            <View style={[styles.avatarWrap, { marginRight: 12 }]}>
              <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
              <View style={styles.avatarBorder} />
              <Text style={{ fontSize: 20, position: 'relative' }}>🎧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chatName, { color: COLORS.primaryLight }]}>Поддержка Quicky</Text>
              <Text style={styles.chatPreview}>Мы готовы помочь 24/7</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Заказы</Text>

        <FlatList
          data={chats}
          keyExtractor={t => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>Нет активных чатов</Text>
              <Text style={styles.emptyHint}>Сообщения от клиентов появятся здесь</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d   = new Date(iso);
  const now = new Date();
  if (now.getTime() - d.getTime() < 86400000)
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
}

function makeStyles(C: AppColors, C_RADIUS = RADIUS) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    safe: { flex: 1 },
    glowTop: {
      position: 'absolute', top: -60, left: '20%',
      width: 200, height: 200, borderRadius: 100,
      backgroundColor: 'rgba(6,182,212,0.10)',
    },

    header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    title:  { fontSize: 24, fontWeight: '800', color: C.text },

    supportCard:  { marginHorizontal: 16, borderRadius: C_RADIUS.xl, overflow: 'hidden', marginBottom: 8 },
    supportBorder:{ ...StyleSheet.absoluteFillObject, borderRadius: C_RADIUS.xl, borderWidth: 1, borderColor: C.glassBorder },

    sectionLabel: { paddingHorizontal: 20, paddingVertical: 8, fontSize: 11, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },

    list: { paddingHorizontal: 16, paddingBottom: 100 },

    chatCard:    { borderRadius: C_RADIUS.xl, overflow: 'hidden', marginBottom: 8 },
    chatCardBg:  { ...StyleSheet.absoluteFillObject, backgroundColor: C.glass, borderRadius: C_RADIUS.xl, borderWidth: 1, borderColor: C.glassBorder },

    avatarWrap:  { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarBorder:{ ...StyleSheet.absoluteFillObject, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    avatarText:  { color: '#fff', fontWeight: '700', fontSize: 18, position: 'relative' },
    onlineDot:   { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.bg },

    chatContent: { flex: 1 },
    chatRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    chatName:    { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
    chatTime:    { fontSize: 12, color: C.textMuted },
    chatPreview: { flex: 1, fontSize: 13, color: C.textMuted },
    unreadDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: C.executor },

    stateBadge:     { alignSelf: 'flex-start', borderRadius: C_RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, borderWidth: 1 },
    stateBadgeText: { fontSize: 11, fontWeight: '600' },

    chevron: { fontSize: 22, color: C.textMuted },

    empty:     { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyText: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 8 },
    emptyHint: { fontSize: 14, color: C.textMuted },
  });
}
