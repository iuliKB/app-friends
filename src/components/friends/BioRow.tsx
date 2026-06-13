// Phase 33 — Bio variant of ProfileInfoRow with expand/collapse.
//
// Renders the bio paragraph below the standard label row; collapses to 3 lines
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
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { getIconPalette, ROW_ICON_SIZE, ROW_ICON_GLYPH_SIZE } from './friendIconPalette';

// Required for LayoutAnimation on Android (no-op on iOS); idempotent on multiple calls.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ROW_MIN_HEIGHT = 56;
const BIO_COLLAPSED_LINES = 3;

interface BioRowProps {
  bio: string; // non-empty string; parent (Plan 06 screen) gates this — null bio → don't render BioRow at all
  isLast?: boolean; // injected by GroupedInsetSection
}

export function BioRow({ bio, isLast }: BioRowProps) {
  const { colors } = useTheme();
  const palette = useMemo(() => getIconPalette('bio', colors), [colors]);
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
          minHeight: ROW_MIN_HEIGHT,
        },
        labelRow: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        iconBubble: {
          width: ROW_ICON_SIZE,
          height: ROW_ICON_SIZE,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.bg,
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
          marginLeft: ROW_ICON_SIZE + SPACING.md, // indent body under the label, not under the icon
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,

          lineHeight: 24, // UI-SPEC §Typography — bio paragraph line height
        },
        hairline: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: SPACING.lg + ROW_ICON_SIZE + SPACING.md,
        },
      }),
    [colors, palette]
  );

  const labelRow = (
    <View style={styles.labelRow}>
      <View style={styles.iconBubble}>
        <Ionicons name={palette.ionicon} size={ROW_ICON_GLYPH_SIZE} color={palette.glyph} />
      </View>
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

  return (
    <View>
      {overflowing ? (
        <Pressable
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={`Bio: ${bio}`}
          accessibilityHint={expanded ? 'Tap to collapse bio' : 'Tap to read full bio'}
          hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
          style={styles.row}
        >
          {labelRow}
          {body}
        </Pressable>
      ) : (
        <View style={styles.row} accessibilityRole="text" accessibilityLabel={`Bio: ${bio}`}>
          {labelRow}
          {body}
        </View>
      )}
      {!isLast && <View style={styles.hairline} />}
    </View>
  );
}
