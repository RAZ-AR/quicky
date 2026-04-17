import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, useWindowDimensions, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export interface TabConfig {
  name:     string;
  icon:     string;
  ionIcon?: string;
  label:    string;
}

interface FloatingTabBarProps extends BottomTabBarProps {
  tabs:          TabConfig[];
  accentColor:   string;
  actionButton?: { onPress: () => void };
  centerAction?: { onPress: () => void; icon?: string };
}

const SIDE_PAD   = 20;
const BAR_HEIGHT = 58;
const BTN_SIZE   = 54;
const BTN_GAP    = 10;
const ACTIVE_H   = 44;

// ── Liquid Glass Tab Bar ───────────────────────────────────────────────────────
export function FloatingTabBar({
  state, navigation,
  tabs, accentColor,
  actionButton, centerAction,
}: FloatingTabBarProps) {
  const insets   = useSafeAreaInsets();
  const { width: SCREEN_W } = useWindowDimensions();
  const btnAction = actionButton ?? centerAction;

  const activeIndex = tabs.findIndex(t => t.name === state.routes[state.index]?.name);
  const safeIdx     = Math.max(0, activeIndex);

  const widthAnims = useRef(tabs.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  useEffect(() => {
    tabs.forEach((_, i) => {
      Animated.spring(widthAnims[i], {
        toValue: i === safeIdx ? 1 : 0,
        useNativeDriver: false,
        tension: 200,
        friction: 22,
      }).start();
    });
  }, [safeIdx]);

  const totalHeight = BAR_HEIGHT + Math.max(insets.bottom, 8) + 10;
  const containerW  = SCREEN_W - SIDE_PAD * 2;
  const pillW       = btnAction ? containerW - BTN_SIZE - BTN_GAP : containerW;

  return (
    <View style={[s.root, { height: totalHeight, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[s.row, { width: containerW }]}>

        {/* ── Liquid Glass pill ── */}
        <View style={[s.pillWrapper, { width: pillW, height: BAR_HEIGHT }]}>
          {/* Blur layer */}
          <BlurView
            intensity={72}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
          {/* White glass overlay */}
          <View style={s.glassOverlay} />
          {/* Specular highlight — thin top line */}
          <View style={s.specular} />

          {/* Tabs */}
          <View style={s.pillInner}>
            {tabs.map((tab, i) => {
              const focused  = safeIdx === i;
              const route    = state.routes.find(r => r.name === tab.name);
              const iconName = (tab.ionIcon ?? 'ellipse') as any;

              const labelOpacity = widthAnims[i];
              const labelMaxW    = widthAnims[i].interpolate({
                inputRange:  [0, 1],
                outputRange: [0, 78],
              });

              return (
                <TouchableOpacity
                  key={tab.name}
                  onPress={() => { if (route) navigation.navigate(route.name); }}
                  activeOpacity={0.7}
                  style={focused ? s.tabActive : s.tabInactive}
                >
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={focused ? '#FFFFFF' : 'rgba(60,60,67,0.60)'}
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
        </View>

        {/* ── Action button (liquid glass + accent) ── */}
        {btnAction && (
          <View style={s.actionWrapper}>
            <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
            <View style={[s.actionGlassOverlay, { backgroundColor: accentColor + 'CC' }]} />
            <TouchableOpacity
              style={s.actionInner}
              onPress={btnAction.onPress}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    alignItems:      'center',
    justifyContent:  'flex-end',
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           BTN_GAP,
  },

  // ── Pill ──
  pillWrapper: {
    borderRadius:    999,
    overflow:        'hidden',
    // Glass shadow
    shadowColor:     'rgba(0,0,0,0.18)',
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   1,
    shadowRadius:    20,
    elevation:       16,
    // Thin border
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.55)',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  specular: {
    position:        'absolute',
    top:             0,
    left:            24,
    right:           24,
    height:          1,
    backgroundColor: 'rgba(255,255,255,0.90)',
    borderRadius:    999,
  },
  pillInner: {
    flex:             1,
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-evenly',
    paddingHorizontal: 6,
  },

  // ── Active tab ──
  tabActive: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               6,
    height:            ACTIVE_H,
    paddingHorizontal: 14,
    backgroundColor:   'rgba(60,60,67,0.75)',
    borderRadius:      999,
    overflow:          'hidden',
    // inner glow
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.15,
    shadowRadius:      6,
  },
  tabInactive: {
    width:           50,
    height:          ACTIVE_H,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#FFFFFF',
    overflow:   'hidden',
  },

  // ── Action button ──
  actionWrapper: {
    width:        BTN_SIZE,
    height:       BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    overflow:     'hidden',
    borderWidth:  1,
    borderColor:  'rgba(255,255,255,0.50)',
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius:  14,
    elevation:     12,
  },
  actionGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  actionInner: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
