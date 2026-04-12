// Phase 7 — BirthdaysScreen (BDAY-02).
// Stack screen at /squad/birthdays — registered by squad/_layout.tsx.
// Renders a FlatList of birthday rows sorted by days_until ASC (RPC order).
// Today rows get accent-tinted background (D-03). Pull-to-refresh supported.
// DO NOT wrap FlatList in a ScrollView — breaks Android scroll silently.

import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { EmptyState } from '@/components/common/EmptyState';
import { useUpcomingBirthdays, type BirthdayEntry } from '@/hooks/useUpcomingBirthdays';
import { formatDaysUntil, formatBirthdayDate } from '@/utils/birthdayFormatters';

export const options = { title: 'Birthdays' };

// eslint-disable-next-line campfire/no-hardcoded-styles
const TODAY_BG = 'rgba(249, 115, 22, 0.12)'; // accent orange at 12% opacity — no theme token for this

export default function BirthdaysScreen() {
  const { entries, loading, refetch } = useUpcomingBirthdays();

  return (
    <View style={styles.container}>
      <FlatList<BirthdayEntry>
        style={styles.list}
        data={entries}
        keyExtractor={(item) => item.friend_id}
        renderItem={({ item }) => <BirthdayRow entry={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="🎂"
              heading="No birthdays yet"
              body="Ask your friends to add theirs!"
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={COLORS.interactive.accent}
          />
        }
      />
    </View>
  );
}

interface BirthdayRowProps {
  entry: BirthdayEntry;
}

function BirthdayRow({ entry }: BirthdayRowProps) {
  const isToday = entry.days_until === 0;
  const dateLabel = formatBirthdayDate(entry.birthday_month, entry.birthday_day);
  const daysLabel = formatDaysUntil(entry.days_until);

  return (
    <View
      style={[styles.row, isToday && { backgroundColor: TODAY_BG }]}
      testID="birthday-row"
    >
      <AvatarCircle size={40} imageUri={entry.avatar_url} displayName={entry.display_name} />
      <View style={styles.rowMiddle}>
        <Text style={styles.rowName} numberOfLines={1}>
          {entry.display_name}
        </Text>
        <Text style={styles.rowDate}>{dateLabel}</Text>
      </View>
      <Text style={[styles.rowDays, isToday && styles.rowDaysToday]}>{daysLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  list: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minHeight: 64, // matches FriendCard pattern — no token for this exact size
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface.base,
  },
  rowMiddle: {
    flex: 1,
    marginLeft: SPACING.lg,
  },
  rowName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  rowDate: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  rowDays: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  rowDaysToday: {
    color: COLORS.interactive.accent,
  },
});
