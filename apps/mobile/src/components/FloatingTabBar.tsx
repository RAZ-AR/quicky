import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export interface TabConfig {
  name:     string;
  icon:     string;          // fallback text (unused if ionIcon set)
  ionIcon?: string;          // Ionicons name — preferred
  label:    string;
}

interface FloatingTabBarProps extends BottomTabBarProps {
  tabs:          TabConfig[];
  accentColor:   string;
  /** Orange action button to the right of the pill */
  actionButton?: { onPress: () => void };
  /** legacy: center action (ignored, use actionButton) */
  centerAction?: { onPress: () => void; icon?: string };
}

const SIDE_PAD   = 20;
const BAR_HEIGHT = 58;
const BTN_SIZE   = 54;
const BTN_GAP    = 10;
const ACTIVE_H   = 44;

// ── Dark pill style (like reference) ──────────────────────────────────────────
export function FloatingTabBar({
  state, navigation,
  tabs, accentColor,
  actionButton, centerAction,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W } = useWindowDimensions();

  // Support legacy centerAction as actionButton fallback
  const btnAction = actionButton ?? centerAction;

  const activeIndex = tabs.findIndex(t => t.name === state.routes[state.index]?.name);
  const safeIdx     = Math.max(0, activeIndex);

  // Animation: active label width expands
  const widthAnims = useRef(tabs.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  useEffect(() => {
    tabs.forEach((_, i) => {
      Animated.spring(widthAnims[i], {
        toValue: i === safeIdx ? 1 : 0,
        useNativeDriver: false,
        tension: 180,
        friction: 20,
      }).start();
    });
  }, [safeIdx]);

  const totalHeight = BAR_HEIGHT + Math.max(insets.bottom, 8) + 8;
  const containerW  = SCREEN_W - SIDE_PAD * 2;
  const pillW       = btnAction ? containerW - BTN_SIZE - BTN_GAP : containerW;

  return (
    <View style={[s.root, { height: totalHeight, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[s.row, { width: containerW }]}>

        {/* ── Dark pill ── */}
        <View style={[s.pill, { width: pillW, height: BAR_HEIGHT }]}>
          {tabs.map((tab, i) => {
            const focused = safeIdx === i;
            const route   = state.routes.find(r => r.name === tab.name);
            const iconName = (tab.ionIcon ?? 'ellipse') as any;

            // Active: icon + label pill. Inactive: icon only (no pill)
            const labelOpacity = widthAnims[i];
            const labelMaxW = widthAnims[i].interpolate({
              inputRange:  [0, 1],
              outputRange: [0, 80],
            });

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => { if (route) navigation.navigate(route.name); }}
                activeOpacity={0.75}
                style={focused ? s.tabActive : s.tabInactive}
              >
                <Ionicons
                  name={iconName}
                  size={24}
                  color={focused ? '#1C1C1E' : 'rgba(255,255,255,0.70)'}
                />
                <Animated.Text
                  style={[s.tabLabel, { opacity: labelOpacity, maxWidth: labelMaxW }]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Orange action button ── */}
        {btnAction && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: accentColor, shadowColor: accentColor }]}
            onPress={btnAction.onPress}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    alignItems:      'center',
    justifyContent:  'flex-end',
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            BTN_GAP,
  },
  pill: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-evenly',
    paddingHorizontal: 6,
    backgroundColor: '#1A1A1A',
    borderRadius:    999,
    // subtle shadow
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.25,
    shadowRadius:    12,
    elevation:       12,
  },
  tabActive: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               7,
    height:            ACTIVE_H,
    paddingHorizontal: 16,
    backgroundColor:   '#FFFFFF',
    borderRadius:      999,
    overflow:          'hidden',
  },
  tabInactive: {
    width:             52,
    height:            ACTIVE_H,
    alignItems:        'center',
    justifyContent:    'center',
    backgroundColor:   'transparent',
  },
  tabLabel: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#1C1C1E',
    overflow:   'hidden',
  },
  actionBtn: {
    width:        BTN_SIZE,
    height:       BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems:   'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius:  10,
    elevation:     10,
  },
});
