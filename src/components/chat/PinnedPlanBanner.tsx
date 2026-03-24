import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { usePlanDetail } from '@/hooks/usePlanDetail';
import { formatPlanTime } from '@/components/plans/PlanCard';

interface PinnedPlanBannerProps {
  planId: string;
}

export function PinnedPlanBanner({ planId }: PinnedPlanBannerProps) {
  const router = useRouter();
  const { plan } = usePlanDetail(planId);

  if (!plan) return null;

  const going = plan.members.filter((m) => m.rsvp === 'going').length;
  const maybe = plan.members.filter((m) => m.rsvp === 'maybe').length;

  const rsvpParts: string[] = [];
  if (going > 0) rsvpParts.push(`${going} going`);
  if (maybe > 0) rsvpParts.push(`${maybe} maybe`);
  const rsvpSummary = rsvpParts.length > 0 ? rsvpParts.join(', ') : 'No RSVPs yet';

  const timeLabel = formatPlanTime(plan.scheduled_for);
  const parts = [plan.title];
  if (timeLabel) parts.push(timeLabel);
  parts.push(rsvpSummary);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(('/plans/' + planId) as never)}
      activeOpacity={0.8}
    >
      <Text style={styles.title} numberOfLines={1}>
        {plan.title}
        {timeLabel ? <Text style={styles.secondary}>{' \u2022 ' + timeLabel}</Text> : null}
        <Text style={styles.secondary}>{' \u2022 ' + rsvpSummary}</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    flex: 1,
  },
  secondary: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
});
