import { View, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { RADIUS } from '../constants/config';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;   // kept for API compatibility, unused
  variant?: 'subtle' | 'default' | 'elevated' | 'accent';
  radius?: number;
  accentColor?: string;
  onPress?: () => void;
}

export function GlassCard({
  children,
  style,
  variant = 'default',
  radius = RADIUS.xl,
  accentColor,
  onPress,
}: GlassCardProps) {
  const { COLORS, isDark } = useAppTheme();

  const bgColor = {
    subtle:   'transparent',
    default:  COLORS.glass,
    elevated: COLORS.bgLayer,
    accent:   COLORS.glassViolet,
  }[variant];

  const borderColor = variant === 'accent'
    ? (accentColor ?? COLORS.primary) + '30'
    : COLORS.glassBorder;

  const shadowStyle: ViewStyle = variant === 'elevated' ? {
    shadowColor: isDark ? '#000' : '#1A1410',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.25 : 0.09,
    shadowRadius: 8,
    elevation: 3,
  } : {};

  const containerStyle: ViewStyle = {
    borderRadius: radius,
    backgroundColor: bgColor,
    borderWidth: variant === 'subtle' ? 0 : 1,
    borderColor,
    ...shadowStyle,
  };

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[containerStyle, style]}
      {...(onPress ? { onPress, activeOpacity: 0.8 } : {})}
    >
      {variant === 'accent' && (
        <View
          style={{
            position: 'absolute',
            left: 0, top: 10, bottom: 10, width: 3,
            backgroundColor: accentColor ?? COLORS.primary,
            borderRadius: 2,
          }}
        />
      )}
      {children}
    </Wrapper>
  );
}
