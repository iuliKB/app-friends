/**
 * HomeHabitsTodosRow — Phase 29.1 Plan 08.
 *
 * Wrapper that renders the Habits + To-Dos home widgets side-by-side below
 * YourZoneSection on the Home screen. Matches the topRow flexbox from
 * YourZoneSection.tsx (paddingHorizontal SPACING.lg, gap SPACING.md,
 * height 170pt) so the new row aligns visually with the existing
 * Birthdays/IOUs pair above it.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SPACING } from '@/theme';
import { HomeHabitsTile } from './HomeHabitsTile';
import { HomeTodosTile } from './HomeTodosTile';
import type { UseHabitsResult } from '@/hooks/useHabits';
import type { UseTodosResult } from '@/hooks/useTodos';

const ROW_HEIGHT = 170;

interface HomeHabitsTodosRowProps {
  habits: UseHabitsResult;
  todos: UseTodosResult;
}

export function HomeHabitsTodosRow({ habits, todos }: HomeHabitsTodosRowProps) {
  return (
    <View style={styles.row}>
      <HomeHabitsTile habits={habits} />
      <HomeTodosTile todos={todos} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    height: ROW_HEIGHT,
    marginTop: SPACING.md,
  },
});
