/**
 * Chat Room — мессенджер внутри конкретного задания
 * Открывается из:
 *  - списка чатов (chat/index.tsx)
 *  - деталей задания (task/[id].tsx) по кнопке «Написать»
 */
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, Alert, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTaskStore } from '../../../src/stores/taskStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { api, uploadPhoto } from '../../../src/services/api';
import { joinTaskRoom, leaveTaskRoom, getSocketInstance } from '../../../src/services/socket';
import { EXEC_GRAD, EXEC_GRAD_DARK } from '../../../src/components/GradBtn';
import {
  RADIUS, SHADOW, NEO, CATEGORIES, TASK_STATE_LABELS, type AppColors,
} from '../../../src/constants/config';
import { useAppTheme } from '../../../src/hooks/useAppTheme';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  task_id: string;
  sender_id: string;
  sender_role: 'client' | 'executor' | 'system';
  type: 'text' | 'photo' | 'location' | 'system';
  content: string;
  photo_url?: string;
  location?: { lat: number; lng: number; address?: string };
  created_at: string;
}

// ── Mock history (demo когда API недоступен) ──────────────────────────────────
const MOCK_HISTORY: Record<string, ChatMessage[]> = {
  'my-1': [
    { id: 'h1', task_id: 'my-1', sender_id: 'c1', sender_role: 'client',   type: 'text',   content: 'Добрый день! Уточните — нужны яйца С0 или С1?',        created_at: new Date(Date.now() - 1800000).toISOString() },
    { id: 'h2', task_id: 'my-1', sender_id: 'e1', sender_role: 'executor', type: 'text',   content: 'Здравствуйте! Куплю С1, если нет — возьму С0',          created_at: new Date(Date.now() - 1700000).toISOString() },
    { id: 'h3', task_id: 'my-1', sender_id: 'c1', sender_role: 'client',   type: 'text',   content: 'Отлично, спасибо! И молоко 3.2% пожалуйста 🙏',         created_at: new Date(Date.now() - 600000).toISOString() },
  ],
  'my-2': [
    { id: 'h4', task_id: 'my-2', sender_id: 'c2', sender_role: 'client',   type: 'text',   content: 'Здравствуйте! Посылка в отделении №3, код получения: 4821', created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 'h5', task_id: 'my-2', sender_id: 'e1', sender_role: 'executor', type: 'text',   content: 'Принял, выдвигаюсь',                                    created_at: new Date(Date.now() - 7100000).toISOString() },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}
function needsDivider(cur: ChatMessage, prev?: ChatMessage): boolean {
  if (!prev) return true;
  return (new Date(cur.created_at).getTime() - new Date(prev.created_at).getTime()) > 300_000;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ChatRoomScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router     = useRouter();
  const { activeTask, myTasks, loadTask, setActiveTask } = useTaskStore();
  const { user }   = useAuthStore();
  const { COLORS, isDark } = useAppTheme();
  const styles     = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);
  const insets     = useSafeAreaInsets();
  const listRef    = useRef<FlatList>(null);

  const task = (activeTask?.id === taskId
    ? activeTask
    : myTasks.find(t => t.id === taskId)) as any;
  const cat  = CATEGORIES.find(c => c.key === task?.category) ?? CATEGORIES[CATEGORIES.length - 1];

  const [messages,  setMessages]  = useState<ChatMessage[]>(MOCK_HISTORY[taskId ?? ''] ?? []);
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [attachOpen,setAttachOpen]= useState(false);

  // ── Load history + socket ─────────────────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;
    loadTask(taskId);
    joinTaskRoom(taskId);

    setLoading(true);
    api.get(`/task/${taskId}/messages`)
      .then(({ data }) => { if (data.messages?.length) setMessages(data.messages); })
      .catch(() => {/* keep mock */})
      .finally(() => setLoading(false));

    const socket = getSocketInstance();
    if (socket) {
      const push = (msg: ChatMessage) => {
        if (msg.task_id !== taskId) return;
        setMessages(prev => [...prev, msg]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      };
      socket.on('new_message',     push);
      socket.on('client_response', push);
      return () => {
        socket.off('new_message',     push);
        socket.off('client_response', push);
        leaveTaskRoom(taskId);
      };
    }
    return () => leaveTaskRoom(taskId);
  }, [taskId]);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
  }, [messages.length]);

  // ── Send helpers ──────────────────────────────────────────────────────────
  const pushLocal = useCallback((partial: Partial<ChatMessage>): ChatMessage => {
    const msg: ChatMessage = {
      id: `local-${Date.now()}`,
      task_id: taskId ?? '',
      sender_id: user?.id ?? 'dev-1',
      sender_role: 'executor',
      type: 'text', content: '',
      created_at: new Date().toISOString(),
      ...partial,
    };
    setMessages(prev => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return msg;
  }, [taskId, user?.id]);

  const apiSend = useCallback(async (body: object) => {
    try { await api.post(`/task/${taskId}/message`, body); }
    catch { /* optimistic — stays in UI */ }
  }, [taskId]);

  const sendText = useCallback(async () => {
    const t = text.trim();
    if (!t || sending) return;
    setText('');
    Keyboard.dismiss();
    setSending(true);
    pushLocal({ type: 'text', content: t });
    await apiSend({ type: 'text', content: t });
    setSending(false);
  }, [text, sending, pushLocal, apiSend]);

  const sendPhoto = useCallback(async (fromCamera = false) => {
    setAttachOpen(false);
    const fn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Нет доступа к камере'); return; }
    }
    const res = await fn({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled) return;
    setSending(true);
    try {
      const up  = await uploadPhoto(res.assets[0].uri);
      const url = up?.url ?? res.assets[0].uri;
      pushLocal({ type: 'photo', content: 'Фото', photo_url: url });
      await apiSend({ type: 'photo', content: 'Фото', photo_url: url });
    } catch { Alert.alert('Ошибка', 'Не удалось отправить фото'); }
    finally   { setSending(false); }
  }, [pushLocal, apiSend]);

  const sendLocation = useCallback(async () => {
    setAttachOpen(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Нет доступа к геолокации'); return; }
    setSending(true);
    try {
      const pos  = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [rev]= await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }).catch(() => [null]);
      const addr = rev
        ? [rev.street, rev.streetNumber, rev.city].filter(Boolean).join(', ')
        : `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
      const loc  = { lat: pos.coords.latitude, lng: pos.coords.longitude, address: addr };
      pushLocal({ type: 'location', content: addr, location: loc });
      await apiSend({ type: 'location', content: addr, location: loc });
    } catch { Alert.alert('Ошибка', 'Не удалось получить геолокацию'); }
    finally   { setSending(false); }
  }, [pushLocal, apiSend]);

  // ── Render bubble ─────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwn = item.sender_role === 'executor';
    const prev  = messages[index - 1];

    if (item.type === 'system') {
      return (
        <View style={styles.sysWrap}>
          <Text style={styles.sysText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View>
        {needsDivider(item, prev) && (
          <Text style={styles.divider}>{fmtTime(item.created_at)}</Text>
        )}
        <View style={[styles.row, isOwn && styles.rowOwn]}>
          {!isOwn && (
            <View style={[styles.avatarSm, { backgroundColor: cat.dark + '22' }]}>
              <Ionicons name="person-outline" size={13} color={cat.dark} />
            </View>
          )}
          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            {item.type === 'photo' && item.photo_url
              ? <Image source={{ uri: item.photo_url }} style={styles.photo} resizeMode="cover" />
              : item.type === 'location'
              ? (
                <View style={styles.locRow}>
                  <View style={[styles.locIcon, { backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : '#34C759' + '22' }]}>
                    <Ionicons name="location" size={18} color={isOwn ? '#fff' : '#34C759'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.locLabel, isOwn && { color: 'rgba(255,255,255,0.7)' }]}>Геолокация</Text>
                    <Text style={[styles.locAddr,  isOwn && { color: '#fff' }]} numberOfLines={2}>{item.content}</Text>
                  </View>
                </View>
              )
              : <Text style={[styles.msgText, isOwn && { color: '#fff' }]}>{item.content}</Text>
            }
            <Text style={[styles.msgTime, isOwn && { color: 'rgba(255,255,255,0.6)' }]}>{fmtTime(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  }, [messages, cat, styles, isDark, COLORS]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={[styles.hAvatar, { backgroundColor: cat.dark + '25' }]}>
          <Ionicons name={cat.icon as any} size={18} color={cat.dark} />
        </View>

        <View style={styles.hMeta}>
          <Text style={styles.hTitle} numberOfLines={1}>{task?.item_description ?? 'Задание'}</Text>
          <Text style={styles.hSub}>
            {TASK_STATE_LABELS[task?.state] ?? ''}
            {task?.price_final ? ` · ${task.price_final} ₽` : ''}
          </Text>
        </View>

        {/* Кнопка перехода к деталям задания */}
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => {
            if (task) setActiveTask(task);
            router.push({ pathname: '/(executor)/task/[id]', params: { id: taskId! } });
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={20} color={COLORS.executor} />
        </TouchableOpacity>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Messages ── */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.executor} size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubble-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyChatText}>Напишите первым</Text>
                <Text style={styles.emptyChatSub}>Можно уточнить детали задания или отправить геолокацию</Text>
              </View>
            }
          />
        )}

        {/* ── Attach panel ── */}
        {attachOpen && (
          <View style={styles.attachPanel}>
            {[
              { icon: 'image-outline',    color: '#5E5CE6', label: 'Галерея',     onPress: () => sendPhoto(false) },
              { icon: 'camera-outline',   color: '#FF9500', label: 'Камера',      onPress: () => sendPhoto(true)  },
              { icon: 'location-outline', color: '#34C759', label: 'Геолокация',  onPress: sendLocation           },
            ].map(btn => (
              <TouchableOpacity key={btn.label} style={styles.attachItem} onPress={btn.onPress} activeOpacity={0.8}>
                <View style={[styles.attachIcon, { backgroundColor: btn.color + '22' }]}>
                  <Ionicons name={btn.icon as any} size={24} color={btn.color} />
                </View>
                <Text style={styles.attachLabel}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Input bar ── */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[styles.iconBtn, attachOpen && { backgroundColor: COLORS.executor + '20' }]}
            onPress={() => { setAttachOpen(v => !v); Keyboard.dismiss(); }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={attachOpen ? 'close' : 'add'}
              size={22}
              color={attachOpen ? COLORS.executor : COLORS.textMuted}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Сообщение..."
            placeholderTextColor={COLORS.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            onFocus={() => setAttachOpen(false)}
          />

          <TouchableOpacity
            onPress={sendText}
            disabled={!text.trim() || sending}
            activeOpacity={0.82}
            style={styles.sendWrap}
          >
            <LinearGradient
              colors={text.trim() ? (isDark ? EXEC_GRAD_DARK : EXEC_GRAD) : [COLORS.bgElevated, COLORS.bgElevated]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendBtn}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="arrow-up" size={20} color={text.trim() ? '#fff' : COLORS.textMuted} />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors, isDark: boolean) {
  const ownBg   = isDark ? '#3A4060' : '#45BFFF';
  const otherBg = isDark ? '#2A2A3A' : C.bgLayer;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    // Header
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingBottom: 12,
      backgroundColor: C.bgLayer,
      borderBottomWidth: 1, borderBottomColor: C.divider,
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    hAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    hMeta:   { flex: 1 },
    hTitle:  { fontSize: 15, fontWeight: '700', color: C.text },
    hSub:    { fontSize: 12, color: C.textMuted, marginTop: 1 },
    detailBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.executor + '18',
      alignItems: 'center', justifyContent: 'center',
    },

    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Messages
    msgList: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },

    divider: {
      textAlign: 'center', fontSize: 12, color: C.textMuted,
      marginVertical: 10, fontWeight: '500',
    },
    sysWrap: { alignItems: 'center', marginVertical: 6 },
    sysText: {
      fontSize: 12, color: C.textMuted,
      backgroundColor: C.bgElevated,
      borderRadius: RADIUS.full,
      paddingHorizontal: 12, paddingVertical: 4,
    },

    row:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 3 },
    rowOwn: { justifyContent: 'flex-end' },

    avatarSm: {
      width: 28, height: 28, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 2,
    },

    bubble: {
      maxWidth: '78%',
      borderRadius: 18, padding: 10, paddingHorizontal: 13,
    },
    bubbleOwn: {
      backgroundColor: ownBg,
      borderBottomRightRadius: 4,
      shadowColor: '#45BFFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.28,
      shadowRadius: 6,
      elevation: 4,
    },
    bubbleOther: {
      backgroundColor: otherBg,
      borderBottomLeftRadius: 4,
      ...(isDark ? SHADOW.sm : NEO.card),
    },

    msgText: { fontSize: 15, color: C.text, lineHeight: 21 },
    msgTime: { fontSize: 11, color: C.textLight, marginTop: 3, alignSelf: 'flex-end' },

    photo: { width: 220, height: 165, borderRadius: 12, marginBottom: 4 },

    locRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 170 },
    locIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    locLabel: { fontSize: 11, color: C.textMuted, marginBottom: 1 },
    locAddr:  { fontSize: 14, color: C.text, fontWeight: '500', lineHeight: 18 },

    emptyChat:     { alignItems: 'center', marginTop: 80, gap: 10, paddingHorizontal: 40 },
    emptyChatText: { fontSize: 17, fontWeight: '700', color: C.text },
    emptyChatSub:  { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },

    // Attach panel
    attachPanel: {
      flexDirection: 'row', gap: 8,
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: C.bgLayer,
      borderTopWidth: 1, borderTopColor: C.divider,
    },
    attachItem:  { flex: 1, alignItems: 'center', gap: 6 },
    attachIcon: {
      width: 54, height: 54, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    attachLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },

    // Input bar
    inputBar: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8,
      paddingHorizontal: 12, paddingTop: 10,
      backgroundColor: C.bgLayer,
      borderTopWidth: 1, borderTopColor: C.divider,
    },
    iconBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: C.bgElevated,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 1,
    },
    input: {
      flex: 1,
      backgroundColor: C.bgElevated,
      borderRadius: 22, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9,
      fontSize: 15, color: C.text,
      maxHeight: 120, lineHeight: 20,
    },
    sendWrap: { marginBottom: 1 },
    sendBtn: {
      width: 38, height: 38, borderRadius: 19,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}
