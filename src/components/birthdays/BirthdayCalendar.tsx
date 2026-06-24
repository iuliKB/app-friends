// Compact calendar for /squad/birthdays. Defaults to a one-week strip;
// tapping the chevron expands to the full month grid (and back). Week and
// month navigation are independent — collapsing/expanding doesn't reset
// either's position. Today is a filled dark disc/pill with bold white text;
// birthdays are filled accent discs/pills; today's birthday combines both
// with a dark ring around the accent fill.

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, ANIMATION } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { BirthdayEntry } from '@/hooks/useUpcomingBirthdays';

const SWIPE_THRESHOLD_PX = 50; // px — short, deliberate swipe; lower than FriendSwipeCard's screen-width-relative threshold since this is a compact calendar, not a full-width card

// Required for LayoutAnimation on Android (no-op on iOS); idempotent on multiple calls.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const ROW_HEIGHT = 46;
const PILL_HEIGHT = 68;
// Intentional top-down accent gradient for the calendar card: the next-event-card
// green (interactive.accent) fades from a visible tint at the top to transparent,
// letting the opaque surface.card base show through lower down. No theme token for this.
const CARD_GRADIENT_DARK = ['rgba(185, 255, 59, 0.12)', 'rgba(185, 255, 59, 0)'] as const; // #B9FF3B
const CARD_GRADIENT_LIGHT = ['rgba(77, 124, 0, 0.08)', 'rgba(77, 124, 0, 0)'] as const; // #4D7C00

interface BirthdayCalendarProps {
  entries: BirthdayEntry[];
  expanded: boolean;
  onToggleExpanded: () => void;
  viewMonth: number; // 1-12
  viewYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  weekStart: Date; // Sunday (local midnight) of the displayed week
  onPrevWeek: () => void;
  onNextWeek: () => void;
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

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

function buildWeekCells(weekStart: Date): DayCell[] {
  const today = new Date();
  const cells: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    cells.push({
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      inCurrentMonth: true,
      isToday: isSameDate(d, today),
      entry: undefined,
    });
  }
  return cells;
}

export function BirthdayCalendar({
  entries,
  expanded,
  onToggleExpanded,
  viewMonth,
  viewYear,
  onPrevMonth,
  onNextMonth,
  weekStart,
  onPrevWeek,
  onNextWeek,
  onSelectDay,
  onGoToToday,
}: BirthdayCalendarProps) {
  const { colors, isDark } = useTheme();

  const chevronRotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(chevronRotation, {
      toValue: expanded ? 1 : 0,
      duration: ANIMATION.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [expanded, chevronRotation]);

  const today = useMemo(() => new Date(), []);
  const isCurrentMonth = today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth;
  const isCurrentWeek = useMemo(() => {
    const todayWeekStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - today.getDay()
    );
    return isSameDate(todayWeekStart, weekStart);
  }, [today, weekStart]);

  // Keyed by "month-day" only (no year) — entries repeat every year.
  const entriesByDay = useMemo(() => {
    const map = new Map<string, BirthdayEntry>();
    for (const e of entries) {
      const key = `${e.birthday_month}-${e.birthday_day}`;
      if (!map.has(key)) map.set(key, e);
    }
    return map;
  }, [entries]);

  const monthCells = useMemo(() => {
    const grid = buildMonthMatrix(viewYear, viewMonth);
    return grid.map((c) => ({ ...c, entry: entriesByDay.get(`${c.month}-${c.day}`) }));
  }, [entriesByDay, viewMonth, viewYear]);

  const weekCells = useMemo(() => {
    const cells = buildWeekCells(weekStart);
    return cells.map((c) => ({ ...c, entry: entriesByDay.get(`${c.month}-${c.day}`) }));
  }, [entriesByDay, weekStart]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
        new Date(viewYear, viewMonth - 1, 1)
      ),
    [viewMonth, viewYear]
  );

  // Week-view title shows the actual date range so each week reads distinctly
  // (e.g. "Jun 22 – 28", or "Jun 29 – Jul 5" across a month boundary) — a plain
  // "Month Year" looked identical week to week and made navigation feel like a no-op.
  const weekRangeLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const startMonth = monthFmt.format(weekStart);
    const endMonth = monthFmt.format(end);
    return weekStart.getMonth() === end.getMonth()
      ? `${startMonth} ${weekStart.getDate()} – ${end.getDate()}`
      : `${startMonth} ${weekStart.getDate()} – ${endMonth} ${end.getDate()}`;
  }, [weekStart]);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(
        today
      ),
    [today]
  );

  // Month name + year shown as the card's prominent title (split so the year can
  // carry the brand accent). In week view the main line is the date range.
  const monthName = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
        new Date(viewYear, viewMonth - 1, 1)
      ),
    [viewMonth, viewYear]
  );
  const titleMain = expanded ? monthName : weekRangeLabel;
  const titleYear = String(expanded ? viewYear : weekStart.getFullYear());

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleExpanded();
  };

  const chevronRotate = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-15, 15])
        .onEnd((e) => {
          if (Math.abs(e.translationX) < SWIPE_THRESHOLD_PX) return;
          const goNext = e.translationX < 0; // swipe left = next
          if (expanded) {
            runOnJS(goNext ? onNextMonth : onPrevMonth)();
          } else {
            runOnJS(goNext ? onNextWeek : onPrevWeek)();
          }
        }),
    [expanded, onNextMonth, onPrevMonth, onNextWeek, onPrevWeek]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.lg,
        },
        card: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.xl,
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.md,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden', // clip the accent gradient + top highlight to the rounded corners
          // Deeper, softer drop shadow than the standard card elevation — adds the
          // "lift" the flat version was missing.
          shadowColor: '#000', // eslint-disable-line campfire/no-hardcoded-styles -- shadow color, theme-agnostic
          shadowOpacity: isDark ? 0.45 : 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        },
        // 1px translucent highlight along the very top edge — reads as a light
        // source hitting the card, reinforcing depth (mainly visible in dark mode).
        topHighlight: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.18)', // eslint-disable-line campfire/no-hardcoded-styles -- specular edge highlight, no theme token
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.xs,
          marginBottom: SPACING.md,
        },
        titleBlock: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: SPACING.sm,
        },
        titleMain: {
          fontFamily: FONT_FAMILY.display.bold,
          fontSize: FONT_SIZE.xxl,
          color: colors.text.primary,

          letterSpacing: -0.5,
        },
        titleYear: {
          fontFamily: FONT_FAMILY.display.semibold,
          fontSize: FONT_SIZE.lg,
          color: colors.text.secondary,
        },
        navGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        },
        navButton: {
          width: 34,
          height: 34,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.base,
          borderWidth: 1,
          borderColor: colors.border,
        },
        navButtonPressed: {
          borderColor: colors.interactive.accent,
        },
        todayLink: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          alignSelf: 'center',
          paddingVertical: SPACING.xs,
          paddingHorizontal: SPACING.md,
          borderRadius: RADII.full,
          borderWidth: 1,
          borderColor: colors.interactive.accent,
          marginBottom: SPACING.sm,
        },
        todayLinkPressed: {
          opacity: 0.6,
        },
        todayLinkText: {
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.xs,
          color: colors.interactive.accent,
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
          fontSize: FONT_SIZE.sm,
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
          width: 38,
          height: 38,
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
        // Accent glow behind today's cell — the focal point of the grid.
        cellTodayGlow: {
          shadowColor: colors.interactive.accent,
          shadowOpacity: 0.7,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        },
        // Ringed mini-avatar shown in cells that have a birthday.
        avatarRing: {
          borderRadius: RADII.full,
          borderWidth: 2,
          borderColor: colors.interactive.accent,
          overflow: 'hidden',
        },
        avatarRingToday: {
          borderColor: colors.text.primary,
        },
        dayText: {
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.lg,
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
        weekStrip: {
          flexDirection: 'row',
        },
        pillWrapper: {
          flex: 1,
          marginHorizontal: 3, // eslint-disable-line campfire/no-hardcoded-styles
        },
        dayPill: {
          height: PILL_HEIGHT,
          borderRadius: RADII.lg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4, // eslint-disable-line campfire/no-hardcoded-styles
        },
        pillWeekday: {
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.sm,
          color: colors.text.secondary,
          textTransform: 'uppercase',

          letterSpacing: 0.4,
        },
        pillDayNumber: {
          fontFamily: FONT_FAMILY.display.bold,
          fontSize: FONT_SIZE.xxl,
          color: colors.text.primary,
        },
        toggleRow: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: SPACING.sm,
        },
        toggleRowPressed: {
          opacity: 0.6,
        },
      }),
    [colors, isDark]
  );

  const renderMonthCell = (c: DayCell, idx: number) => {
    const hasBirthday = !!c.entry;
    const interactive = hasBirthday && !!onSelectDay;
    const isTodayOnly = c.isToday && !hasBirthday;
    const isTodayBirthday = c.isToday && hasBirthday;

    const inner = hasBirthday ? (
      <View style={c.isToday ? styles.cellTodayGlow : undefined}>
        <View style={[styles.avatarRing, isTodayBirthday && styles.avatarRingToday]}>
          <AvatarCircle
            size={34}
            imageUri={c.entry!.avatar_url}
            displayName={c.entry!.display_name}
          />
        </View>
      </View>
    ) : (
      <View
        style={[
          styles.cellInner,
          isTodayOnly && styles.cellToday,
          isTodayOnly && styles.cellTodayGlow,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            !c.inCurrentMonth && styles.dayTextMuted,
            isTodayOnly && styles.dayTextOnDark,
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
  };

  const renderWeekPill = (c: DayCell, idx: number) => {
    const hasBirthday = !!c.entry;
    const interactive = hasBirthday && !!onSelectDay;
    const isTodayOnly = c.isToday && !hasBirthday;
    const isTodayBirthday = c.isToday && hasBirthday;
    const weekdayAbbrev = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
      new Date(c.year, c.month - 1, c.day)
    );

    const inner = (
      <View
        style={[
          styles.dayPill,
          isTodayOnly && styles.cellToday,
          isTodayOnly && styles.cellTodayGlow,
        ]}
      >
        <Text style={[styles.pillWeekday, isTodayOnly && styles.dayTextOnDark]}>
          {weekdayAbbrev}
        </Text>
        {hasBirthday ? (
          <View style={c.isToday ? styles.cellTodayGlow : undefined}>
            <View style={[styles.avatarRing, isTodayBirthday && styles.avatarRingToday]}>
              <AvatarCircle
                size={38}
                imageUri={c.entry!.avatar_url}
                displayName={c.entry!.display_name}
              />
            </View>
          </View>
        ) : (
          <Text style={[styles.pillDayNumber, isTodayOnly && styles.dayTextOnDark]}>{c.day}</Text>
        )}
      </View>
    );

    if (interactive) {
      return (
        <Pressable
          key={`${c.year}-${c.month}-${c.day}-${idx}`}
          style={({ pressed }) => [styles.pillWrapper, pressed && styles.cellPressed]}
          onPress={() => onSelectDay!(c.entry!)}
          accessibilityRole="button"
          accessibilityLabel={`${c.entry!.display_name}'s birthday on ${weekdayAbbrev} ${c.day}`}
        >
          {inner}
        </Pressable>
      );
    }

    return (
      <View key={`${c.year}-${c.month}-${c.day}-${idx}`} style={styles.pillWrapper}>
        {inner}
      </View>
    );
  };

  const showTodayPill = (expanded ? !isCurrentMonth : !isCurrentWeek) && !!onGoToToday;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <LinearGradient
          colors={isDark ? CARD_GRADIENT_DARK : CARD_GRADIENT_LIGHT}
          locations={[0, 0.75]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {isDark ? <View style={styles.topHighlight} pointerEvents="none" /> : null}

        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.titleMain} numberOfLines={1}>
              {titleMain}
            </Text>
            <Text style={styles.titleYear}>{titleYear}</Text>
          </View>
          <View style={styles.navGroup}>
            <Pressable
              style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
              onPress={expanded ? onPrevMonth : onPrevWeek}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Previous month' : 'Previous week'}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text.primary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}
              onPress={expanded ? onNextMonth : onNextWeek}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Next month' : 'Next week'}
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text.primary} />
            </Pressable>
          </View>
        </View>

        {showTodayPill ? (
          <Pressable
            style={({ pressed }) => [styles.todayLink, pressed && styles.todayLinkPressed]}
            onPress={onGoToToday}
            accessibilityRole="button"
            accessibilityLabel={`Jump to today, ${todayLabel}`}
            hitSlop={6}
          >
            <Ionicons name="arrow-back" size={12} color={colors.interactive.accent} />
            <Text style={styles.todayLinkText}>Back to today</Text>
          </Pressable>
        ) : null}

        <GestureDetector gesture={swipeGesture}>
          <View>
            {expanded ? (
              <>
                <View style={styles.weekRow}>
                  {WEEKDAYS.map((w, i) => (
                    <View key={`${w}-${i}`} style={styles.weekCell}>
                      <Text style={styles.weekLabel}>{w}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.grid}>
                  {monthCells.map((c, idx) => renderMonthCell(c, idx))}
                </View>
              </>
            ) : (
              <View style={styles.weekStrip}>
                {weekCells.map((c, idx) => renderWeekPill(c, idx))}
              </View>
            )}
          </View>
        </GestureDetector>

        <Pressable
          style={({ pressed }) => [styles.toggleRow, pressed && styles.toggleRowPressed]}
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show this week only' : 'Show full month'}
          hitSlop={8}
        >
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}
