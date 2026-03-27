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
const PILL_PAD   = 4;
const BAR_HEIGHT = 64;
const TOP_GAP    = 10; // gap between pill top and reserved space top

export function FloatingTabBar({ state, navigation, tabs, accentColor }: FloatingTabBarProps) {
  const { COLORS, blurTint, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const CONTAINER_W = SCREEN_WIDTH - SIDE_MARGIN * 2;
  const TAB_W       = CONTAINER_W / tabs.length;
  const PILL_W      = TAB_W - PILL_PAD * 2;
  const PILL_H      = BAR_HEIGHT - PILL_PAD * 2;

  const activeIndex = tabs.findIndex(t => t.name === state.routes[state.index]?.name);
  const safeIdx     = Math.max(0, activeIndex);

  const slideAnim = useRef(new Animated.Value(safeIdx)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: safeIdx,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [safeIdx]);

  const pillX = slideAnim.interpolate({
    inputRange:  tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => PILL_PAD + TAB_W * i),
  });

  // Dark: deep cosmos glass | Light: violet-tinted glass (contrast for white pill)
  const containerBg = isDark
    ? 'rgba(13,11,30,0.82)'
    : 'rgba(124,58,237,0.13)';

  // Active pill: slightly white glow in dark | solid white in light (pops on violet)
  const pillBg = isDark
    ? 'rgba(255,255,255,0.16)'
    : 'rgba(255,255,255,0.94)';

  // Total height reserved at bottom: pill + gap above + safe area below
  const totalHeight = BAR_HEIGHT + TOP_GAP + Math.max(insets.bottom, 8);

  return (
    <View style={[styles.root, { height: totalHeight }]}>
      {/* Shadow underneath the pill */}
      <View
        style={[
          styles.pillShadow,
          {
            width: CONTAINER_W,
            height: BAR_HEIGHT,
            shadowColor: accentColor,
          },
        ]}
      />

      {/* Pill shape with blur */}
      <View
        style={[
          styles.pill,
          {
            width: CONTAINER_W,
            height: BAR_HEIGHT,
          },
        ]}
      >
        {/* Blur — borderRadius needed on iOS */}
        <BlurView
          intensity={55}
          tint={blurTint}
          style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
        />
        {/* Color fill */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: containerBg }]} />
        {/* Border */}
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.border,
            { borderColor: COLORS.glassBorder },
          ]}
        />

        {/* Sliding active indicator */}
        <Animated.View
          style={[
            styles.indicator,
            {
              width: PILL_W,
              height: PILL_H,
              backgroundColor: pillBg,
              transform: [{ translateX: pillX }],
              shadowColor: accentColor,
              shadowOpacity: isDark ? 0.5 : 0.22,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        />

        {/* Tab buttons */}
        {tabs.map((tab, index) => {
          const focused = safeIdx === index;
          const route   = state.routes.find(r => r.name === tab.name);

          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tab, { width: TAB_W, height: BAR_HEIGHT }]}
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
  // Root reserves space at bottom so content doesn't overlap
  root: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: TOP_GAP,
  },

  // Shadow layer sits behind the pill
  pillShadow: {
    position: 'absolute',
    top: TOP_GAP,
    borderRadius: 999,
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },

  // The visible pill container
  pill: {
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },

  border: {
    borderRadius: 999,
    borderWidth: 1,
  },

  // Active sliding indicator behind text
  indicator: {
    position: 'absolute',
    top: PILL_PAD,
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
