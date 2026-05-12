// Phase 29.1 Plan 05 — HabitMemberStrip.
// Avatar stack with "{X} of {Y} done today" caption (UI-SPEC §Habit detail
// "X/Y done today" subhead). Renders only when totalCount > 1 (group habits).

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_SIZE, FONT_FAMILY, SPACING } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';

export interface HabitMemberStripMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  did_check_in_today: boolean;
}

interface HabitMemberStripProps {
  members: HabitMemberStripMember[];
  doneCount: number;
  totalCount: number;
}

const MAX_AVATARS = 5;

export function HabitMemberStrip({ members, doneCount, totalCount }: HabitMemberStripProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          gap: SPACING.sm,
        },
        avatarRow: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        avatarWrapper: {
          // Stack avatars with overlap
          marginLeft: -SPACING.xs,
        },
        avatarFirst: {
          marginLeft: 0,
        },
        overflowChip: {
          marginLeft: SPACING.sm,
          paddingHorizontal: SPACING.sm,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 4, // chip pill exception (UI-SPEC precedent)
          backgroundColor: colors.surface.overlay,
          borderRadius: SPACING.md,
        },
        overflowText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
        },
        caption: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        mutedAvatar: {
          opacity: 0.4,
        },
      }),
    [colors]
  );

  if (totalCount <= 1) return null;

  const visibleMembers = members.slice(0, MAX_AVATARS);
  const overflow = Math.max(0, members.length - MAX_AVATARS);

  return (
    <View style={styles.container}>
      <View style={styles.avatarRow}>
        {visibleMembers.map((m, idx) => (
          <View
            key={m.user_id}
            style={[
              styles.avatarWrapper,
              idx === 0 && styles.avatarFirst,
              !m.did_check_in_today && styles.mutedAvatar,
            ]}
          >
            <AvatarCircle size={28} imageUri={m.avatar_url} displayName={m.display_name} />
          </View>
        ))}
        {overflow > 0 && (
          <View style={styles.overflowChip}>
            <Text style={styles.overflowText}>+{overflow} more</Text>
          </View>
        )}
      </View>
      <Text style={styles.caption}>
        {doneCount} of {totalCount} done today
      </Text>
    </View>
  );
}
