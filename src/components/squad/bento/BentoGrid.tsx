import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SPACING, ANIMATION } from '@/theme';
import { SpotlightTile } from './SpotlightTile';
import { IOUTile } from './IOUTile';
import { GoalsTile } from './GoalsTile';
import { BirthdayTile } from './BirthdayTile';
import { StreakTile } from './StreakTile';
import { selectSpotlight } from '@/hooks/useSpotlight';
import type { IOUSummaryData } from '@/hooks/useIOUSummary';
import type { StreakData } from '@/hooks/useStreakData';
import type { UpcomingBirthdaysData } from '@/hooks/useUpcomingBirthdays';

interface BentoGridProps {
  iou: IOUSummaryData;
  streak: StreakData;
  birthdays: UpcomingBirthdaysData;
}

const ROWS = 3; // spotlight + 2 grid rows

export function BentoGrid({ iou, streak, birthdays }: BentoGridProps) {
  const spotlight = useMemo(
    () => selectSpotlight({ iou, streak, birthdays }),
    [iou, streak, birthdays]
  );
  const spotlightLoading = iou.loading || streak.loading || birthdays.loading;

  const rowAnims = useRef(Array.from({ length: ROWS }, () => new Animated.Value(0))).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    Animated.stagger(
      ANIMATION.duration.staggerDelay,
      rowAnims.map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          isInteraction: false,
        })
      )
    ).start();
  }, [rowAnims]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { gap: SPACING.md },
        row: { flexDirection: 'row', gap: SPACING.md },
      }),
    []
  );

  const animStyle = (i: number) => ({
    opacity: rowAnims[i],
    transform: [
      { translateY: rowAnims[i]!.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
    ],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={animStyle(0)}>
        <SpotlightTile item={spotlight} loading={spotlightLoading} />
      </Animated.View>

      <Animated.View style={[styles.row, animStyle(1)]}>
        <IOUTile summary={iou} />
        <GoalsTile />
      </Animated.View>

      <Animated.View style={[styles.row, animStyle(2)]}>
        <BirthdayTile birthdays={birthdays} />
        <StreakTile streak={streak} />
      </Animated.View>
    </View>
  );
}
