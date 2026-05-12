/**
 * HomeHabitsTile — Phase 29.1 Plan 08.
 *
 * Home-screen Habits widget. Uses the Phase 29 neon-green Home aesthetic
 * (TileShell + EyebrowPill from HomeTilePrimitives) — NOT the cyan/violet
 * Bento aesthetic from src/components/squad/bento (Pitfall 7).
 *
 * Layout (UI-SPEC §Home widgets):
 *   - Eyebrow pill "HABITS" + checkmark-done-outline icon
 *   - Hero "{done}/{total}" (display.semibold)
 *     - numerator accent when done > 0, primary when 0 of N, secondary muted when 0/0
 *   - Caption "done today" / "tap to start" / "add a habit"
 *   - Tap card body → /squad/habits (D-19 detail-intent, W11)
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, FONT_FAMILY, FONT_SIZE } from '@/theme';
import { TileShell, EyebrowPill } from './HomeTilePrimitives';
import type { UseHabitsResult } from '@/hooks/useHabits';

interface HomeHabitsTileProps {
  habits: UseHabitsResult;
}

export function HomeHabitsTile({ habits }: HomeHabitsTileProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const doneCount = habits.habits.filter((h) => h.did_me_check_in_today).length;
  const totalCount = habits.habits.length;
  const isEmpty = totalCount === 0;
  // Hero numerator color (UI-SPEC §Home widgets):
  //   - accent when done > 0
  //   - text.primary when 0 of N (Y > 0)
  //   - text.secondary muted when 0/0
  const numeratorColor =
    doneCount > 0
      ? colors.interactive.accent
      : isEmpty
        ? colors.text.secondary
        : colors.text.primary;

  // Caption (UI-SPEC §Home widgets):
  //   - "add a habit" when totalCount === 0
  //   - "done today" when totalCount > 0
  const caption = isEmpty ? 'add a habit' : 'done today';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          flex: 1,
          justifyContent: 'flex-end',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          gap: 4,
        },
        heroRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
        },
        numerator: {
          fontSize: FONT_SIZE.display,
          fontFamily: FONT_FAMILY.display.semibold,
          letterSpacing: -0.5,
        },
        denominator: {
          fontSize: FONT_SIZE.display,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
          letterSpacing: -0.5,
        },
        caption: {
          fontFamily: FONT_FAMILY.body.regular,
          fontSize: FONT_SIZE.xs,
          color: colors.text.secondary,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: 2,
        },
      }),
    [colors]
  );

  const a11yLabel = isEmpty
    ? 'Habits. No habits yet. Tap to add a habit.'
    : `Habits. ${doneCount} of ${totalCount} done today. Tap to open.`;

  return (
    <TileShell
      eyebrow={<EyebrowPill icon="checkmark-done-outline" label="HABITS" />}
      hot={doneCount > 0 && doneCount === totalCount}
      onPress={() => router.push('/squad/habits' as never)}
      a11yLabel={a11yLabel}
    >
      <View style={styles.body}>
        <View style={styles.heroRow}>
          <Text style={[styles.numerator, { color: numeratorColor }]}>{doneCount}</Text>
          <Text style={styles.denominator}>/{totalCount}</Text>
        </View>
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      </View>
      {/*
        Inline check rows (UI-SPEC §Home widgets) — deliberately deferred to a
        follow-up polish pass. The Phase 29.1 hard requirement is the eyebrow +
        hero + caption + navigate-to-detail behavior (D-19, W11). Inline check
        rows on a 170pt-tall tile would consume the entire body and crowd the
        hero metric; once the cyan-violet Bento HabitsTile gets the same
        treatment we can revisit a denser variant here. The tile remains
        tappable to /squad/habits where users get full inline check-in UX.
      */}
    </TileShell>
  );
}
