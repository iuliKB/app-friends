import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { formatCentsDisplay } from '@/utils/currencyFormat';
import { formatDaysUntil } from '@/utils/birthdayFormatters';
import type { IOUSummaryData } from '@/hooks/useIOUSummary';
import type { UpcomingBirthdaysData } from '@/hooks/useUpcomingBirthdays';

interface HomeWidgetBannersProps {
  iouSummary: IOUSummaryData;
  birthdays: UpcomingBirthdaysData;
}

export function HomeWidgetBanners({ iouSummary, birthdays }: HomeWidgetBannersProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.xl,
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      overflow: 'hidden',
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      gap: SPACING.md,
      height: 52,
    },
    bannerBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    bannerPressed: {
      backgroundColor: colors.surface.base,
    },
    icon: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      fontSize: 20,
    },
    label: {
      flex: 1,
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
  }), [colors]);

  const router = useRouter();

  const nearest = birthdays.entries[0] ?? null;
  const birthdayLabel = birthdays.loading
    ? 'Loading...'
    : nearest
      ? `${nearest.display_name}'s birthday · ${formatDaysUntil(nearest.days_until)}`
      : 'No upcoming birthdays';

  const hasIOU = iouSummary.unsettledCount > 0;
  const iouLabel = iouSummary.loading
    ? 'Loading...'
    : hasIOU
      ? `${iouSummary.netCents >= 0 ? "You're owed" : 'You owe'} ${formatCentsDisplay(Math.abs(iouSummary.netCents))} · ${iouSummary.unsettledCount} unsettled`
      : 'All settled up';

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
        onPress={() => router.push('/squad/birthdays' as never)}
        accessibilityRole="button"
        accessibilityLabel={`Birthdays: ${birthdayLabel}`}
      >
        <Text style={styles.icon}>🎂</Text>
        <Text style={styles.label} numberOfLines={1}>{birthdayLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.banner, styles.bannerBorder, pressed && styles.bannerPressed]}
        onPress={() => router.push('/squad/expenses' as never)}
        accessibilityRole="button"
        accessibilityLabel={`IOUs: ${iouLabel}`}
      >
        <Text style={styles.icon}>💸</Text>
        <Text style={styles.label} numberOfLines={1}>{iouLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
      </Pressable>
    </View>
  );
}
