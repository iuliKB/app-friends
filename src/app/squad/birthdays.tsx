// Phase 7 — BirthdaysScreen (BDAY-02).
// Stack screen at /squad/birthdays — registered by squad/_layout.tsx.
// Renders a FlatList of birthday rows sorted by days_until ASC (RPC order).
// Today rows get accent-tinted background (D-03). Pull-to-refresh supported.
// DO NOT wrap FlatList in a ScrollView — breaks Android scroll silently.

import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { EmptyState } from '@/components/common/EmptyState';
import { useUpcomingBirthdays, type BirthdayEntry } from '@/hooks/useUpcomingBirthdays';
import { formatDaysUntil, formatBirthdayDate, formatTurningAge } from '@/utils/birthdayFormatters';
import { useMemo } from 'react';

export const options = { title: 'Birthdays' };

// eslint-disable-next-line campfire/no-hardcoded-styles
const TODAY_BG = 'rgba(249, 115, 22, 0.12)'; // accent orange at 12% opacity — no theme token for this

export default function BirthdaysScreen() {
  const { colors } = useTheme();
  const { entries, loading, refetch } = useUpcomingBirthdays();

  const styles = useMemo(() => StyleSheet.create({
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
      // eslint-disable-next-line campfire/no-hardcoded-styles
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
  }), [colors]);

  return (
    <View style={styles.container}>
      <FlatList<BirthdayEntry>
        style={styles.list}
        data={entries}
        keyExtractor={(item) => item.friend_id}
        renderItem={({ item }) => <BirthdayRow entry={item} styles={styles} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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

  // Combined label: "Jan 15 · turning 28 · In 3 days" (D-02)
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
