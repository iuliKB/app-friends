import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import type { PlanMember } from '@/types/plans';

interface MemberListProps {
  members: PlanMember[];
  creatorId: string;
  onMemberPress?: (userId: string) => void;
}

type RsvpGroup = {
  label: string;
  rsvpValue: 'going' | 'maybe' | 'invited' | 'out';
  dimmed?: boolean;
};

const GROUPS: RsvpGroup[] = [
  { label: 'Going', rsvpValue: 'going' },
  { label: 'Maybe', rsvpValue: 'maybe' },
  { label: 'Invited', rsvpValue: 'invited' },
  { label: 'Not Going', rsvpValue: 'out', dimmed: true },
];

export function MemberList({ members, creatorId, onMemberPress }: MemberListProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    sectionHeader: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.sm,
    },
    dimmed: {
      opacity: 0.5,
    },
    memberName: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
      marginLeft: SPACING.md,
    },
    creatorBadge: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.interactive.accent,
      marginLeft: SPACING.sm,
    },
  }), [colors]);

  return (
    <View>
      {GROUPS.map(({ label, rsvpValue, dimmed }) => {
        const groupMembers = members.filter((m) => m.rsvp === rsvpValue);
        if (groupMembers.length === 0) return null;

        return (
          <View key={rsvpValue}>
            <Text style={styles.sectionHeader}>
              {label} ({groupMembers.length})
            </Text>
            {groupMembers.map((member) => (
              <TouchableOpacity
                key={member.user_id}
                style={[styles.memberRow, dimmed && styles.dimmed]}
                onPress={() => onMemberPress?.(member.user_id)}
                activeOpacity={onMemberPress ? 0.7 : 1}
                disabled={!onMemberPress}
              >
                <AvatarCircle
                  size={32}
                  imageUri={member.profiles.avatar_url}
                  displayName={member.profiles.display_name}
                />
                <Text style={styles.memberName}>{member.profiles.display_name}</Text>
                {member.user_id === creatorId && <Text style={styles.creatorBadge}>Creator</Text>}
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
    </View>
  );
}
