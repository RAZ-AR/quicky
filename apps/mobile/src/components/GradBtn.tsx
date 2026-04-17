/**
 * GradBtn — executor gradient button (blue → light-green)
 * Replaces solid COLORS.executor backgrounds on action buttons.
 */
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ── Gradient palette ──────────────────────────────────────────────────────────
export const EXEC_GRAD  = ['#45BFFF', '#5DEBAA'] as const;  // blue → mint
export const EXEC_GRAD_DARK = ['#60C8FF', '#78F0C0'] as const; // brighter for dark mode

interface GradBtnProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  isDark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export default function GradBtn({ label, onPress, style, textStyle, isDark = false, size = 'md', icon }: GradBtnProps) {
  const colors = isDark ? EXEC_GRAD_DARK : EXEC_GRAD;
  const pad = size === 'sm' ? { paddingVertical: 8, paddingHorizontal: 16 }
            : size === 'lg' ? { paddingVertical: 16, paddingHorizontal: 24 }
            : { paddingVertical: 13, paddingHorizontal: 20 };
  const fs  = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={[styles.wrap, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.grad, pad]}
      >
        {icon}
        <Text style={[styles.label, { fontSize: fs }, textStyle]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    shadowColor: '#45BFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 6,
  },
  grad: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
