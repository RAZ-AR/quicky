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

// ── Quicky Dark Dock Tab Bar ───────────────────────────────────────────────────
// Dark pill (#0E0E10) · Active: acid yellow (#D6F24A) · Inactive: white/55%

const SIDE_PAD   = 16;
const BAR_HEIGHT = 60;
const BTN_SIZE   = 52;
const BTN_GAP    = 10;

export function FloatingTabBar({
  state, navigation,
  tabs,
  actionButton, centerAction,
}: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W } = useWindowDimensions();
  const btnAction = actionButton ?? centerAction;

  const activeIndex = tabs.findIndex(t => t.name === state.routes[state.index]?.name);
  const safeIdx     = Math.max(0, activeIndex);

  const scaleAnims = useRef(tabs.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.spring(scaleAnims[safeIdx], {
      toValue: 1.05, useNativeDriver: true, tension: 300, friction: 20,
    }).start(() => {
      Animated.spring(scaleAnims[safeIdx], {
        toValue: 1, useNativeDriver: true, tension: 300, friction: 20,
      }).start();
    });
  }, [safeIdx]);

  const bottomPad   = Math.max(insets.bottom, 8);
  const containerW  = SCREEN_W - SIDE_PAD * 2;
  const pillW       = btnAction ? containerW - BTN_SIZE - BTN_GAP : containerW;

  return (
    <View style={[s.root, { height: BAR_HEIGHT + bottomPad + 10, paddingBottom: bottomPad }]}>
      <View style={[s.row, { width: containerW }]}>

        {/* ── Dark dock pill ── */}
        <View style={[s.dock, { width: pillW, height: BAR_HEIGHT }]}>
          {tabs.map((tab, i) => {
            const focused  = safeIdx === i;
            const route    = state.routes.find(r => r.name === tab.name);
            const iconName = (tab.ionIcon ?? 'ellipse') as any;

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => { if (route) navigation.navigate(route.name); }}
                activeOpacity={0.75}
                style={focused ? s.tabActive : s.tabInactive}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={focused ? '#14141A' : 'rgba(255,255,255,0.55)'}
                />
                {focused && (
                  <Text style={s.tabLabel} numberOfLines={1}>
                    {tab.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Acid action button ── */}
        {btnAction && (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={btnAction.onPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={26} color="#14141A" />
          </TouchableOpacity>
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

  // ── Dark dock ──
  dock: {
    backgroundColor: '#0E0E10',
    borderRadius:    999,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-evenly',
    paddingHorizontal: 8,
    // Shadow
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 8 },
    shadowOpacity:  0.30,
    shadowRadius:   20,
    elevation:      16,
  },

  // ── Active tab: acid yellow pill ──
  tabActive: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               6,
    height:            42,
    paddingHorizontal: 16,
    backgroundColor:   '#D6F24A',
    borderRadius:      999,
    shadowColor:       '#B6D330',
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.40,
    shadowRadius:      6,
  },
  tabInactive: {
    width:           46,
    height:          42,
    alignItems:      'center',
    justifyContent:  'center',
  },
  tabLabel: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#14141A',
    letterSpacing: -0.1,
  },

  // ── Acid action button ──
  actionBtn: {
    width:           BTN_SIZE,
    height:          BTN_SIZE,
    borderRadius:    BTN_SIZE / 2,
    backgroundColor: '#D6F24A',
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#B6D330',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.40,
    shadowRadius:    10,
    elevation:       8,
  },
});
