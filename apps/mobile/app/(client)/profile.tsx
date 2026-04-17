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
import { RADIUS, SHADOW, NEO, type AppColors } from '../../src/constants/config';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useLang } from '../../src/hooks/useLang';
import type { Lang } from '../../src/i18n/translations';

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
          color={danger ? COLORS.danger : COLORS.primary}
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
          {/* Handle */}
          <View style={styles.modalHandle} />
          {/* Title row */}
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
export default function ClientProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { myTasks, loadMyTasks } = useTaskStore();
  const { COLORS, isDark, preference, setPreference } = useAppTheme();
  const { t, language, setLanguage } = useLang();
  const styles = useMemo(() => makeStyles(COLORS, isDark), [COLORS, isDark]);

  // ── Load tasks ──
  useEffect(() => { loadMyTasks(); }, []);

  const completed = myTasks.filter(t => t.state === 'completed' || t.state === 'rated').length;
  const active    = myTasks.filter(t => ['published', 'accepted', 'in_progress'].includes(t.state)).length;
  const spent     = myTasks.reduce((sum, t) => sum + (t.price_final ?? 0), 0);

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

  // ── Addresses modal ──
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addresses, setAddresses] = useState<string[]>(['пр. Победы, 45, кв. 12']);
  const [newAddress, setNewAddress] = useState('');

  const addAddress = useCallback(() => {
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    setAddresses(prev => [...prev, trimmed]);
    setNewAddress('');
  }, [newAddress]);

  const removeAddress = useCallback((idx: number) => {
    setAddresses(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Payment modal ──
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

  // ── Reviews modal ──
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);

  const mockReviews = [
    { text: 'Отличный исполнитель!', rating: 5 },
    { text: 'Быстро и аккуратно', rating: 4 },
  ];

  // ── Favorites modal ──
  const [favoritesModalVisible, setFavoritesModalVisible] = useState(false);

  const mockExecutors = [
    { name: 'Алексей К.', rating: 4.8, initial: 'А' },
    { name: 'Мария В.', rating: 4.9, initial: 'М' },
  ];

  // ── FAQ modal ──
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqItems = [
    { q: 'Как создать заказ?',        a: 'Нажмите кнопку + внизу экрана и следуйте инструкциям' },
    { q: 'Как отменить заказ?',       a: 'Откройте детали заказа и нажмите Отменить' },
    { q: 'Как оплатить?',             a: 'Выберите наличные или карту при создании заказа' },
    { q: 'Как оценить исполнителя?',  a: 'После завершения заказа появится кнопка Оценить' },
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

  // ── Language ──
  const cycleLang = useCallback(() => {
    const order: Lang[] = ['ru', 'en', 'sr'];
    const next = order[(order.indexOf(language) + 1) % order.length];
    setLanguage(next);
  }, [language, setLanguage]);

  const langLabel: Record<Lang, string> = { ru: 'Русский', en: 'English', sr: 'Srpski' };

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
                <Ionicons name="person-circle-outline" size={12} color={COLORS.primary} />
                <Text style={styles.roleText}>Клиент</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={openEditModal} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* ── Stats ── */}
          <View style={styles.statsRow}>
            {[
              { value: myTasks.length,                      label: 'Всего',    color: COLORS.text },
              { value: completed,                           label: 'Сделано',  color: COLORS.success },
              { value: active,                              label: 'Активных', color: COLORS.primary },
              { value: `${spent.toLocaleString()} ₽`,      label: 'Потрачено',color: COLORS.text },
            ].map(({ value, label, color }) => (
              <View key={label} style={styles.statCard}>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
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
            <Divider styles={styles} />
            <MenuRow
              icon="location-outline" label="Мои адреса"
              value={`${addresses.length} адрес${addresses.length === 1 ? '' : addresses.length < 5 ? 'а' : 'ов'}`}
              onPress={() => setAddressModalVisible(true)}
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />
            <MenuRow
              icon="card-outline" label="Способы оплаты"
              value={paymentMethod === 'cash' ? 'Наличные' : 'Банковская карта'}
              onPress={() => setPaymentModalVisible(true)}
              styles={styles} COLORS={COLORS}
            />
          </View>

          {/* ── Section: Заказы ── */}
          <Text style={styles.sectionLabel}>Заказы</Text>
          <View style={styles.card}>
            <MenuRow
              icon="receipt-outline" label="История заказов"
              value={`${myTasks.length} заказов`}
              onPress={() => router.push('/(client)/tasks')}
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />
            <MenuRow
              icon="star-outline" label="Мои отзывы"
              value={`${completed} оценок`}
              onPress={() => setReviewsModalVisible(true)}
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />
            <MenuRow
              icon="people-outline" label="Любимые исполнители"
              onPress={() => setFavoritesModalVisible(true)}
              styles={styles} COLORS={COLORS}
            />
          </View>

          {/* ── Section: Настройки ── */}
          <Text style={styles.sectionLabel}>Настройки</Text>
          <View style={styles.card}>

            {/* Язык */}
            <MenuRow
              icon="language-outline" label="Язык"
              value={langLabel[language]}
              onPress={cycleLang}
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />

            {/* Тема */}
            <View style={styles.menuItem}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="contrast-outline" size={18} color={COLORS.primary} />
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
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              }
              styles={styles} COLORS={COLORS}
            />
            <Divider styles={styles} />

            {/* Конфиденциальность */}
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
                <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
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
          MODAL: Мои адреса
      ═══════════════════════════════════════════════════════════════════════ */}
      <ModalShell
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        title="Мои адреса"
        COLORS={COLORS}
        styles={styles}
      >
        <View style={styles.modalBody}>
          {addresses.length === 0 && (
            <Text style={styles.emptyText}>Нет сохранённых адресов</Text>
          )}
          {addresses.map((addr, idx) => (
            <View key={idx} style={styles.addressRow}>
              <View style={styles.addressIconWrap}>
                <Ionicons name="location" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.addressText} numberOfLines={2}>{addr}</Text>
              <TouchableOpacity onPress={() => removeAddress(idx)} activeOpacity={0.7} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addAddressRow}>
            <TextInput
              style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
              value={newAddress}
              onChangeText={setNewAddress}
              placeholder="Новый адрес..."
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="done"
              onSubmitEditing={addAddress}
            />
            <TouchableOpacity
              style={styles.addBtn}
              onPress={addAddress}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ModalShell>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: Способы оплаты
      ═══════════════════════════════════════════════════════════════════════ */}
      <ModalShell
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        title="Способы оплаты"
        COLORS={COLORS}
        styles={styles}
      >
        <View style={styles.modalBody}>
          {([
            { key: 'cash', label: 'Наличные',        icon: 'cash-outline' },
            { key: 'card', label: 'Банковская карта', icon: 'card-outline' },
          ] as const).map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              style={[styles.paymentOption, paymentMethod === key && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.paymentIconWrap, paymentMethod === key && { backgroundColor: COLORS.primary }]}>
                <Ionicons name={icon} size={22} color={paymentMethod === key ? '#fff' : COLORS.primary} />
              </View>
              <Text style={[styles.paymentLabel, paymentMethod === key && { color: COLORS.primary, fontWeight: '700' }]}>
                {label}
              </Text>
              {paymentMethod === key && (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ModalShell>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: Мои отзывы
      ═══════════════════════════════════════════════════════════════════════ */}
      <ModalShell
        visible={reviewsModalVisible}
        onClose={() => setReviewsModalVisible(false)}
        title="Мои отзывы"
        COLORS={COLORS}
        styles={styles}
      >
        <View style={styles.modalBody}>
          {/* Summary */}
          <View style={styles.reviewSummary}>
            <Text style={styles.reviewBigRating}>4.8</Text>
            <View>
              <View style={styles.starsRow}>
                {[1,2,3,4,5].map(i => (
                  <Ionicons key={i} name={i <= 4 ? 'star' : 'star-half'} size={18} color="#FFB800" />
                ))}
              </View>
              <Text style={styles.reviewSummaryText}>{completed} завершённых заказов</Text>
            </View>
          </View>

          {/* Reviews list */}
          {mockReviews.map((review, idx) => (
            <View key={idx} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatar}>
                  <Ionicons name="person" size={14} color={COLORS.primary} />
                </View>
                <View style={styles.reviewStarsRow}>
                  {[1,2,3,4,5].map(i => (
                    <Ionicons
                      key={i}
                      name={i <= review.rating ? 'star' : 'star-outline'}
                      size={13}
                      color="#FFB800"
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          ))}
        </View>
      </ModalShell>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: Любимые исполнители
      ═══════════════════════════════════════════════════════════════════════ */}
      <ModalShell
        visible={favoritesModalVisible}
        onClose={() => setFavoritesModalVisible(false)}
        title="Любимые исполнители"
        COLORS={COLORS}
        styles={styles}
      >
        <View style={styles.modalBody}>
          {mockExecutors.map((exec, idx) => (
            <View key={idx} style={styles.executorRow}>
              <View style={styles.executorAvatar}>
                <Text style={styles.executorAvatarText}>{exec.initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.executorName}>{exec.name}</Text>
                <View style={styles.executorRatingRow}>
                  <Ionicons name="star" size={12} color="#FFB800" />
                  <Text style={styles.executorRating}>{exec.rating}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.orderBtn}
                onPress={() => {
                  setFavoritesModalVisible(false);
                  router.push('/(client)/create' as any);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.orderBtnText}>Заказать</Text>
              </TouchableOpacity>
            </View>
          ))}
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
                  <Ionicons name="help-circle-outline" size={18} color={COLORS.primary} />
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
      backgroundColor: '#0E0E10',
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText:   { fontSize: 24, fontWeight: '800', color: '#D6F24A' },
    profileName:  { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 2, letterSpacing: -0.2 },
    profilePhone: { fontSize: 13, color: C.textMuted, marginBottom: 6 },
    roleBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: C.primaryGlow,
      borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 3,
      alignSelf: 'flex-start',
    },
    roleText: { fontSize: 11, fontWeight: '700', color: C.primary },
    editBtn:  {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.primaryGlow,
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
    statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
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
      backgroundColor: isDark ? C.primaryGlow : 'rgba(255,107,46,0.15)',
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
    themeChipActive: { backgroundColor: C.primary },

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
      backgroundColor: '#0E0E10',
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
      shadowColor: '#B6D330', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30, shadowRadius: 10, elevation: 6,
    },
    primaryBtnText: { color: '#D6F24A', fontWeight: '700', fontSize: 16 },

    // Address
    addressRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.divider,
    },
    addressIconWrap: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: C.primaryGlow,
      alignItems: 'center', justifyContent: 'center',
    },
    addressText:  { flex: 1, fontSize: 14, color: C.text, lineHeight: 18 },
    deleteBtn:    { padding: 4 },
    addAddressRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    addBtn: {
      width: 44, height: 44, borderRadius: R.md,
      backgroundColor: C.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', paddingVertical: 16 },

    // Payment
    paymentOption: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      padding: 14, borderRadius: R.lg,
      backgroundColor: C.bgElevated,
      borderWidth: 1.5, borderColor: 'transparent',
      marginBottom: 10,
    },
    paymentOptionActive: {
      borderColor: C.primary,
      backgroundColor: C.primaryGlow,
    },
    paymentIconWrap: {
      width: 44, height: 44, borderRadius: R.md,
      backgroundColor: C.primaryGlow,
      alignItems: 'center', justifyContent: 'center',
    },
    paymentLabel: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },

    // Reviews
    reviewSummary: {
      flexDirection: 'row', alignItems: 'center', gap: 16,
      backgroundColor: C.bgElevated,
      borderRadius: R.lg, padding: 16, marginBottom: 16,
    },
    reviewBigRating: { fontSize: 40, fontWeight: '800', color: C.text },
    starsRow: { flexDirection: 'row', gap: 2, marginBottom: 4 },
    reviewSummaryText: { fontSize: 13, color: C.textMuted },
    reviewCard: {
      backgroundColor: C.bgElevated,
      borderRadius: R.lg, padding: 14, marginBottom: 10,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    reviewAvatar: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: C.primaryGlow,
      alignItems: 'center', justifyContent: 'center',
    },
    reviewStarsRow: { flexDirection: 'row', gap: 2 },
    reviewText:   { fontSize: 14, color: C.text, lineHeight: 20 },

    // Favorites
    executorRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: C.divider,
    },
    executorAvatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: C.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    executorAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
    executorName:  { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
    executorRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    executorRating:{ fontSize: 12, color: C.textMuted, fontWeight: '600' },
    orderBtn: {
      backgroundColor: C.primary,
      borderRadius: R.full,
      paddingHorizontal: 14, paddingVertical: 7,
    },
    orderBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

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
      backgroundColor: C.primaryGlow,
      alignItems: 'center', justifyContent: 'center',
    },
    faqQuestionText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
    faqAnswer: {
      fontSize: 13, color: C.textMuted, lineHeight: 19,
      paddingHorizontal: 14, paddingBottom: 14,
    },
  });
}
