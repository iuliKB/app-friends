import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarStack } from '@/components/plans/AvatarStack';
import type { PlanWithMembers } from '@/types/plans';

export function formatPlanTime(scheduledFor: string | null): string {
  if (!scheduledFor) return '';
  const date = new Date(scheduledFor);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (diffHours < 0) return 'Past';
  if (diffHours < 1) return `In ${Math.max(1, Math.round(diffMs / 60000))} min \u2022 ${timeStr}`;
  if (diffHours < 24) return `In ${Math.floor(diffHours)}h \u2022 ${timeStr}`;

  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;
  return (
    date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
    ` ${timeStr}`
  );
}

function getRsvpSummary(plan: PlanWithMembers): string {
  const going = plan.members.filter((m) => m.rsvp === 'going').length;
  const maybe = plan.members.filter((m) => m.rsvp === 'maybe').length;
  const parts: string[] = [];
  if (going > 0) parts.push(`${going} going`);
  if (maybe > 0) parts.push(`${maybe} maybe`);
  return parts.join(', ');
}

interface PlanCardProps {
  plan: PlanWithMembers;
  onPress: () => void;
}

export function PlanCard({ plan, onPress }: PlanCardProps) {
  const timeLabel = formatPlanTime(plan.scheduled_for);
  const rsvpSummary = getRsvpSummary(plan);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.title}>{plan.title}</Text>
      {timeLabel ? <Text style={styles.timeLabel}>{timeLabel}</Text> : null}
      {plan.location ? <Text style={styles.location}>{plan.location}</Text> : null}
      {rsvpSummary ? <Text style={styles.rsvpSummary}>{rsvpSummary}</Text> : null}
      <View style={styles.avatarStackContainer}>
        <AvatarStack members={plan.members} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.lg,
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  timeLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  location: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  rsvpSummary: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  avatarStackContainer: {
    marginTop: SPACING.xs,
  },
});
