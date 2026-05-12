// HabitsProgressHero — circular today-progress tracker for /squad/habits.
// Replaces the in-screen "Habits" title (the native stack header already
// provides one) with a focal progress ring showing "done today / total".
//
// Uses the cyan habits accent (TILE_ACCENTS.habits) so the screen stays
// chromatically consistent with the Activity bento HabitsTile and the
// HomeHabitsTile numerator color.

import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';
import { TILE_ACCENTS } from '@/components/squad/bento/tileAccents';

const SIZE = 152;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HabitsProgressHeroProps {
  doneToday: number;
  totalToday: number;
}

export function HabitsProgressHero({ doneToday, totalToday }: HabitsProgressHeroProps) {
  const { colors } = useTheme();
  const safeTotal = Math.max(0, totalToday);
  const safeDone = Math.max(0, Math.min(doneToday, safeTotal));
  const ratio = safeTotal === 0 ? 0 : safeDone / safeTotal;
  const allDone = safeTotal > 0 && safeDone === safeTotal;

  const reducedMotionRef = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (cancelled) return;
        reducedMotionRef.current = enabled;
        if (enabled) {
          progress.setValue(ratio);
        } else {
          Animated.timing(progress, {
            toValue: ratio,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
      })
      .catch(() => {
        Animated.timing(progress, {
          toValue: ratio,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [ratio, progress]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const caption = useMemo(() => {
    if (safeTotal === 0) return 'No habits yet';
    if (allDone) return safeTotal === 1 ? 'Done for today' : 'All done today';
    const remaining = safeTotal - safeDone;
    return `${remaining} to go today`;
  }, [safeTotal, safeDone, allDone]);

  const ringColor = allDone ? colors.interactive.accent : TILE_ACCENTS.habits;
  const numeratorColor =
    safeTotal === 0 ? colors.text.secondary : safeDone > 0 ? ringColor : colors.text.primary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          alignItems: 'center',
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.xl,
        },
        ringWrap: {
          width: SIZE,
          height: SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        },
        centerStack: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
        },
        valueRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
        },
        numerator: {
          fontSize: FONT_SIZE.hero,
          fontFamily: FONT_FAMILY.display.semibold,
          letterSpacing: -1,
          color: numeratorColor,

          lineHeight: 48,
        },
        denominator: {
          fontSize: FONT_SIZE.xl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginLeft: 2,
        },
        caption: {
          marginTop: SPACING.md,
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        },
      }),
    [colors, numeratorColor]
  );

  const a11yLabel =
    safeTotal === 0 ? 'No habits yet' : `${safeDone} of ${safeTotal} habits done today`;

  return (
    <View
      style={styles.wrapper}
      accessibilityRole="progressbar"
      accessibilityLabel={a11yLabel}
      accessibilityValue={{ min: 0, max: safeTotal || 1, now: safeDone }}
    >
      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.surface.overlay}
            strokeWidth={STROKE}
            fill="transparent"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.centerStack} pointerEvents="none">
          <View style={styles.valueRow}>
            <Text style={styles.numerator}>{safeDone}</Text>
            <Text style={styles.denominator}>/{safeTotal}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}
