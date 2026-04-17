import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/authStore';
import { useTaskStore } from '../src/stores/taskStore';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { getSocket } from '../src/services/socket';

// ── DEV: поменяй на 'client' | 'executor' | null (null = реальный вход) ──────
const DEV_ROLE: 'executor' | 'client' | null = 'executor';
const DEV_USER = DEV_ROLE
  ? { id: 'dev-1', name: 'Алексей И.', role: DEV_ROLE, phone: '+79991234567', rating_avg: 4.8 }
  : null;
// ─────────────────────────────────────────────────────────────────────────────

export default function RootLayout() {
  const { hydrate, isHydrated, user: realUser, token } = useAuthStore();
  const { initSocket } = useTaskStore();
  const { isDark } = useAppTheme();
  usePushNotifications();

  useEffect(() => { hydrate(); }, []);

  // Инициализируем socket listeners когда есть токен
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    initSocket(socket);
  }, [token]);

  if (!isHydrated && !DEV_ROLE) return null;

  const user = DEV_USER ?? realUser;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(client)" />
        <Stack.Screen name="(executor)" />
        <Stack.Screen name="(shared)" />
      </Stack>
    </>
  );
}
