import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore, type SocialResult } from '../../src/stores/authStore';
import { RADIUS, type AppColors } from '../../src/constants/config';
import { useAppTheme } from '../../src/hooks/useAppTheme';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? '';

export default function LoginScreen() {
  const router   = useRouter();
  const { loginWithGoogle, loginWithApple, initTelegramLogin, pollTelegramLogin } = useAuthStore();
  const { COLORS, GRADIENTS, isDark, blurTint } = useAppTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const [busyProvider, setBusyProvider] = useState<'google' | 'apple' | 'telegram' | null>(null);

  // ── Google ────────────────────────────────────────────────────────────────
  const [, googleResponse, googlePrompt] = Google.useAuthRequest({
    iosClientId:     GOOGLE_IOS_CLIENT_ID     || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId:     GOOGLE_WEB_CLIENT_ID     || undefined,
  });

  useEffect(() => {
    if (googleResponse?.type !== 'success') {
      if (googleResponse?.type === 'error' || googleResponse?.type === 'dismiss') setBusyProvider(null);
      return;
    }
    const idToken = googleResponse.authentication?.idToken;
    if (!idToken) { setBusyProvider(null); return; }
    loginWithGoogle(idToken).then(goNext).catch(() => {
      Alert.alert('Ошибка', 'Не удалось войти через Google');
      setBusyProvider(null);
    });
  }, [googleResponse]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function goNext(result: SocialResult) {
    if (!result.is_new_user) return; // root index перенаправит автоматически
    router.replace({
      pathname: '/(auth)/register',
      params: { temp_token: result.temp_token ?? '', suggested_name: result.suggested_name ?? '' },
    });
  }

  // ── Apple ─────────────────────────────────────────────────────────────────
  const handleApple = async () => {
    setBusyProvider('apple');
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) throw new Error('no token');
      const fullName = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ') || undefined;
      const result = await loginWithApple(cred.identityToken, fullName);
      goNext(result);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Ошибка', 'Не удалось войти через Apple');
    } finally {
      setBusyProvider(null);
    }
  };

  // ── Telegram ──────────────────────────────────────────────────────────────
  const handleTelegram = async () => {
    setBusyProvider('telegram');
    try {
      const { session_id, widget_url } = await initTelegramLogin();
      await WebBrowser.openAuthSessionAsync(widget_url, 'quicky://auth/telegram');

      // Поллим пока пользователь авторизовался
      let attempts = 0;
      const poll = async (): Promise<void> => {
        if (attempts++ > 40) throw new Error('timeout');
        const result = await pollTelegramLogin(session_id);
        if (result.status === 'pending' as any) {
          await new Promise(r => setTimeout(r, 1000));
          return poll();
        }
        goNext(result);
      };
      await poll();
    } catch {
      Alert.alert('Ошибка', 'Не удалось войти через Telegram');
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={GRADIENTS.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.inner}>

          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoWrap}>
              <LinearGradient colors={GRADIENTS.primary} style={StyleSheet.absoluteFill} />
              <View style={styles.logoBorder} />
              <Text style={styles.logoEmoji}>⚡</Text>
            </View>
            <Text style={styles.logoText}>Quicky</Text>
            <Text style={styles.tagline}>Быстрые поручения рядом</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <BlurView intensity={20} tint={blurTint} style={StyleSheet.absoluteFill} />
            <View style={styles.cardBg} />
            <View style={{ position: 'relative', padding: 24, gap: 12 }}>
              <Text style={styles.cardTitle}>Войдите, чтобы начать</Text>
              <Text style={styles.cardSub}>Выберите удобный способ</Text>

              <SocialBtn
                emoji="🔵" label="Продолжить с Google"
                color="#4285F4"
                loading={busyProvider === 'google'}
                disabled={!!busyProvider}
                onPress={() => { setBusyProvider('google'); googlePrompt(); }}
                styles={styles}
              />

              <SocialBtn
                emoji="✈️" label="Продолжить с Telegram"
                color="#2AABEE"
                loading={busyProvider === 'telegram'}
                disabled={!!busyProvider}
                onPress={handleTelegram}
                styles={styles}
              />

              {Platform.OS === 'ios' && (
                <SocialBtn
                  emoji="🍎" label="Продолжить с Apple"
                  color={isDark ? '#FFFFFF' : '#1C1C1E'}
                  loading={busyProvider === 'apple'}
                  disabled={!!busyProvider}
                  onPress={handleApple}
                  styles={styles}
                />
              )}
            </View>
          </View>

          <Text style={styles.terms}>
            Продолжая, вы принимаете{' '}
            <Text style={styles.termsLink}>условия использования</Text>
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function SocialBtn({ emoji, label, color, loading, disabled, onPress, styles }: {
  emoji: string; label: string; color: string;
  loading: boolean; disabled: boolean;
  onPress: () => void; styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, disabled && !loading && { opacity: 0.45 }]}
      onPress={onPress} disabled={disabled} activeOpacity={0.78}
    >
      <View style={[styles.btnIcon, { backgroundColor: color + '18' }]}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      {loading
        ? <ActivityIndicator color={color} style={{ flex: 1 }} />
        : <Text style={styles.btnLabel}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

function makeStyles(C: AppColors, R = RADIUS) {
  return StyleSheet.create({
    root:  { flex: 1, backgroundColor: C.bg },
    safe:  { flex: 1 },
    inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 28 },

    glow1: { position: 'absolute', top: '8%',   left: '-20%', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,140,90,0.10)' },
    glow2: { position: 'absolute', bottom: '12%', right: '-20%', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(61,122,94,0.08)' },

    logoSection: { alignItems: 'center', gap: 10 },
    logoWrap:    { width: 80, height: 80, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    logoBorder:  { ...StyleSheet.absoluteFillObject, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
    logoEmoji:   { fontSize: 40, position: 'relative' },
    logoText:    { fontSize: 34, fontWeight: '800', color: C.text, letterSpacing: -1 },
    tagline:     { fontSize: 15, color: C.textMuted },

    card:   { width: '100%', borderRadius: R.xxl, overflow: 'hidden', borderWidth: 1, borderColor: (C as any).glassBorder ?? 'rgba(255,255,255,0.14)' },
    cardBg: { ...StyleSheet.absoluteFillObject, backgroundColor: (C as any).glass ?? 'rgba(255,255,255,0.06)' },
    cardTitle: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
    cardSub:   { fontSize: 14, color: C.textMuted, marginBottom: 6 },

    btn: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: C.bgLayer, borderRadius: R.xl, padding: 14,
      borderWidth: 1, borderColor: C.border ?? C.divider,
    },
    btnIcon:  { width: 40, height: 40, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
    btnLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: C.text },

    terms:     { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18 },
    termsLink: { color: C.primary, fontWeight: '600' },
  });
}
