import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { formatCentsDisplay } from '@/utils/currencyFormat';
import { formatDaysUntil } from '@/utils/birthdayFormatters';
import type { IOUSummaryData } from '@/hooks/useIOUSummary';
import type { UpcomingBirthdaysData } from '@/hooks/useUpcomingBirthdays';

interface HomeWidgetRowProps {
  iouSummary: IOUSummaryData;
  birthdays: UpcomingBirthdaysData;
}

export function HomeWidgetRow({ iouSummary, birthdays }: HomeWidgetRowProps) {
  const { colors } = useTheme();

  const shadow = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
    default: {},
  });

  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: SPACING.md,
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.xl,
    },
    tile: {
      flex: 1,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      maxWidth: 140,
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      padding: SPACING.md,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      aspectRatio: 1,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow,
    },
    tilePressed: {
      opacity: 0.75,
    },
    tileTitle: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
      textTransform: 'uppercase',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      letterSpacing: 0.5,
    },
    icon: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      fontSize: 22,
      marginTop: SPACING.xs,
    },
    main: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      marginTop: SPACING.xs,
    },
    sub: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: 2,
    },
  }), [colors, shadow]);

  const router = useRouter();

  const hasIOU = iouSummary.unsettledCount > 0;
  const iouAmount = formatCentsDisplay(Math.abs(iouSummary.netCents));
  const iouMain = iouSummary.loading ? '—' : hasIOU ? iouAmount : 'All clear';
  const iouSub = iouSummary.loading
    ? ''
    : hasIOU
      ? iouSummary.netCents >= 0 ? "you're owed" : 'you owe'
      : 'all settled up';

  const nearest = birthdays.entries[0] ?? null;
  const birthdayMain = birthdays.loading
    ? '—'
    : nearest
      ? nearest.display_name.split(' ')[0] ?? nearest.display_name
      : 'None soon';
  const birthdaySub = birthdays.loading
    ? ''
    : nearest
      ? formatDaysUntil(nearest.days_until)
      : 'no upcoming';

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        onPress={() => router.push('/squad/expenses' as never)}
        accessibilityRole="button"
        accessibilityLabel={`IOUs: ${iouMain}, ${iouSub}`}
      >
        <Text style={styles.tileTitle}>IOUs</Text>
        <Text style={styles.icon}>💸</Text>
        <Text style={styles.main} numberOfLines={1}>{iouMain}</Text>
        {iouSub ? <Text style={styles.sub} numberOfLines={1}>{iouSub}</Text> : null}
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        onPress={() => router.push('/squad/birthdays' as never)}
        accessibilityRole="button"
        accessibilityLabel={`Birthdays: ${birthdayMain}, ${birthdaySub}`}
      >
        <Text style={styles.tileTitle}>Birthdays</Text>
        <Text style={styles.icon}>🎂</Text>
        <Text style={styles.main} numberOfLines={1}>{birthdayMain}</Text>
        {birthdaySub ? <Text style={styles.sub} numberOfLines={1}>{birthdaySub}</Text> : null}
      </Pressable>
    </View>
  );
}
