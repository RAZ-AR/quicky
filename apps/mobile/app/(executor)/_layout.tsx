import { Tabs } from 'expo-router';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { FloatingTabBar, type TabConfig } from '../../src/components/FloatingTabBar';

const EXECUTOR_TABS: TabConfig[] = [
  { name: 'index',   ionIcon: 'flash-outline',  icon: 'G', label: 'Главная' },
  { name: 'orders',  ionIcon: 'list-outline',   icon: 'Z', label: 'Задания' },
  { name: 'profile', ionIcon: 'person-outline', icon: 'P', label: 'Профиль' },
];

export default function ExecutorLayout() {
  const { COLORS } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
      }}
      tabBar={(props) => (
        <FloatingTabBar
          {...props}
          tabs={EXECUTOR_TABS}
          accentColor={COLORS.executor}
        />
      )}
    >
      <Tabs.Screen name="index"   />
      <Tabs.Screen name="orders"  />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="chat"       options={{ href: null }} />
      <Tabs.Screen name="feed"       options={{ href: null }} />
      <Tabs.Screen name="task/[id]"  options={{ href: null }} />
    </Tabs>
  );
}
