/**
 * GradBtn — Quicky dark pill action button
 * Dark ink background (#0E0E10) with acid yellow (#D6F24A) text.
 */
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';

// Kept for backward compat with profile.tsx imports
export const EXEC_GRAD      = ['#0E0E10', '#0E0E10'] as const;
export const EXEC_GRAD_DARK = ['#0E0E10', '#0E0E10'] as const;

interface GradBtnProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  isDark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export default function GradBtn({ label, onPress, style, textStyle, size = 'md', icon }: GradBtnProps) {
  const pad = size === 'sm' ? { paddingVertical: 8, paddingHorizontal: 16 }
            : size === 'lg' ? { paddingVertical: 16, paddingHorizontal: 24 }
            : { paddingVertical: 13, paddingHorizontal: 20 };
  const fs  = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={[styles.wrap, style]}>
      <View style={[styles.inner, pad]}>
        {icon}
        <Text style={[styles.label, { fontSize: fs }, textStyle]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    shadowColor: '#B6D330',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 4,
  },
  inner: {
    borderRadius: 999,
    backgroundColor: '#0E0E10',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    color: '#D6F24A',
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
