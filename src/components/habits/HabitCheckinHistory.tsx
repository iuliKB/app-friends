// Phase 29.1 Plan 05 — HabitCheckinHistory.
// Vertical list of date entries (last 30 days). Each entry: date (MMM D)
// + done-by row (avatars of members who checked in that day).
//
// Loading: 5 SkeletonPulse rows.
// Empty (no checkins): EmptyState with "No check-ins yet" / "Tap done today to start".

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_SIZE, FONT_FAMILY, SPACING } from '@/theme';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { EmptyState } from '@/components/common/EmptyState';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { HabitCheckin } from '@/types/habits';

interface HistoryMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface HabitCheckinHistoryProps {
  checkins: HabitCheckin[];
  members: HistoryMember[];
  loading: boolean;
}

function formatMonthDay(dateLocal: string): string {
  // dateLocal is 'YYYY-MM-DD'. Parse parts manually so we don't apply tz.
  const parts = dateLocal.split('-');
  if (parts.length !== 3) return dateLocal;
  const yStr = parts[0] ?? '';
  const mStr = parts[1] ?? '';
  const dStr = parts[2] ?? '';
  const year = parseInt(yStr, 10);
  const monthIdx = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);
  if (Number.isNaN(year) || Number.isNaN(monthIdx) || Number.isNaN(day)) return dateLocal;
  // Use Date constructor at noon (avoids any DST edge) but never use its tz date components.
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const monthLabel = months[monthIdx] ?? '?';
  return `${monthLabel} ${day}`;
}

export function HabitCheckinHistory({ checkins, members, loading }: HabitCheckinHistoryProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: SPACING.md,
        },
        skeletonRow: {
          marginBottom: SPACING.sm,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.md,
          gap: SPACING.md,
        },
        dateLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,

          width: 64,
        },
        avatarRow: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        avatarWrapper: {
          marginLeft: -SPACING.xs,
        },
        avatarFirst: {
          marginLeft: 0,
        },
        separator: {
          height: 1,
          backgroundColor: colors.border,
        },
        emptyContainer: {
          paddingVertical: SPACING.xl,
        },
      }),
    [colors]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {[0, 1, 2, 3, 4].map((n) => (
          <View key={n} style={styles.skeletonRow}>
            <SkeletonPulse width="100%" height={42} />
          </View>
        ))}
      </View>
    );
  }

  if (checkins.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="calendar-outline"
          iconType="ionicons"
          heading="No check-ins yet"
          body="Tap done today to start"
        />
      </View>
    );
  }

  // Group check-ins by date_local; list members who checked in each day.
  const memberById = new Map(members.map((m) => [m.user_id, m] as const));
  const byDate = new Map<string, HistoryMember[]>();
  for (const c of checkins) {
    const existing = byDate.get(c.date_local) ?? [];
    const member = memberById.get(c.user_id);
    if (member && !existing.some((m) => m.user_id === member.user_id)) {
      existing.push(member);
    }
    byDate.set(c.date_local, existing);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : -1));

  return (
    <View>
      {sortedDates.map((date, idx) => {
        const doneBy = byDate.get(date) ?? [];
        return (
          <React.Fragment key={date}>
            <View style={styles.row}>
              <Text style={styles.dateLabel}>{formatMonthDay(date)}</Text>
              <View style={styles.avatarRow}>
                {doneBy.map((m, i) => (
                  <View
                    key={m.user_id}
                    style={[styles.avatarWrapper, i === 0 && styles.avatarFirst]}
                  >
                    <AvatarCircle size={28} imageUri={m.avatar_url} displayName={m.display_name} />
                  </View>
                ))}
              </View>
            </View>
            {idx < sortedDates.length - 1 && <View style={styles.separator} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}
