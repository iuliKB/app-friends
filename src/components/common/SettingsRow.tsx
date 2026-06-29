// Canonical "link list" row — the single source of truth for the app's minimal
// settings/info/toggle rows. Codifies the own-profile page style verbatim
// (src/app/(tabs)/profile.tsx): a full-bleed row with a flat leading Ionicon,
// a regular label, a full-width bottom hairline divider, and one of a few
// trailing accessories (chevron / Switch / value text / custom node).
//
// Pair with SettingsSection for an uppercase section header. Used by the
// profile screen, chat info screens, the friend action sheet, and the friend
// profile Info/Mutual sections.

import React, { useMemo } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  /** 'destructive' tints the icon + label with the destructive color. */
  tone?: 'default' | 'destructive';
  disabled?: boolean;
  /** Trailing chevron (navigation affordance). May combine with `value`. */
  chevron?: boolean;
  /** Right-aligned secondary value text (e.g. a count or a time). */
  value?: string;
  /** Toggle accessory — renders a Switch when defined. */
  switchValue?: boolean;
  onToggle?: (next: boolean) => void;
  switchDisabled?: boolean;
  /** Escape hatch for custom trailing content (rendered before the chevron). */
  trailing?: React.ReactNode;
  /** Suppresses the bottom hairline (e.g. for a section's final row). */
  hideDivider?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function SettingsRow({
  icon,
  label,
  onPress,
  tone = 'default',
  disabled = false,
  chevron = false,
  value,
  switchValue,
  onToggle,
  switchDisabled,
  trailing,
  hideDivider = false,
  accessibilityLabel,
  accessibilityHint,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const destructive = tone === 'destructive';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          paddingHorizontal: SPACING.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        rowNoDivider: {
          borderBottomWidth: 0,
        },
        rowDisabled: {
          opacity: 0.4,
        },
        icon: {
          marginRight: SPACING.md,
        },
        label: {
          flex: 1,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: destructive ? colors.interactive.destructive : colors.text.primary,
        },
        right: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        },
        value: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
      }),
    [colors, destructive]
  );

  const hasSwitch = switchValue !== undefined;

  const content = (
    <>
      <Ionicons
        name={icon}
        size={FONT_SIZE.xl}
        color={destructive ? colors.interactive.destructive : colors.text.secondary}
        style={styles.icon}
      />
      <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
      <View style={styles.right}>
        {value !== undefined && <Text style={styles.value}>{value}</Text>}
        {trailing}
        {hasSwitch && (
          <Switch
            value={switchValue}
            onValueChange={onToggle}
            disabled={switchDisabled}
            trackColor={{ false: colors.border, true: colors.interactive.accent + '40' }}
            thumbColor={switchValue ? colors.interactive.accent : colors.border}
          />
        )}
        {chevron && <Ionicons name="chevron-forward" size={SPACING.lg} color={colors.border} />}
      </View>
    </>
  );

  const rowStyle = [styles.row, hideDivider && styles.rowNoDivider, disabled && styles.rowDisabled];

  if (onPress) {
    return (
      <TouchableOpacity
        style={rowStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={rowStyle}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {content}
    </View>
  );
}
