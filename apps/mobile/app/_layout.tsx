import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/authStore';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { useAppTheme } from '../src/hooks/useAppTheme';

export default function RootLayout() {
  const { hydrate, isHydrated, user } = useAuthStore();
  const { isDark } = useAppTheme();
  usePushNotifications();

  useEffect(() => { hydrate(); }, []);

  if (!isHydrated) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="(auth)" />
        ) : user.role === 'client' ? (
          <Stack.Screen name="(client)" />
        ) : (
          <Stack.Screen name="(executor)" />
        )}
        <Stack.Screen name="(shared)" />
      </Stack>
    </>
  );
}
