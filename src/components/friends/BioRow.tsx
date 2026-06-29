// Bio row — a flat SettingsRow-style row with expand/collapse.
//
// Matches the minimal SettingsRow look (flat leading icon, full-bleed bottom
// hairline) but adds a multi-line body below the label, which the single-line
// SettingsRow can't express. Renders the bio paragraph below the label row;
// collapses to 3 lines
// when bio overflows. Tap-to-expand uses LayoutAnimation.configureNext BEFORE
// setState per Phase 29.1 Pitfall 9 (LayoutAnimation must be configured before
// the next React render — call site documented in STATE.md row 99).

import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  type TextLayoutEventData,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';

// Required for LayoutAnimation on Android (no-op on iOS); idempotent on multiple calls.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BIO_COLLAPSED_LINES = 3;

interface BioRowProps {
  bio: string; // non-empty string; parent (Plan 06 screen) gates this — null bio → don't render BioRow at all
  hideDivider?: boolean; // suppress the bottom hairline (e.g. a section's final row)
}

export function BioRow({ bio, hideDivider }: BioRowProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  function handleTextLayout(e: NativeSyntheticEvent<TextLayoutEventData>) {
    // Use `>` (not `>=`): when the natural line count exceeds the collapsed limit
    // the bio is genuinely overflowing. Exactly 3 lines fits without truncation
    // and must not become a no-op Pressable. See REVIEW WR-04.
    if (!overflowing && e.nativeEvent.lines.length > BIO_COLLAPSED_LINES) {
      setOverflowing(true);
    }
  }

  function handleToggle() {
    if (!overflowing) return; // non-overflowing bios are not tappable
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          minHeight: 52,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        rowNoDivider: {
          borderBottomWidth: 0,
        },
        labelRow: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        icon: {
          marginRight: SPACING.md,
        },
        label: {
          flex: 1,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        body: {
          marginTop: SPACING.xs,
          marginLeft: FONT_SIZE.xl + SPACING.md, // indent body under the label, not under the icon
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,

          lineHeight: 24, // UI-SPEC §Typography — bio paragraph line height
        },
      }),
    [colors]
  );

  const labelRow = (
    <View style={styles.labelRow}>
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={FONT_SIZE.xl}
        color={colors.text.secondary}
        style={styles.icon}
      />
      <Text style={styles.label}>Bio</Text>
    </View>
  );

  const body = (
    <Text
      style={styles.body}
      numberOfLines={expanded ? undefined : BIO_COLLAPSED_LINES}
      onTextLayout={handleTextLayout}
    >
      {bio}
    </Text>
  );

  const rowStyle = [styles.row, hideDivider && styles.rowNoDivider];

  return overflowing ? (
    <Pressable
      onPress={handleToggle}
      accessibilityRole="button"
      accessibilityLabel={`Bio: ${bio}`}
      accessibilityHint={expanded ? 'Tap to collapse bio' : 'Tap to read full bio'}
      hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
      style={rowStyle}
    >
      {labelRow}
      {body}
    </Pressable>
  ) : (
    <View style={rowStyle} accessibilityRole="text" accessibilityLabel={`Bio: ${bio}`}>
      {labelRow}
      {body}
    </View>
  );
}
