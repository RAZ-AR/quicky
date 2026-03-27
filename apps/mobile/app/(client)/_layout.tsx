import { Tabs } from 'expo-router';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { FloatingTabBar, type TabConfig } from '../../src/components/FloatingTabBar';

const CLIENT_TABS: TabConfig[] = [
  { name: 'index',     icon: '⚡', label: 'Главная' },
  { name: 'tasks',     icon: '📋', label: 'Заказы'  },
  { name: 'executors', icon: '🔍', label: 'Найти'   },
  { name: 'profile',   icon: '👤', label: 'Профиль' },
];

export default function ClientLayout() {
  const { COLORS } = useAppTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <FloatingTabBar {...props} tabs={CLIENT_TABS} accentColor={COLORS.tabBarActive} />
      )}
    >
      <Tabs.Screen name="index"     />
      <Tabs.Screen name="tasks"     />
      <Tabs.Screen name="executors" />
      <Tabs.Screen name="profile"   />
      <Tabs.Screen name="voice"      options={{ href: null }} />
      <Tabs.Screen name="clarify"    options={{ href: null }} />
      <Tabs.Screen name="confirm"    options={{ href: null }} />
      <Tabs.Screen name="tasks/[id]" options={{ href: null }} />
    </Tabs>
  );
}
