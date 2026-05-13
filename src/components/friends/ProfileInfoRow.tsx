// Phase 33 — Single grouped-inset row (D-06 / REQ-FP-07 surface).
//
// Renders a 32pt tinted leading icon + label + optional right-aligned value
// + optional chevron. Tappable when `onPress` is provided; press flashes
// colors.surface.overlay per UI-SPEC §Grouped-Inset Row Tap (lines 393-399).
//
// Hairline separator at the bottom is suppressed when `isLast` is true
// (GroupedInsetSection injects this for the final child).

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { getIconPalette, ROW_ICON_SIZE, ROW_ICON_GLYPH_SIZE, type IconTint } from './friendIconPalette';

interface ProfileInfoRowProps {
  iconTint: IconTint;
  label: string;
  value?: string | React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  isLast?: boolean; // injected by GroupedInsetSection; suppresses bottom hairline when true
}

// Row min-height per UI-SPEC §Spacing Scale §Exceptions — not a SPACING token.
const ROW_MIN_HEIGHT = 56;
// Chevron glyph size per UI-SPEC §Pre-delivery checklist (consistent 16pt).
const CHEVRON_SIZE = 16;

export function ProfileInfoRow({
  iconTint,
  label,
  value,
  onPress,
  chevron,
  accessibilityLabel,
  accessibilityHint,
  isLast,
}: ProfileInfoRowProps) {
  const { colors } = useTheme();
  const palette = useMemo(() => getIconPalette(iconTint, colors), [iconTint, colors]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          minHeight: ROW_MIN_HEIGHT,
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
        value: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'right',
          marginLeft: SPACING.md,
          maxWidth: '50%',
        },
        chevronStyle: {
          marginLeft: SPACING.sm,
        },
        hairline: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          // Align separator under the label, not under the icon (per UI-SPEC §Color §Border)
          marginLeft: SPACING.lg + ROW_ICON_SIZE + SPACING.md,
        },
      }),
    [colors, palette],
  );

  const rowContent = (
    <View style={styles.row}>
      <View style={styles.iconBubble}>
        <Ionicons name={palette.ionicon} size={ROW_ICON_GLYPH_SIZE} color={palette.glyph} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {value !== undefined &&
        (typeof value === 'string' ? (
          <Text style={styles.value} numberOfLines={1}>
            {value}
          </Text>
        ) : (
          <View style={styles.chevronStyle}>{value}</View>
        ))}
      {chevron && (
        <Ionicons
          name="chevron-forward"
          size={CHEVRON_SIZE}
          color={colors.text.secondary}
          style={styles.chevronStyle}
        />
      )}
    </View>
  );

  return (
    <View>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
          style={({ pressed }) =>
            pressed ? { backgroundColor: colors.surface.overlay } : undefined
          }
        >
          {rowContent}
        </Pressable>
      ) : (
        <View accessibilityRole="text" accessibilityLabel={accessibilityLabel}>
          {rowContent}
        </View>
      )}
      {!isLast && <View style={styles.hairline} />}
    </View>
  );
}
