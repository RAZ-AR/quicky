import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
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

const SIDE_MARGIN = 20;
const PILL_PADDING = 4;
const BAR_HEIGHT = 62;

export function FloatingTabBar({ state, navigation, tabs, accentColor }: FloatingTabBarProps) {
  const { COLORS, blurTint, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const CONTAINER_WIDTH = SCREEN_WIDTH - SIDE_MARGIN * 2;
  const TAB_WIDTH = CONTAINER_WIDTH / tabs.length;
  const PILL_W = TAB_WIDTH - PILL_PADDING * 2;
  const PILL_H = BAR_HEIGHT - PILL_PADDING * 2;

  const activeIndex = tabs.findIndex(t => t.name === state.routes[state.index]?.name);
  const safeIndex = Math.max(0, activeIndex);

  const slideAnim = useRef(new Animated.Value(safeIndex)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: safeIndex,
      useNativeDriver: true,
      tension: 75,
      friction: 11,
    }).start();
  }, [safeIndex]);

  const pillX = slideAnim.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => PILL_PADDING + TAB_WIDTH * i),
  });

  const containerBg = isDark
    ? 'rgba(13,11,30,0.72)'
    : 'rgba(248,247,255,0.78)';

  const pillBg = isDark
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(255,255,255,0.95)';

  const bottomOffset = insets.bottom > 0 ? insets.bottom + 8 : 16;

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset, width: CONTAINER_WIDTH }]}>
      {/* Shadow ring */}
      <View style={[styles.shadow, { shadowColor: accentColor }]} />

      {/* Clipping container */}
      <View style={[styles.clip, { height: BAR_HEIGHT }]}>
        {/* Blur layer */}
        <BlurView
          intensity={50}
          tint={blurTint}
          style={StyleSheet.absoluteFill}
        />
        {/* Color overlay */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: containerBg }]} />
        {/* Border */}
        <View style={[StyleSheet.absoluteFill, styles.border, { borderColor: COLORS.glassBorder }]} />

        {/* Sliding pill */}
        <Animated.View
          style={[
            styles.pill,
            {
              width: PILL_W,
              height: PILL_H,
              backgroundColor: pillBg,
              transform: [{ translateX: pillX }],
              shadowColor: accentColor,
              shadowOpacity: isDark ? 0.45 : 0.20,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        />

        {/* Tab buttons */}
        {tabs.map((tab, index) => {
          const focused = safeIndex === index;
          const route = state.routes.find(r => r.name === tab.name);

          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tab, { width: TAB_WIDTH, height: BAR_HEIGHT }]}
              onPress={() => {
                if (!focused && route) navigation.navigate(route.name);
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.icon, { opacity: focused ? 1 : 0.38 }]}>
                {tab.icon}
              </Text>
              <Text
                style={[
                  styles.label,
                  {
                    color: focused ? accentColor : COLORS.textMuted,
                    fontWeight: focused ? '700' : '500',
                    opacity: focused ? 1 : 0.65,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignSelf: 'center',
    left: SIDE_MARGIN,
    zIndex: 999,
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  clip: {
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  border: {
    borderRadius: 999,
    borderWidth: 1,
  },
  pill: {
    position: 'absolute',
    top: PILL_PADDING,
    borderRadius: 999,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  icon:  { fontSize: 18 },
  label: { fontSize: 10, letterSpacing: 0.1 },
});
