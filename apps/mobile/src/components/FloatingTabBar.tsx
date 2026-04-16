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

            // Animate active tab width: inactive=48, active=116
            const tabW = widthAnims[i].interpolate({
              inputRange:  [0, 1],
              outputRange: [48, 116],
            });
            const labelOpacity = widthAnims[i];

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => { if (route) navigation.navigate(route.name); }}
                activeOpacity={0.85}
              >
                <Animated.View
                  style={[
                    s.tabInner,
                    focused ? s.tabActive : s.tabInactive,
                    { width: tabW, height: ACTIVE_H },
                  ]}
                >
                  <Ionicons
                    name={focused ? iconName : (`${iconName}-outline` as any)}
                    size={20}
                    color={focused ? '#1C1C1E' : 'rgba(255,255,255,0.55)'}
                  />
                  <Animated.Text
                    style={[s.tabLabel, { opacity: labelOpacity }]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Animated.Text>
                </Animated.View>
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
    backgroundColor: '#1C1C1E',
    borderRadius:    999,
    // subtle shadow
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.25,
    shadowRadius:    12,
    elevation:       12,
  },
  tabInner: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   999,
    gap:            6,
    overflow:       'hidden',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#1C1C1E',
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
