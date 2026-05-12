// Compact month-grid calendar for /squad/birthdays. Renders the visible month
// as a 5- or 6-row grid (dynamic, depending on the month's start weekday and
// length). Today is a filled dark disc with bold white text; birthdays are
// filled accent discs; today's birthday combines both with a dark ring around
// the accent disc. Header + "Today" jump pill live in a single row.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import type { BirthdayEntry } from '@/hooks/useUpcomingBirthdays';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const ROW_HEIGHT = 40;

interface BirthdayCalendarProps {
  entries: BirthdayEntry[];
  viewMonth: number; // 1-12
  viewYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay?: (entry: BirthdayEntry) => void;
  onGoToToday?: () => void;
}

interface DayCell {
  day: number;
  month: number;
  year: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  entry: BirthdayEntry | undefined;
}

function buildMonthMatrix(year: number, month1: number): DayCell[] {
  const month = month1 - 1;
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: DayCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, 1);
    cells.push({
      day: d,
      month: prevMonthDate.getMonth() + 1,
      year: prevMonthDate.getFullYear(),
      inCurrentMonth: false,
      isToday: false,
      entry: undefined,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      month: month1,
      year,
      inCurrentMonth: true,
      isToday: year === todayY && month === todayM && d === todayD,
      entry: undefined,
    });
  }

  // Fill only enough trailing days to complete the last week — saves a row
  // when the month fits in 5 weeks.
  const rows = Math.ceil(cells.length / 7);
  const trailingCount = rows * 7 - cells.length;
  for (let i = 1; i <= trailingCount; i++) {
    const nextMonthDate = new Date(year, month + 1, 1);
    cells.push({
      day: i,
      month: nextMonthDate.getMonth() + 1,
      year: nextMonthDate.getFullYear(),
      inCurrentMonth: false,
      isToday: false,
      entry: undefined,
    });
  }

  return cells;
}

export function BirthdayCalendar({
  entries,
  viewMonth,
  viewYear,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  onGoToToday,
}: BirthdayCalendarProps) {
  const { colors } = useTheme();

  const today = useMemo(() => new Date(), []);
  const isCurrentMonth = today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth;

  const entriesByDay = useMemo(() => {
    const map = new Map<string, BirthdayEntry>();
    for (const e of entries) {
      if (e.birthday_month !== viewMonth) continue;
      const key = `${e.birthday_month}-${e.birthday_day}`;
      if (!map.has(key)) map.set(key, e);
    }
    return map;
  }, [entries, viewMonth]);

  const cells = useMemo(() => {
    const grid = buildMonthMatrix(viewYear, viewMonth);
    return grid.map((c) => ({
      ...c,
      entry: c.inCurrentMonth ? entriesByDay.get(`${c.month}-${c.day}`) : undefined,
    }));
  }, [entriesByDay, viewMonth, viewYear]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
        new Date(viewYear, viewMonth - 1, 1)
      ),
    [viewMonth, viewYear]
  );

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(
        today
      ),
    [today]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.lg,
          backgroundColor: colors.surface.base,
        },
        card: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.md,
          borderWidth: 1,
          borderColor: colors.border,
          ...colors.cardElevation,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING.xs,
          marginBottom: SPACING.sm,
        },
        monthTitle: {
          fontFamily: FONT_FAMILY.display.bold,
          fontSize: FONT_SIZE.lg,
          color: colors.text.primary,

          letterSpacing: -0.3,
        },
        headerRight: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
        },
        navButton: {
          width: 30,
          height: 30,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
        },
        navButtonPressed: {
          backgroundColor: colors.surface.base,
        },
        jumpPill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4, // eslint-disable-line campfire/no-hardcoded-styles
          paddingHorizontal: SPACING.sm,
          paddingVertical: 4, // eslint-disable-line campfire/no-hardcoded-styles
          borderRadius: RADII.full,
          backgroundColor: colors.interactive.accent,
          marginRight: SPACING.xs,
        },
        jumpPillPressed: {
          opacity: 0.85,
        },
        jumpPillText: {
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.xs,
          color: colors.surface.card,
          textTransform: 'uppercase',

          letterSpacing: 0.5,
        },
        weekRow: {
          flexDirection: 'row',
          marginBottom: 4, // eslint-disable-line campfire/no-hardcoded-styles
        },
        weekCell: {
          flex: 1,
          alignItems: 'center',
        },
        weekLabel: {
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.xs,
          color: colors.text.secondary,
          textTransform: 'uppercase',

          letterSpacing: 0.6,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        cell: {
          width: `${100 / 7}%`,
          height: ROW_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        },
        cellInner: {
          width: 32,
          height: 32,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
        },
        cellToday: {
          backgroundColor: colors.text.primary,
        },
        cellBirthday: {
          backgroundColor: colors.interactive.accent,
        },
        cellTodayBirthday: {
          backgroundColor: colors.interactive.accent,
          borderWidth: 2,
          borderColor: colors.text.primary,
        },
        dayText: {
          fontFamily: FONT_FAMILY.body.medium,
          fontSize: FONT_SIZE.sm,
          color: colors.text.primary,
        },
        dayTextMuted: {
          color: colors.text.secondary,
          opacity: 0.35,
        },
        dayTextOnDark: {
          color: colors.surface.card,
          fontFamily: FONT_FAMILY.body.bold,
        },
        cellPressed: {
          opacity: 0.7,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <View style={styles.headerRight}>
            {!isCurrentMonth && onGoToToday ? (
              <Pressable
                style={({ pressed }) => [styles.jumpPill, pressed && styles.jumpPillPressed]}
                onPress={onGoToToday}
                accessibilityRole="button"
                accessibilityLabel={`Jump to today, ${todayLabel}`}
                hitSlop={6}
              >
                <Ionicons name="locate-outline" size={11} color={colors.surface.card} />
                <Text style={styles.jumpPillText}>Today</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
              onPress={onPrevMonth}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text.primary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
              onPress={onNextMonth}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <View key={`${w}-${i}`} style={styles.weekCell}>
              <Text style={styles.weekLabel}>{w}</Text>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((c, idx) => {
            const hasBirthday = !!c.entry;
            const interactive = hasBirthday && !!onSelectDay;
            const isTodayOnly = c.isToday && !hasBirthday;
            const isTodayBirthday = c.isToday && hasBirthday;
            const isBirthdayOnly = hasBirthday && !c.isToday;
            const useLightText = isTodayOnly || isBirthdayOnly || isTodayBirthday;

            const inner = (
              <View
                style={[
                  styles.cellInner,
                  isTodayOnly && styles.cellToday,
                  isBirthdayOnly && styles.cellBirthday,
                  isTodayBirthday && styles.cellTodayBirthday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !c.inCurrentMonth && styles.dayTextMuted,
                    useLightText && styles.dayTextOnDark,
                  ]}
                >
                  {c.day}
                </Text>
              </View>
            );

            if (interactive) {
              return (
                <Pressable
                  key={`${c.year}-${c.month}-${c.day}-${idx}`}
                  style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
                  onPress={() => onSelectDay!(c.entry!)}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.entry!.display_name}'s birthday on ${monthLabel.split(' ')[0]} ${c.day}`}
                >
                  {inner}
                </Pressable>
              );
            }

            return (
              <View key={`${c.year}-${c.month}-${c.day}-${idx}`} style={styles.cell}>
                {inner}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
