import { Tabs } from 'expo-router';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { FloatingTabBar, type TabConfig } from '../../src/components/FloatingTabBar';

const EXECUTOR_TABS: TabConfig[] = [
  { name: 'index',   icon: '⚡', label: 'Главная' },
  { name: 'orders',  icon: '📋', label: 'Заказы'  },
  { name: 'chat',    icon: '💬', label: 'Чат'     },
  { name: 'profile', icon: '👤', label: 'Профиль' },
];

export default function ExecutorLayout() {
  const { COLORS } = useAppTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <FloatingTabBar {...props} tabs={EXECUTOR_TABS} accentColor={COLORS.executor} />
      )}
    >
      <Tabs.Screen name="index"   />
      <Tabs.Screen name="orders"  />
      <Tabs.Screen name="chat"    />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="feed"       options={{ href: null }} />
      <Tabs.Screen name="task/[id]"  options={{ href: null }} />
    </Tabs>
  );
}
