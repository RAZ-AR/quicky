import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { user, isHydrated } = useAuthStore();

  if (!isHydrated) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === 'executor') return <Redirect href="/(executor)" />;
  return <Redirect href="/(client)" />;
}
