import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, Alert, Platform,
  SafeAreaView as RNSafeArea,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore, type SocialResult } from '../../src/stores/authStore';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? '';

// ── Quicky palette (static — login is always light) ──────────────────────────
const Q = {
  bg:    '#F3F1EC',
  card:  '#FFFFFF',
  ink:   '#14141A',
  ink50: 'rgba(20,20,26,0.52)',
  ink20: 'rgba(20,20,26,0.20)',
  ink08: 'rgba(20,20,26,0.08)',
  acid:  '#D6F24A',
  acidD: '#B6D330',
  mint:  '#C9E9D0',
  sky:   '#C7E6FF',
  r:     { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 },
};

export default function LoginScreen() {
  const router = useRouter();
  const { loginWithGoogle, loginWithApple, initTelegramLogin, pollTelegramLogin } = useAuthStore();
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

  function goNext(result: SocialResult) {
    if (!result.is_new_user) return;
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
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.inner}>

          {/* ── Logo ── */}
          <View style={s.logoSection}>
            <View style={s.logoMark}>
              <Text style={s.logoEmoji}>⚡</Text>
            </View>
            <Text style={s.logoText}>Quicky</Text>
            <Text style={s.tagline}>Быстрые поручения рядом</Text>
          </View>

          {/* ── Role cards ── */}
          <View style={s.rolesRow}>
            <View style={[s.roleCard, { backgroundColor: Q.acid }]}>
              <View style={s.roleIconWrap}>
                <Text style={{ fontSize: 28 }}>🛍️</Text>
              </View>
              <Text style={[s.roleTitle, { color: Q.ink }]}>Заказчик</Text>
              <Text style={[s.roleDesc, { color: Q.ink50 }]}>Создавайте задания</Text>
            </View>
            <View style={[s.roleCard, { backgroundColor: Q.mint }]}>
              <View style={s.roleIconWrap}>
                <Text style={{ fontSize: 28 }}>⚡</Text>
              </View>
              <Text style={[s.roleTitle, { color: Q.ink }]}>Исполнитель</Text>
              <Text style={[s.roleDesc, { color: Q.ink50 }]}>Выполняйте заказы</Text>
            </View>
          </View>

          {/* ── Login buttons ── */}
          <View style={s.authCard}>
            <Text style={s.authTitle}>Войти</Text>
            <Text style={s.authSub}>Роль определяется после входа</Text>

            <TouchableOpacity
              style={[s.authBtn, busyProvider && busyProvider !== 'google' && s.authBtnDim]}
              onPress={() => { setBusyProvider('google'); googlePrompt(); }}
              disabled={!!busyProvider}
              activeOpacity={0.75}
            >
              <View style={[s.authBtnIcon, { backgroundColor: '#4285F418' }]}>
                <Text style={{ fontSize: 18 }}>🔵</Text>
              </View>
              {busyProvider === 'google'
                ? <ActivityIndicator color={Q.ink} style={{ flex: 1 }} />
                : <Text style={s.authBtnLabel}>Google</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.authBtn, busyProvider && busyProvider !== 'telegram' && s.authBtnDim]}
              onPress={handleTelegram}
              disabled={!!busyProvider}
              activeOpacity={0.75}
            >
              <View style={[s.authBtnIcon, { backgroundColor: '#2AABEE18' }]}>
                <Text style={{ fontSize: 18 }}>✈️</Text>
              </View>
              {busyProvider === 'telegram'
                ? <ActivityIndicator color={Q.ink} style={{ flex: 1 }} />
                : <Text style={s.authBtnLabel}>Telegram</Text>
              }
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[s.authBtnDark, busyProvider && busyProvider !== 'apple' && s.authBtnDim]}
                onPress={handleApple}
                disabled={!!busyProvider}
                activeOpacity={0.75}
              >
                <View style={[s.authBtnIcon, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                  <Text style={{ fontSize: 18 }}>🍎</Text>
                </View>
                {busyProvider === 'apple'
                  ? <ActivityIndicator color="#fff" style={{ flex: 1 }} />
                  : <Text style={[s.authBtnLabel, { color: '#fff' }]}>Apple</Text>
                }
              </TouchableOpacity>
            )}
          </View>

          <Text style={s.terms}>
            Продолжая, вы принимаете{' '}
            <Text style={s.termsLink}>условия использования</Text>
          </Text>

        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Q.bg },
  safe: { flex: 1 },
  inner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, gap: 24,
  },

  // Logo
  logoSection: { alignItems: 'center', gap: 8 },
  logoMark: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Q.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 36 },
  logoText: {
    fontSize: 38, fontWeight: '800', color: Q.ink,
    letterSpacing: -1.5,
  },
  tagline: { fontSize: 15, color: Q.ink50 },

  // Role cards
  rolesRow: { flexDirection: 'row', gap: 12, width: '100%' },
  roleCard: {
    flex: 1, borderRadius: Q.r.xl, padding: 16, gap: 8,
    shadowColor: '#14141A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  roleIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  roleTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  roleDesc:  { fontSize: 12, fontWeight: '500' },

  // Auth card
  authCard: {
    width: '100%', backgroundColor: Q.card, borderRadius: Q.r.xl,
    padding: 20, gap: 10,
    shadowColor: '#14141A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  authTitle: { fontSize: 20, fontWeight: '800', color: Q.ink, letterSpacing: -0.4 },
  authSub:   { fontSize: 13, color: Q.ink50, marginBottom: 4 },

  authBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Q.bg, borderRadius: Q.r.lg,
    padding: 14, borderWidth: 1, borderColor: Q.ink08,
  },
  authBtnDark: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Q.ink, borderRadius: Q.r.lg, padding: 14,
  },
  authBtnDim: { opacity: 0.4 },
  authBtnIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  authBtnLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Q.ink },

  // Terms
  terms: { fontSize: 12, color: Q.ink50, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: Q.ink, fontWeight: '600' },
});
