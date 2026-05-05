import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING, ANIMATION } from '@/theme';
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
      ...colors.cardElevation,
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      padding: SPACING.md,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      aspectRatio: 1,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
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
  }), [colors]);

  const router = useRouter();

  const iouScaleAnim = useRef(new Animated.Value(1)).current;
  const birthdayScaleAnim = useRef(new Animated.Value(1)).current;

  function makeSpringHandlers(anim: Animated.Value) {
    return {
      onPressIn: () => Animated.spring(anim, {
        toValue: 0.96,
        useNativeDriver: true,
        damping: ANIMATION.easing.spring.damping,
        stiffness: ANIMATION.easing.spring.stiffness,
        isInteraction: false,
      }).start(),
      onPressOut: () => Animated.spring(anim, {
        toValue: 1.0,
        useNativeDriver: true,
        damping: ANIMATION.easing.spring.damping,
        stiffness: ANIMATION.easing.spring.stiffness,
        isInteraction: false,
      }).start(),
    };
  }

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
        style={styles.tile}
        {...makeSpringHandlers(iouScaleAnim)}
        onPress={() => router.push('/squad/expenses' as never)}
        accessibilityRole="button"
        accessibilityLabel={`IOUs: ${iouMain}, ${iouSub}`}
      >
        <Animated.View style={{ transform: [{ scale: iouScaleAnim }] }}>
          <Text style={styles.tileTitle}>IOUs</Text>
          <Text style={styles.icon}>💸</Text>
          <Text style={styles.main} numberOfLines={1}>{iouMain}</Text>
          {iouSub ? <Text style={styles.sub} numberOfLines={1}>{iouSub}</Text> : null}
        </Animated.View>
      </Pressable>

      <Pressable
        style={styles.tile}
        {...makeSpringHandlers(birthdayScaleAnim)}
        onPress={() => router.push('/squad/birthdays' as never)}
        accessibilityRole="button"
        accessibilityLabel={`Birthdays: ${birthdayMain}, ${birthdaySub}`}
      >
        <Animated.View style={{ transform: [{ scale: birthdayScaleAnim }] }}>
          <Text style={styles.tileTitle}>Birthdays</Text>
          <Text style={styles.icon}>🎂</Text>
          <Text style={styles.main} numberOfLines={1}>{birthdayMain}</Text>
          {birthdaySub ? <Text style={styles.sub} numberOfLines={1}>{birthdaySub}</Text> : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}
