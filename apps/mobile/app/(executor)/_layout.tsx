import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../src/hooks/useAppTheme';

function TabIcon({ icon, label, focused, accentColor, inactiveColor }: {
  icon: string; label: string; focused: boolean;
  accentColor: string; inactiveColor: string;
}) {
  return (
    <View style={layout.tabItem}>
      {focused && <View style={[layout.tabActivePill, { backgroundColor: accentColor }]} />}
      <Text style={[layout.tabIcon, { opacity: focused ? 1 : 0.5 }]}>{icon}</Text>
      <Text style={[layout.tabLabel, { color: focused ? accentColor : inactiveColor, fontWeight: focused ? '700' : '500' }]}>
        {label}
      </Text>
    </View>
  );
}

export default function ExecutorLayout() {
  const { COLORS, blurTint } = useAppTheme();
  const accent = COLORS.executor;

  const tabBarStyle = useMemo(() => ({
    backgroundColor: COLORS.tabBar,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    height: Platform.OS === 'ios' ? 84 : 72,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 10,
    position: 'absolute' as const,
  }), [COLORS]);

  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarShowLabel: false,
    tabBarStyle,
    tabBarBackground: () => (
      <BlurView intensity={60} tint={blurTint} style={[StyleSheet.absoluteFill, { overflow: 'hidden' as const }]} />
    ),
  }), [tabBarStyle, blurTint]);

  const icon = (ico: string, lbl: string) => ({ focused }: { focused: boolean }) => (
    <TabIcon icon={ico} label={lbl} focused={focused}
      accentColor={accent} inactiveColor={COLORS.tabBarInactive} />
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index"   options={{ tabBarIcon: icon('⚡', 'Главная')  }} />
      <Tabs.Screen name="orders"  options={{ tabBarIcon: icon('📋', 'Заказы')   }} />
      <Tabs.Screen name="chat"    options={{ tabBarIcon: icon('💬', 'Чат')      }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: icon('👤', 'Профиль')  }} />
      <Tabs.Screen name="feed"       options={{ href: null }} />
      <Tabs.Screen name="task/[id]"  options={{ href: null }} />
    </Tabs>
  );
}

const layout = StyleSheet.create({
  tabItem:       { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  tabActivePill: { position: 'absolute', top: -6, width: 24, height: 3, borderRadius: 2 },
  tabIcon:       { fontSize: 20, marginBottom: 3 },
  tabLabel:      { fontSize: 10 },
});
