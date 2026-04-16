import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '../hooks/useAppTheme';

export interface TabConfig {
  name: string;
  icon: string;
  label: string;
}

interface FloatingTabBarProps extends BottomTabBarProps {
  tabs: TabConfig[];
  accentColor: string;
  centerAction?: {
    onPress: () => void;
    icon?: string;
  };
}

const SIDE_PAD    = 16;
const BAR_HEIGHT  = 58;
const CENTER_SIZE = 52;

export function FloatingTabBar({ state, navigation, tabs, accentColor, centerAction }: FloatingTabBarProps) {
  const { COLORS, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const containerWidth = SCREEN_WIDTH - SIDE_PAD * 2;
  const hasCenterAction = !!centerAction && tabs.length === 4;

  const activeIndex = tabs.findIndex(t => t.name === state.routes[state.index]?.name);
  const safeIdx = Math.max(0, activeIndex);

  const totalHeight = BAR_HEIGHT + insets.bottom + 16;
  const bgColor = isDark ? '#242220' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(245,243,239,0.09)' : 'rgba(28,28,30,0.08)';

  if (hasCenterAction) {
    // Split: 2 tabs on left, gap in middle, 2 tabs on right
    const leftTabs  = tabs.slice(0, 2);
    const rightTabs = tabs.slice(2, 4);
    const gapWidth  = CENTER_SIZE + 20;
    const sideWidth = (containerWidth - gapWidth) / 2;
    const tabWidth  = sideWidth / 2;

    return (
      <View style={[styles.root, { height: totalHeight, paddingBottom: Math.max(insets.bottom, 8) }]}>
        {/* Tab pill bar */}
        <View
          style={[
            styles.splitBar,
            {
              width: containerWidth,
              height: BAR_HEIGHT,
              backgroundColor: bgColor,
              borderColor,
            },
          ]}
        >
          {/* Left 2 tabs */}
          {leftTabs.map((tab, i) => {
            const focused = safeIdx === i;
            const route   = state.routes.find(r => r.name === tab.name);
            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.tab, { width: tabWidth }]}
                onPress={() => { if (!focused && route) navigation.navigate(route.name); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.icon, { opacity: focused ? 1 : 0.35 }]}>{tab.icon}</Text>
                <Text style={[
                  styles.label,
                  { color: focused ? accentColor : COLORS.tabBarInactive, fontWeight: focused ? '700' : '500' },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Center gap */}
          <View style={{ width: gapWidth }} />

          {/* Right 2 tabs */}
          {rightTabs.map((tab, i) => {
            const realIdx = i + 2;
            const focused = safeIdx === realIdx;
            const route   = state.routes.find(r => r.name === tab.name);
            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.tab, { width: tabWidth }]}
                onPress={() => { if (!focused && route) navigation.navigate(route.name); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.icon, { opacity: focused ? 1 : 0.35 }]}>{tab.icon}</Text>
                <Text style={[
                  styles.label,
                  { color: focused ? accentColor : COLORS.tabBarInactive, fontWeight: focused ? '700' : '500' },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center action button — floating above bar */}
        <TouchableOpacity
          style={[
            styles.centerBtn,
            {
              backgroundColor: accentColor,
              bottom: Math.max(insets.bottom, 8) + BAR_HEIGHT / 2 - CENTER_SIZE / 2,
              shadowColor: accentColor,
            },
          ]}
          onPress={centerAction!.onPress}
          activeOpacity={0.85}
        >
          <Text style={styles.centerBtnIcon}>{centerAction!.icon ?? '+'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Standard bar (no center action) ──
  const INDICATOR_W = 52;
  const INDICATOR_H = 40;
  const tabWidth    = containerWidth / tabs.length;

  const slideAnim = useRef(new Animated.Value(safeIdx)).current;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: safeIdx,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start();
  }, [safeIdx]);

  const indicatorX = slideAnim.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => {
      const tabCenter = tabWidth * i + tabWidth / 2;
      return tabCenter - INDICATOR_W / 2;
    }),
  });

  return (
    <View style={[styles.root, { height: BAR_HEIGHT + insets.bottom + 12, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View
        style={[
          styles.container,
          {
            width: containerWidth,
            height: BAR_HEIGHT,
            backgroundColor: bgColor,
            borderColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.indicator,
            {
              width: INDICATOR_W,
              height: INDICATOR_H,
              backgroundColor: isDark ? 'rgba(245,243,239,0.10)' : 'rgba(28,28,30,0.07)',
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />
        {tabs.map((tab, index) => {
          const focused = safeIdx === index;
          const route   = state.routes.find(r => r.name === tab.name);
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tab, { width: tabWidth }]}
              onPress={() => { if (!focused && route) navigation.navigate(route.name); }}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.icon, { opacity: focused ? 1 : 0.4, transform: [{ scale: focused ? 1.1 : 1 }] }]}>
                  {tab.icon}
                </Text>
                <Text style={[styles.label, { color: focused ? accentColor : COLORS.tabBarInactive, fontWeight: focused ? '700' : '500' }]}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  container: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  splitBar: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    top: (BAR_HEIGHT - 40) / 2,
    borderRadius: 999,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  icon:  { fontSize: 17 },
  label: { fontSize: 9.5, letterSpacing: 0.2 },
  centerBtn: {
    position: 'absolute',
    alignSelf: 'center',
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 10,
    elevation: 10,
  },
  centerBtnIcon: {
    fontSize: 26,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 30,
  },
});
