import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS } from '../constants/config';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;   // 0–100, сила blur
  variant?: 'default' | 'violet' | 'cyan' | 'elevated';
  radius?: number;
}

export function GlassCard({
  children,
  style,
  intensity = 20,
  variant = 'default',
  radius = RADIUS.xl,
}: GlassCardProps) {
  const overlayColor = {
    default:  COLORS.glass,
    violet:   COLORS.glassViolet,
    cyan:     COLORS.glassCyan,
    elevated: COLORS.glassLight,
  }[variant];

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: overlayColor,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
          },
        ]}
      />
      <View style={{ position: 'relative' }}>{children}</View>
    </View>
  );
}
