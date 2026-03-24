import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';

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
  return (
    <TouchableOpacity
      style={[styles.button, (loading || disabled) && styles.disabled]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.surface.base} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.interactive.accent,
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
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
  },
});
