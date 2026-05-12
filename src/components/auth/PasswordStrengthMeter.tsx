import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';

interface PasswordStrengthMeterProps {
  password: string;
}

type Strength = 0 | 1 | 2 | 3;

function computeStrength(p: string): Strength {
  if (!p) return 0;
  const hasLetter = /[a-zA-Z]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasUpper = /[A-Z]/.test(p);
  const hasSpecial = /[^a-zA-Z0-9]/.test(p);
  if (p.length < 8 || !hasLetter || !hasNumber) return 1;
  if (p.length >= 12 || (hasUpper && hasSpecial)) return 3;
  return 2;
}

const LABELS: Record<Strength, string> = {
  0: 'Min 8 characters, one letter, one number',
  1: 'Too weak',
  2: 'Fair',
  3: 'Strong',
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { colors } = useTheme();
  const strength = computeStrength(password);

  const colorMap: Record<Strength, string> = {
    0: colors.border,
    1: colors.interactive.destructive,
    2: colors.status.maybe,
    3: colors.status.free,
  };
  const activeColor = colorMap[strength];
  const labelColor = strength === 0 ? colors.text.secondary : activeColor;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginTop: SPACING.sm },
        bars: { flexDirection: 'row', gap: SPACING.xs },
        bar: {
          flex: 1,
          height: 4,
          borderRadius: RADII.xs,
          backgroundColor: colors.border,
        },
        label: {
          marginTop: SPACING.xs,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
        },
      }),
    [colors]
  );

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Password strength: ${LABELS[strength]}`}
      accessibilityValue={{ min: 0, max: 3, now: strength }}
    >
      <View style={styles.bars}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.bar, i <= strength && { backgroundColor: activeColor }]} />
        ))}
      </View>
      <Text style={[styles.label, { color: labelColor }]}>{LABELS[strength]}</Text>
    </View>
  );
}
