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
}

const SIDE_PAD    = 16;
const BAR_HEIGHT  = 58;
const INDICATOR_W = 52;
const INDICATOR_H = 40;

export function FloatingTabBar({ state, navigation, tabs, accentColor }: FloatingTabBarProps) {
  const { COLORS, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const containerWidth = SCREEN_WIDTH - SIDE_PAD * 2;
  const tabWidth = containerWidth / tabs.length;

  const activeIndex = tabs.findIndex(t => t.name === state.routes[state.index]?.name);
  const safeIdx = Math.max(0, activeIndex);

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

  const totalHeight = BAR_HEIGHT + insets.bottom + 12;

  return (
    <View style={[styles.root, { height: totalHeight, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View
        style={[
          styles.container,
          {
            width: containerWidth,
            height: BAR_HEIGHT,
            backgroundColor: isDark ? '#262018' : '#F5EFE0',
            borderColor: isDark ? 'rgba(255,253,246,0.09)' : 'rgba(26,20,16,0.09)',
          },
        ]}
      >
        {/* Sliding active indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              width: INDICATOR_W,
              height: INDICATOR_H,
              backgroundColor: isDark ? 'rgba(255,253,246,0.10)' : 'rgba(26,20,16,0.08)',
              transform: [{ translateX: indicatorX }],
            },
          ]}
        />

        {/* Tab buttons */}
        {tabs.map((tab, index) => {
          const focused = safeIdx === index;
          const route = state.routes.find(r => r.name === tab.name);
          const labelColor = focused ? accentColor : COLORS.tabBarInactive;

          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tab, { width: tabWidth }]}
              onPress={() => {
                if (!focused && route) navigation.navigate(route.name);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Text
                  style={[
                    styles.icon,
                    {
                      opacity: focused ? 1 : 0.4,
                      transform: [{ scale: focused ? 1.1 : 1 }],
                    },
                  ]}
                >
                  {tab.icon}
                </Text>
                <Text
                  style={[
                    styles.label,
                    {
                      color: labelColor,
                      fontWeight: focused ? '700' : '500',
                    },
                  ]}
                >
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
  indicator: {
    position: 'absolute',
    top: (BAR_HEIGHT - INDICATOR_H) / 2,
    borderRadius: 999,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  icon: { fontSize: 17 },
  label: { fontSize: 9.5, letterSpacing: 0.2 },
});
