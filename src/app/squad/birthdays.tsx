// Phase 7 — BirthdaysScreen (BDAY-02).
// Stack screen at /squad/birthdays — registered by squad/_layout.tsx.
// Renders a calendar header (defaults to a one-week strip, expandable to the
// full month grid) followed by a FlatList of birthday rows sorted by
// days_until ASC (RPC order). Today rows get an accent-tinted background.
// Pull-to-refresh supported.
// DO NOT wrap FlatList in a ScrollView — breaks Android scroll silently.
// The calendar lives in ListHeaderComponent so it scrolls with the list.

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { BirthdayCalendar } from '@/components/birthdays/BirthdayCalendar';
import { useUpcomingBirthdays, type BirthdayEntry } from '@/hooks/useUpcomingBirthdays';
import { formatDaysUntil, formatTurningAge, startOfWeek } from '@/utils/birthdayFormatters';

// Cap the per-row entrance delay so a long list doesn't take forever to settle.
const ENTRANCE_STAGGER_MS = 45;
const ENTRANCE_MAX_STEPS = 8;

const TODAY_BG = 'rgba(249, 115, 22, 0.12)'; // accent orange at 12% opacity — no theme token for this

export default function BirthdaysScreen() {
  const { colors } = useTheme();
  const { entries, loading, refetch } = useUpcomingBirthdays();
  const listRef = useRef<FlatList<BirthdayEntry>>(null);
  const reduceMotion = useReducedMotion();

  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [expanded, setExpanded] = useState(false);

  const goPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 1) {
        setViewYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 12) {
        setViewYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }, []);

  const goPrevWeek = useCallback(() => {
    setWeekStart((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 7);
      return next;
    });
  }, []);

  const goNextWeek = useCallback(() => {
    setWeekStart((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    });
  }, []);

  const toggleExpanded = useCallback(() => setExpanded((e) => !e), []);

  const goToToday = useCallback(() => {
    if (expanded) {
      const now = new Date();
      setViewMonth(now.getMonth() + 1);
      setViewYear(now.getFullYear());
    } else {
      setWeekStart(startOfWeek(new Date()));
    }
  }, [expanded]);

  const handleSelectDay = useCallback(
    (entry: BirthdayEntry) => {
      const idx = entries.findIndex((e) => e.friend_id === entry.friend_id);
      if (idx >= 0) {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.1 });
      }
    },
    [entries]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        list: {
          flex: 1,
        },
        listContent: {
          paddingBottom: SPACING.xl,
        },
        // Each row is its own elevated surface so the Upcoming list reads as a
        // stack of layered cards, matching the floating calendar card above it.
        rowWrapper: {
          marginHorizontal: SPACING.lg,
          marginBottom: SPACING.sm,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',

          minHeight: 64, // matches FriendCard pattern — no token for this exact size
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: colors.border,
          ...colors.cardElevation,
        },
        rowMiddle: {
          flex: 1,
          marginLeft: SPACING.md,
        },
        rowName: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.primary,
        },
        rowSubtitle: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginTop: 2, // eslint-disable-line campfire/no-hardcoded-styles -- tight name/subtitle gap
        },
        rowRight: {
          alignItems: 'center',
          marginLeft: SPACING.md,
        },
        dateBadge: {
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 42,
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
          borderRadius: RADII.md,
          backgroundColor: colors.interactive.accent,
        },
        dateBadgeToday: {
          borderWidth: 2,
          borderColor: colors.text.primary,
        },
        dateBadgeMonth: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.bold,
          color: colors.surface.base,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        dateBadgeDay: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.bold,
          color: colors.surface.base,
          lineHeight: FONT_SIZE.md * 1.15,
        },
        daysUntil: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          marginTop: SPACING.xs,
        },
        daysUntilToday: {
          color: colors.text.primary,
          fontFamily: FONT_FAMILY.body.bold,
        },
        sectionHeader: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.sm,
          backgroundColor: colors.surface.base,
        },
        sectionHeaderText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
          textTransform: 'uppercase',

          letterSpacing: 0.5,
        },
        skeletonMiddle: {
          flex: 1,
          marginLeft: SPACING.md,
        },
        skeletonLineGap: {
          marginTop: SPACING.sm,
        },
        skeletonRight: {
          marginLeft: SPACING.md,
          alignItems: 'center',
        },
        skeletonDaysGap: {
          marginTop: SPACING.xs,
        },
      }),
    [colors]
  );

  const listHeader = (
    <View>
      <BirthdayCalendar
        entries={entries}
        expanded={expanded}
        onToggleExpanded={toggleExpanded}
        viewMonth={viewMonth}
        viewYear={viewYear}
        onPrevMonth={goPrevMonth}
        onNextMonth={goNextMonth}
        weekStart={weekStart}
        onPrevWeek={goPrevWeek}
        onNextWeek={goNextWeek}
        onSelectDay={handleSelectDay}
        onGoToToday={goToToday}
      />
      {entries.length > 0 ? (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Upcoming</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList<BirthdayEntry>
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={entries}
        keyExtractor={(item) => item.friend_id}
        renderItem={({ item, index }) => (
          <BirthdayRow entry={item} index={index} styles={styles} reduceMotion={reduceMotion} />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <BirthdaySkeletonList styles={styles} />
          ) : (
            <EmptyState
              icon="gift-outline"
              iconType="ionicons"
              heading="No birthdays yet"
              body="Ask your friends to add theirs!"
            />
          )
        }
        onScrollToIndexFailed={({ index }) => {
          // List wasn't measured yet — fall back to a small delay and retry.
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 });
          }, 100);
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={colors.interactive.accent}
          />
        }
      />
    </View>
  );
}

interface BirthdayRowStyles {
  rowWrapper: ViewStyle;
  row: ViewStyle;
  rowMiddle: ViewStyle;
  rowName: TextStyle;
  rowSubtitle: TextStyle;
  rowRight: ViewStyle;
  dateBadge: ViewStyle;
  dateBadgeToday: ViewStyle;
  dateBadgeMonth: TextStyle;
  dateBadgeDay: TextStyle;
  daysUntil: TextStyle;
  daysUntilToday: TextStyle;
  skeletonMiddle: ViewStyle;
  skeletonLineGap: ViewStyle;
  skeletonRight: ViewStyle;
  skeletonDaysGap: ViewStyle;
}

interface BirthdayRowProps {
  entry: BirthdayEntry;
  index: number;
  styles: BirthdayRowStyles;
  reduceMotion: boolean;
}

function BirthdayRow({ entry, index, styles, reduceMotion }: BirthdayRowProps) {
  const router = useRouter();
  const isToday = entry.days_until === 0;
  const ageLabel =
    entry.birthday_year !== null
      ? formatTurningAge(entry.birthday_year, entry.birthday_month, entry.birthday_day)
      : null;
  const daysLabel = formatDaysUntil(entry.days_until);

  // Abbreviated month — neutral year-2000 anchor, same convention as formatBirthdayDate.
  const monthAbbrev = new Intl.DateTimeFormat('en-US', { month: 'short' })
    .format(new Date(2000, entry.birthday_month - 1, 1))
    .toUpperCase();

  // Staggered fade/slide-in on mount; skipped entirely under reduce-motion.
  const entering = reduceMotion
    ? undefined
    : FadeInDown.delay(Math.min(index, ENTRANCE_MAX_STEPS) * ENTRANCE_STAGGER_MS)
        .duration(280)
        .springify()
        .damping(18);

  return (
    <Animated.View style={styles.rowWrapper} entering={entering}>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          isToday && { backgroundColor: TODAY_BG },
          pressed && { opacity: 0.75 },
        ]}
        onPress={() =>
          router.push(
            `/squad/birthday/${entry.friend_id}?name=${encodeURIComponent(entry.display_name)}` as never
          )
        }
        testID="birthday-row"
      >
        <AvatarCircle size={44} imageUri={entry.avatar_url} displayName={entry.display_name} />
        <View style={styles.rowMiddle}>
          <Text style={styles.rowName} numberOfLines={1}>
            {entry.display_name}
          </Text>
          {ageLabel ? <Text style={styles.rowSubtitle}>{ageLabel}</Text> : null}
        </View>
        <View style={styles.rowRight}>
          <View style={[styles.dateBadge, isToday && styles.dateBadgeToday]}>
            <Text style={styles.dateBadgeMonth}>{monthAbbrev}</Text>
            <Text style={styles.dateBadgeDay}>{entry.birthday_day}</Text>
          </View>
          <Text style={[styles.daysUntil, isToday && styles.daysUntilToday]}>{daysLabel}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Shimmer placeholder shown while birthdays load — mirrors the row card layout
// so content swaps in without a jarring shift.
function BirthdaySkeletonList({ styles }: { styles: BirthdayRowStyles }) {
  return (
    <View accessibilityLabel="Loading birthdays">
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.rowWrapper}>
          <View style={styles.row}>
            <SkeletonPulse width={44} height={44} />
            <View style={styles.skeletonMiddle}>
              <SkeletonPulse width={140} height={15} />
              <View style={styles.skeletonLineGap}>
                <SkeletonPulse width={90} height={12} />
              </View>
            </View>
            <View style={styles.skeletonRight}>
              <SkeletonPulse width={42} height={40} />
              <View style={styles.skeletonDaysGap}>
                <SkeletonPulse width={36} height={10} />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
