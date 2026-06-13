// Phase 33 — Grouped-inset section wrapper (D-03).
//
// Renders a small-caps section title ("INFO", "MUTUAL", "WISH LIST") followed by
// a rounded surface.card rectangle containing children rows. Hairline separator
// is added between rows automatically and SUPPRESSED on the last row via
// React.Children iteration → each child receives an injected `isLast` prop.
//
// Implements UI-SPEC §Layout Skeleton lines 65-77 + §Typography line 117 (title
// small-caps with letterSpacing 0.5 — required eslint-disable per existing
// repo convention at ChatListScreen.tsx:213).

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';

interface GroupedInsetSectionProps {
  title: string;
  children: React.ReactNode;
  // Optional `style` override for outer container margins (Plan 06 may need to tune the gap above the first section)
  style?: { marginTop?: number };
}

export function GroupedInsetSection({ title, children, style }: GroupedInsetSectionProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          marginTop: SPACING.xl,
        },
        sectionTitle: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.xs,

          textTransform: 'uppercase',

          letterSpacing: 0.5, // UI-SPEC §Typography line 117 — small-caps spec
        },
        card: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          overflow: 'hidden',
          marginHorizontal: SPACING.lg,
        },
      }),
    [colors]
  );

  // Inject isLast on the final child so it suppresses its own bottom separator.
  const childArray = React.Children.toArray(children);
  const total = childArray.length;
  const decorated = childArray.map((child, idx) => {
    if (!React.isValidElement(child)) return child;
    return React.cloneElement(child as React.ReactElement<{ isLast?: boolean }>, {
      isLast: idx === total - 1,
    });
  });

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{decorated}</View>
    </View>
  );
}
