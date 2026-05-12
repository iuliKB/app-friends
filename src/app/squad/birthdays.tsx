// Phase 7 — BirthdaysScreen (BDAY-02).
// Stack screen at /squad/birthdays — registered by squad/_layout.tsx.
// Renders a calendar header (month grid with birthday markers) followed by a
// FlatList of birthday rows sorted by days_until ASC (RPC order). Today rows
// get an accent-tinted background. Pull-to-refresh supported.
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
import { useRouter } from 'expo-router';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { EmptyState } from '@/components/common/EmptyState';
import { BirthdayCalendar } from '@/components/birthdays/BirthdayCalendar';
import { useUpcomingBirthdays, type BirthdayEntry } from '@/hooks/useUpcomingBirthdays';
import { formatDaysUntil, formatBirthdayDate, formatTurningAge } from '@/utils/birthdayFormatters';

const TODAY_BG = 'rgba(249, 115, 22, 0.12)'; // accent orange at 12% opacity — no theme token for this

export default function BirthdaysScreen() {
  const { colors } = useTheme();
  const { entries, loading, refetch } = useUpcomingBirthdays();
  const listRef = useRef<FlatList<BirthdayEntry>>(null);

  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());

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

  const goToToday = useCallback(() => {
    const now = new Date();
    setViewMonth(now.getMonth() + 1);
    setViewYear(now.getFullYear());
  }, []);

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
        separator: {
          height: 1,
          backgroundColor: colors.border,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',

          minHeight: 64, // matches FriendCard pattern — no token for this exact size
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          backgroundColor: colors.surface.base,
        },
        rowMiddle: {
          flex: 1,
          marginLeft: SPACING.lg,
        },
        rowName: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        rowDate: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginTop: SPACING.xs,
        },
        rowDays: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        rowDaysToday: {
          color: colors.interactive.accent,
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
      }),
    [colors]
  );

  const listHeader = (
    <View>
      <BirthdayCalendar
        entries={entries}
        viewMonth={viewMonth}
        viewYear={viewYear}
        onPrevMonth={goPrevMonth}
        onNextMonth={goNextMonth}
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
        data={entries}
        keyExtractor={(item) => item.friend_id}
        renderItem={({ item }) => <BirthdayRow entry={item} styles={styles} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? null : (
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
  row: ViewStyle;
  rowMiddle: ViewStyle;
  rowName: TextStyle;
  rowDate: TextStyle;
  rowDays: TextStyle;
  rowDaysToday: TextStyle;
}

interface BirthdayRowProps {
  entry: BirthdayEntry;
  styles: BirthdayRowStyles;
}

function BirthdayRow({ entry, styles }: BirthdayRowProps) {
  const router = useRouter();
  const isToday = entry.days_until === 0;
  const dateLabel = formatBirthdayDate(entry.birthday_month, entry.birthday_day);
  const ageLabel =
    entry.birthday_year !== null
      ? formatTurningAge(entry.birthday_year, entry.birthday_month, entry.birthday_day)
      : null;
  const daysLabel = formatDaysUntil(entry.days_until);

  const combinedLabel = [dateLabel, ageLabel, daysLabel].filter(Boolean).join(' · ');

  return (
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
      <AvatarCircle size={40} imageUri={entry.avatar_url} displayName={entry.display_name} />
      <View style={styles.rowMiddle}>
        <Text style={styles.rowName} numberOfLines={1}>
          {entry.display_name}
        </Text>
        <Text style={styles.rowDate}>{combinedLabel}</Text>
      </View>
      <Text style={[styles.rowDays, isToday && styles.rowDaysToday]}>{daysLabel}</Text>
    </Pressable>
  );
}
