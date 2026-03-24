import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../src/constants/config';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function ExecutorLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⚡" label="Главная" focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📋" label="Заказы" focused={focused} /> }} />
      <Tabs.Screen name="chat" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="💬" label="Чат" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Профиль" focused={focused} /> }} />
      <Tabs.Screen name="feed" options={{ href: null }} />
      <Tabs.Screen name="task/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: COLORS.tabBar, borderTopWidth: 0, height: 72, paddingBottom: 8, paddingTop: 8, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  tabIcon: { fontSize: 20, marginBottom: 4 },
  tabLabel: { fontSize: 11, color: COLORS.tabBarInactive, fontWeight: '500' },
  tabLabelActive: { color: COLORS.tabBarActive },
});
