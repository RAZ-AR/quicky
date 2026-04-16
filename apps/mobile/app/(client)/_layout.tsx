import { useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { FloatingTabBar, type TabConfig } from '../../src/components/FloatingTabBar';

const CLIENT_TABS: TabConfig[] = [
  { name: 'index',   ionIcon: 'home',   icon: 'H', label: 'Главная' },
  { name: 'tasks',   ionIcon: 'list',   icon: 'Z', label: 'Заказы'  },
  { name: 'profile', ionIcon: 'person', icon: 'P', label: 'Кабинет' },
];

export default function ClientLayout() {
  const { COLORS } = useAppTheme();
  const router = useRouter();

  const handleCreate = useCallback(() => {
    router.push('/(client)/create');
  }, [router]);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <FloatingTabBar
          {...props}
          tabs={CLIENT_TABS}
          accentColor={COLORS.primary}
          actionButton={{ onPress: handleCreate }}
        />
      )}
    >
      <Tabs.Screen name="index"      />
      <Tabs.Screen name="tasks"      />
      <Tabs.Screen name="profile"    />
      <Tabs.Screen name="executors"  options={{ href: null }} />
      <Tabs.Screen name="create"     options={{ href: null }} />
      <Tabs.Screen name="voice"      options={{ href: null }} />
      <Tabs.Screen name="clarify"    options={{ href: null }} />
      <Tabs.Screen name="confirm"    options={{ href: null }} />
      <Tabs.Screen name="tasks/[id]" options={{ href: null }} />
    </Tabs>
  );
}
