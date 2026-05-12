import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SPACING, ANIMATION } from '@/theme';
import { SpotlightTile } from './SpotlightTile';
import { IOUTile } from './IOUTile';
import { GoalsTile } from './GoalsTile';
import { BirthdayTile } from './BirthdayTile';
import { StreakTile } from './StreakTile';
import { HabitsTile } from './HabitsTile';
import { TodosTile } from './TodosTile';
import { selectSpotlight } from '@/hooks/useSpotlight';
import type { IOUSummaryData } from '@/hooks/useIOUSummary';
import type { StreakData } from '@/hooks/useStreakData';
import type { UpcomingBirthdaysData } from '@/hooks/useUpcomingBirthdays';
import type { UseHabitsResult } from '@/hooks/useHabits';
import type { UseTodosResult } from '@/hooks/useTodos';

interface BentoGridProps {
  iou: IOUSummaryData;
  streak: StreakData;
  birthdays: UpcomingBirthdaysData;
  habits: UseHabitsResult;
  todos: UseTodosResult;
}

const ROWS = 4; // spotlight + 3 grid rows (Pitfall 6 — Phase 29.1 6-tile grid)

export function BentoGrid({ iou, streak, birthdays, habits, todos }: BentoGridProps) {
  const spotlight = useMemo(
    () => selectSpotlight({ iou, streak, birthdays, habits, todos }),
    [iou, streak, birthdays, habits, todos]
  );
  const spotlightLoading =
    iou.loading || streak.loading || birthdays.loading || habits.loading || todos.loading;

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
        <HabitsTile habits={habits} />
      </Animated.View>

      <Animated.View style={[styles.row, animStyle(2)]}>
        <BirthdayTile birthdays={birthdays} />
        <TodosTile todos={todos} />
      </Animated.View>

      <Animated.View style={[styles.row, animStyle(3)]}>
        <StreakTile streak={streak} />
        <GoalsTile />
      </Animated.View>
    </View>
  );
}
