import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS } from '../../src/constants/config';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      {focused && <View style={styles.tabActivePill} />}
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function ExecutorLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView
            intensity={60}
            tint="dark"
            style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
          />
        ),
      }}
    >
      <Tabs.Screen name="index"   options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⚡" label="Главная"  focused={focused} /> }} />
      <Tabs.Screen name="orders"  options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📋" label="Заказы"   focused={focused} /> }} />
      <Tabs.Screen name="chat"    options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💬" label="Чат"      focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Профиль"  focused={focused} /> }} />
      <Tabs.Screen name="feed"       options={{ href: null }} />
      <Tabs.Screen name="task/[id]"  options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(13,11,30,0.85)',
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    height: Platform.OS === 'ios' ? 84 : 72,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 10,
    position: 'absolute',
  },
  tabItem:        { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  tabActivePill:  {
    position: 'absolute', top: -6,
    width: 24, height: 3, borderRadius: 2,
    backgroundColor: COLORS.executor,
  },
  tabIcon:        { fontSize: 20, marginBottom: 3, opacity: 0.5 },
  tabIconActive:  { opacity: 1 },
  tabLabel:       { fontSize: 10, color: COLORS.tabBarInactive, fontWeight: '500' },
  tabLabelActive: { color: COLORS.executor, fontWeight: '700' },
});
