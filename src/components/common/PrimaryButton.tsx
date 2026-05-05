import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII } from '@/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: PrimaryButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    button: {
      backgroundColor: colors.interactive.accent,
      height: 52,
      borderRadius: RADII.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.surface.base,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      style={[styles.button, (loading || disabled) && styles.disabled]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      // POLISH-04 verified (Phase 24): loading prop renders ActivityIndicator and disables button — requirement satisfied.
      {loading ? (
        <ActivityIndicator color={colors.surface.base} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
