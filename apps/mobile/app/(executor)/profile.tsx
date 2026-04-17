import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  Alert, Modal, TextInput, Switch, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/stores/authStore';
import { useTaskStore } from '../../src/stores/taskStore';
import { RADIUS, SHADOW, NEO, CATEGORIES, type AppColors } from '../../src/constants/config';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAppTheme } from '../../src/hooks/useAppTheme';

// ── Reusable menu row ────────────────────────────────────────────────────────
function MenuRow({
  icon, label, value, onPress, danger, rightEl, showChevron = true,
  styles, COLORS,
}: {
  icon: string; label: string; value?: string;
  onPress?: () => void; danger?: boolean; rightEl?: React.ReactNode;
  showChevron?: boolean; styles: any; COLORS: AppColors;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.menuIconWrap, danger && { backgroundColor: COLORS.dangerGlow }]}>
        <Ionicons
          name={icon as any}
          size={18}
          color={danger ? COLORS.danger : COLORS.executor}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: COLORS.danger }]}>{label}</Text>
        {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      </View>
      {rightEl ?? (showChevron && onPress && (
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      ))}
    </TouchableOpacity>
  );
}

// ── Divider ──────────────────────────────────────────────────────────────────
function Divider({ styles }: { styles: any }) {
  return <View style={styles.divider} />;
}

// ── Modal shell ──────────────────────────────────────────────────────────────
function ModalShell({
  visible, onClose, title, children, COLORS, styles,
}: {
  visible: boolean; onClose: () => void; title: string;
  children: React.ReactNode; COLORS: AppColors; styles: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalTitleRow}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function ExecutorProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { myTasks, loadMyTasks } = useTaskStore();
  const { COLORS, isDark, preference, setPreference } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  useEffect(() => { loadMyTasks(); }, []);

  const completed = myTasks.filter(t => t.state === 'completed' || t.state === 'rated').length;
  const earned    = myTasks
    .filter(t => t.state === 'completed' || t.state === 'rated')
    .reduce((sum, t) => sum + (t.price_final ?? 0), 0);
  const rating    = user?.rating_avg ?? 0;

  // ── Edit Profile modal ──
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editSaving, setEditSaving] = useState(false);

  const openEditModal = useCallback(() => {
    setEditName(user?.name ?? '');
    setEditModalVisible(true);
  }, [user?.name]);

  const saveProfile = useCallback(async () => {
    if (!editName.trim()) return;
    setEditSaving(true);
    try {
      await api.patch('/users/me', { name: editName.trim() });
      setEditModalVisible(false);
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить профиль');
    } finally {
      setEditSaving(false);
    }
  }, [editName]);

  // ── My Services ──
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  useEffect(() => {
    AsyncStorage.getItem('executor_services').then(val => {
      if (val) {
        try { setSelectedServices(JSON.parse(val)); } catch {}
      }
    });
  }, []);

  const toggleService = useCallback((key: string) => {
    setSelectedServices(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  const saveServices = useCallback(async () => {
    await AsyncStorage.setItem('executor_services', JSON.stringify(selectedServices));
    Alert.alert('Сохранено', 'Ваши услуги обновлены');
  }, [selectedServices]);

  // ── Work radius modal ──
  const RADIUS_OPTIONS = [5, 10, 20, 50];
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);
  const [workRadius, setWorkRadius] = useState(10);
  useEffect(() => {
    AsyncStorage.getItem('executor_work_radius').then(val => {
      if (val) setWorkRadius(Number(val));
    });
  }, []);

  const saveRadius = useCallback(async (km: number) => {
    setWorkRadius(km);
    await AsyncStorage.setItem('executor_work_radius', String(km));
  }, []);

  // ── Requisites modal ──
  const [reqModalVisible, setReqModalVisible] = useState(false);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [bankName, setBankName] = useState('');

  // ── FAQ modal ──
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqItems = [
    { q: 'Как начать получать задания?',     a: 'Выберите услуги, которые вы предоставляете, и дождитесь заданий на вкладке "Лента"' },
    { q: 'Как указать зону работы?',         a: 'Откройте раздел "Зона работы" и выберите подходящий радиус' },
    { q: 'Как получить оплату?',             a: 'Укажите ваши реквизиты в разделе "Реквизиты"' },
    { q: 'Как повысить рейтинг?',            a: 'Качественно выполняйте задания и вовремя реагируйте на запросы' },
  ];

  // ── Notifications switch ──
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem('notifications_enabled').then(val => {
      if (val !== null) setNotificationsEnabled(val === 'true');
    });
  }, []);

  const toggleNotifications = useCallback((val: boolean) => {
    setNotificationsEnabled(val);
    AsyncStorage.setItem('notifications_enabled', String(val));
  }, []);

  // ── Logout ──
  const handleLogout = useCallback(() => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Кабинет</Text>
          </View>

          {/* ── Profile card ── */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
              <Text style={styles.profilePhone}>{user?.phone ?? '—'}</Text>
              <View style={styles.roleBadge}>
                <Ionicons name="flash-outline" size={12} color={COLORS.executor} />
                <Text style={styles.roleText}>Исполнитель</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={openEditModal} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={COLORS.executor} />
            </TouchableOpacity>
          </View>

          {/* ── Stats ── */}
          <View style={styles.statsRow}>
            {[
              { value: myTasks.length,                        label: 'Всего',     color: COLORS.text },
              { value: completed,                             label: 'Завершено', color: COLORS.executor },
              { value: rating > 0 ? `${rating.toFixed(1)} ⭐` : '—', label: 'Рейтинг', color: '#C89640' },
              { value: `${earned.toLocaleString()} ₽`,       label: 'Заработано',color: COLORS.executor },
            ].map(({ value, label, color }) => (
              <View key={label} style={styles.statCard}>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* ── Section: Мои услуги ── */}
          <Text style={styles.sectionLabel}>Мои услуги</Text>
          <View style={styles.card}>
            <View style={styles.servicesBody}>
              <View style={styles.servicesWrap}>
                {CATEGORIES.map(cat => {
                  const active = selectedServices.includes(cat.key);
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.serviceChip,
                        active && { backgroundColor: COLORS.executor + '22', borderColor: COLORS.executor },
                      ]}
                      onPress={() => toggleService(cat.key)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name={cat.icon as any} size={14} color={active ? COLORS.executor : COLORS.textMuted} />
                      <Text style={[styles.serviceChipText, active && { color: COLORS.executor }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={styles.saveServicesBtn} onPress={saveServices} activeOpacity={0.85}>
                <Text style={styles.saveServicesBtnText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Section: Аккаунт ── */}
          <Text style={styles.sectionLabel}>Аккаунт</Text>
          <View style={styles.card}>
            <MenuRow
              icon="person-outline" label="Редактировать профиль"
              value={user?.name}
              onPress={openEditModal}
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />
            <MenuRow
              icon="call-outline" label="Номер телефона"
              value={user?.phone ?? '—'}
              onPress={() => Alert.alert(
                'Изменение номера',
                'Для смены номера обратитесь в поддержку: +7 800 555 0000',
              )}
              styles={styles} COLORS={COLORS}
            />
          </View>

          {/* ── Section: Работа ── */}
          <Text style={styles.sectionLabel}>Работа</Text>
          <View style={styles.card}>
            <MenuRow
              icon="radio-outline" label="Зона работы"
              value={`${workRadius} км`}
              onPress={() => setRadiusModalVisible(true)}
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />
            <MenuRow
              icon="card-outline" label="Реквизиты"
              value={cardNumber ? `**** ${cardNumber.slice(-4)}` : 'Не указаны'}
              onPress={() => setReqModalVisible(true)}
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />
            <MenuRow
              icon="receipt-outline" label="История заданий"
              value={`${myTasks.length} заданий`}
              onPress={() => router.push('/(executor)/tasks' as any)}
              styles={styles} COLORS={COLORS}
            />
          </View>

          {/* ── Section: Настройки ── */}
          <Text style={styles.sectionLabel}>Настройки</Text>
          <View style={styles.card}>

            {/* Тема */}
            <View style={styles.menuItem}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="contrast-outline" size={18} color={COLORS.executor} />
              </View>
              <Text style={[styles.menuLabel, { flex: 1 }]}>Тема оформления</Text>
              <View style={styles.themeToggleRow}>
                {(['light', 'dark', 'system'] as const).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.themeChip, preference === key && styles.themeChipActive]}
                    onPress={() => setPreference(key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={key === 'light' ? 'sunny' : key === 'dark' ? 'moon' : 'phone-portrait-outline'}
                      size={13}
                      color={preference === key ? '#fff' : COLORS.textMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Divider styles={styles} />

            {/* Уведомления */}
            <MenuRow
              icon="notifications-outline" label="Уведомления"
              showChevron={false}
              rightEl={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: COLORS.border, true: COLORS.executor }}
                  thumbColor="#fff"
                />
              }
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />

            <MenuRow
              icon="shield-checkmark-outline" label="Конфиденциальность"
              onPress={() => Linking.openURL('https://quicky.app/privacy')}
              styles={styles} COLORS={COLORS}
            />
          </View>

          {/* ── Section: Поддержка ── */}
          <Text style={styles.sectionLabel}>Поддержка</Text>
          <View style={styles.card}>
            <MenuRow
              icon="chatbubble-ellipses-outline" label="Написать в поддержку"
              onPress={() => Linking.openURL('https://t.me/quicky_support')}
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />
            <MenuRow
              icon="help-circle-outline" label="Помощь и FAQ"
              onPress={() => setFaqModalVisible(true)}
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />
            <MenuRow
              icon="document-text-outline" label="Пользовательское соглашение"
              onPress={() => Linking.openURL('https://quicky.app/terms')}
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />
            <View style={styles.menuItem}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.executor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Версия приложения</Text>
                <Text style={styles.menuValue}>1.0.0 (beta)</Text>
              </View>
            </View>
          </View>

          {/* ── Logout ── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
            <Text style={styles.logoutText}>Выйти из аккаунта</Text>
          </TouchableOpacity>

          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: Редактировать профиль
      ═══════════════════════════════════════════════════════════════════════ */}
      <ModalShell
        visible={editModalVisible}
        onClose={() => !editSaving && setEditModalVisible(false)}
        title="Редактировать профиль"
        COLORS={COLORS}
        styles={styles}
      >
        <View style={styles.modalBody}>
          <Text style={styles.inputLabel}>Имя</Text>
          <TextInput
            style={styles.textInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Ваше имя"
            placeholderTextColor={COLORS.textMuted}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={saveProfile}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, editSaving && { opacity: 0.6 }]}
            onPress={saveProfile}
            activeOpacity={0.8}
            disabled={editSaving}
          >
            {editSaving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.primaryBtnText}>Сохранить</Text>
            }
          </TouchableOpacity>
        </View>
      </ModalShell>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: Зона работы
      ═══════════════════════════════════════════════════════════════════════ */}
      <ModalShell
        visible={radiusModalVisible}
        onClose={() => setRadiusModalVisible(false)}
        title="Зона работы"
        COLORS={COLORS}
        styles={styles}
      >
        <View style={styles.modalBody}>
          {RADIUS_OPTIONS.map(km => (
            <TouchableOpacity
              key={km}
              style={[styles.radiusOption, workRadius === km && styles.radiusOptionActive]}
              onPress={() => saveRadius(km)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.radiusKm}>{km} км</Text>
                <Text style={styles.radiusDesc}>
                  {km <= 5 ? 'Рядом' : km <= 10 ? 'Ближний район' : km <= 20 ? 'Весь город' : 'Широкий охват'}
                </Text>
              </View>
              {workRadius === km && <Ionicons name="checkmark-circle" size={20} color={COLORS.executor} />}
            </TouchableOpacity>
          ))}
        </View>
      </ModalShell>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: Реквизиты
      ═══════════════════════════════════════════════════════════════════════ */}
      <ModalShell
        visible={reqModalVisible}
        onClose={() => setReqModalVisible(false)}
        title="Реквизиты"
        COLORS={COLORS}
        styles={styles}
      >
        <View style={styles.modalBody}>
          <View style={styles.reqNote}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.reqNoteText}>Данные сохраняются локально</Text>
          </View>
          <Text style={styles.inputLabel}>ФИО банка</Text>
          <TextInput
            style={styles.textInput}
            value={bankName}
            onChangeText={setBankName}
            placeholder="Например: Сбербанк"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="next"
          />
          <Text style={styles.inputLabel}>Владелец карты</Text>
          <TextInput
            style={styles.textInput}
            value={cardHolder}
            onChangeText={setCardHolder}
            placeholder="Имя на карте"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="next"
            autoCapitalize="characters"
          />
          <Text style={styles.inputLabel}>Номер карты</Text>
          <TextInput
            style={styles.textInput}
            value={cardNumber}
            onChangeText={setCardNumber}
            placeholder="0000 0000 0000 0000"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            maxLength={19}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setReqModalVisible(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      </ModalShell>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: Помощь и FAQ
      ═══════════════════════════════════════════════════════════════════════ */}
      <ModalShell
        visible={faqModalVisible}
        onClose={() => setFaqModalVisible(false)}
        title="Помощь и FAQ"
        COLORS={COLORS}
        styles={styles}
      >
        <View style={styles.modalBody}>
          {faqItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.faqItem}
              onPress={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              activeOpacity={0.7}
            >
              <View style={styles.faqQuestion}>
                <View style={styles.faqIconWrap}>
                  <Ionicons name="help-circle-outline" size={18} color={COLORS.executor} />
                </View>
                <Text style={styles.faqQuestionText}>{item.q}</Text>
                <Ionicons
                  name={expandedFaq === idx ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.textMuted}
                />
              </View>
              {expandedFaq === idx && (
                <Text style={styles.faqAnswer}>{item.a}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ModalShell>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors, isDark: boolean, R = RADIUS) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: C.bg },
    safe:   { flex: 1 },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },

    header:      { paddingVertical: 12 },
    screenTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },

    // Profile card
    profileCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: C.bgLayer, borderRadius: R.xl,
      padding: 16, marginBottom: 12,
      ...(isDark ? SHADOW.sm : NEO.card),
    },
    avatar: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: C.executor,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText:   { fontSize: 24, fontWeight: '800', color: isDark ? '#0F1F0F' : '#fff' },
    profileName:  { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 2, letterSpacing: -0.2 },
    profilePhone: { fontSize: 13, color: C.textMuted, marginBottom: 6 },
    roleBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: C.executorGlow,
      borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 3,
      alignSelf: 'flex-start',
    },
    roleText: { fontSize: 11, fontWeight: '700', color: C.executor },
    editBtn:  {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.executorGlow,
      alignItems: 'center', justifyContent: 'center',
    },

    // Stats
    statsRow:  { flexDirection: 'row', gap: 8, marginBottom: 24 },
    statCard:  {
      flex: 1, borderRadius: R.lg,
      backgroundColor: C.bgLayer,
      paddingVertical: 12, alignItems: 'center',
      ...(isDark ? SHADOW.sm : NEO.btn),
    },
    statValue: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
    statLabel: { fontSize: 9, color: C.textMuted, fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' },

    // Section label
    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: C.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginBottom: 8, paddingHorizontal: 4,
    },

    // Card container
    card: {
      backgroundColor: C.bgLayer,
      borderRadius: R.xl,
      marginBottom: 20,
      overflow: isDark ? 'hidden' : 'visible',
      ...(isDark ? SHADOW.sm : NEO.card),
    },

    // Menu row
    menuItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 13, gap: 12,
    },
    menuIconWrap: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: isDark ? C.executorGlow : 'rgba(61,122,94,0.12)',
      alignItems: 'center', justifyContent: 'center',
    },
    menuLabel:   { fontSize: 15, color: C.text, fontWeight: '500' },
    menuValue:   { fontSize: 12, color: C.textMuted, marginTop: 1 },

    divider: { height: 1, backgroundColor: C.divider, marginLeft: 60 },

    // Theme chips
    themeToggleRow: { flexDirection: 'row', gap: 6 },
    themeChip: {
      width: 32, height: 32, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.bgElevated,
    },
    themeChipActive: { backgroundColor: C.executor },

    // Services
    servicesBody: { padding: 14 },
    servicesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    serviceChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: R.full, paddingHorizontal: 12, paddingVertical: 7,
      borderWidth: 1.5, borderColor: C.border,
      backgroundColor: C.bgElevated,
    },
    serviceChipText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
    saveServicesBtn: {
      backgroundColor: C.executor,
      borderRadius: R.xl,
      paddingVertical: 12,
      alignItems: 'center',
    },
    saveServicesBtnText: { color: isDark ? '#0F1F0F' : '#fff', fontWeight: '700', fontSize: 14 },

    // Logout
    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8,
      borderRadius: R.xl,
      backgroundColor: isDark ? C.dangerGlow : 'rgba(255,59,48,0.08)',
      paddingVertical: 15, marginBottom: 8,
      ...(isDark ? { borderWidth: 1, borderColor: C.danger + '25' } : NEO.btn),
    },
    logoutText: { color: C.danger, fontWeight: '700', fontSize: 15 },

    // ── Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: C.bgLayer,
      borderTopLeftRadius: R.xxl,
      borderTopRightRadius: R.xxl,
      maxHeight: '85%',
      paddingBottom: 16,
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: 'center', marginTop: 10, marginBottom: 4,
    },
    modalTitleRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 12,
    },
    modalTitle: {
      flex: 1, fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3,
    },
    modalCloseBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: C.bgElevated,
      alignItems: 'center', justifyContent: 'center',
    },
    modalBody: { paddingHorizontal: 20, paddingTop: 4 },

    // Input
    inputLabel: {
      fontSize: 13, fontWeight: '600', color: C.textMuted,
      marginBottom: 6, marginTop: 4,
    },
    textInput: {
      backgroundColor: C.bgElevated,
      borderRadius: R.md,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 15, color: C.text,
      borderWidth: 1, borderColor: C.border,
      marginBottom: 14,
    },

    // Buttons
    primaryBtn: {
      backgroundColor: C.executor,
      borderRadius: R.xl,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
      shadowColor: C.executor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 8,
    },
    primaryBtnText: { color: isDark ? '#0F1F0F' : '#fff', fontWeight: '700', fontSize: 16 },

    // Radius options
    radiusOption: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      padding: 14, borderRadius: R.lg,
      backgroundColor: C.bgElevated,
      borderWidth: 1.5, borderColor: 'transparent',
      marginBottom: 10,
    },
    radiusOptionActive: {
      borderColor: C.executor,
      backgroundColor: C.executorGlow,
    },
    radiusKm:   { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 2 },
    radiusDesc: { fontSize: 13, color: C.textMuted },

    // Requisites
    reqNote: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: C.bgElevated, borderRadius: R.md,
      padding: 12, marginBottom: 16,
    },
    reqNoteText: { fontSize: 13, color: C.textMuted },

    // FAQ
    faqItem: {
      backgroundColor: C.bgElevated,
      borderRadius: R.lg, marginBottom: 8,
      overflow: 'hidden',
    },
    faqQuestion: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      padding: 14,
    },
    faqIconWrap: {
      width: 30, height: 30, borderRadius: 8,
      backgroundColor: C.executorGlow,
      alignItems: 'center', justifyContent: 'center',
    },
    faqQuestionText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
    faqAnswer: {
      fontSize: 13, color: C.textMuted, lineHeight: 19,
      paddingHorizontal: 14, paddingBottom: 14,
    },

    emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', paddingVertical: 16 },
  });
}
