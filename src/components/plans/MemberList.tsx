import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { COLORS } from '@/constants/colors';
import type { PlanMember } from '@/types/plans';

interface MemberListProps {
  members: PlanMember[];
  creatorId: string;
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

export function MemberList({ members, creatorId }: MemberListProps) {
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
              <View
                key={member.user_id}
                style={[styles.memberRow, dimmed && styles.dimmed]}
              >
                <AvatarCircle
                  size={32}
                  imageUri={member.profiles.avatar_url}
                  displayName={member.profiles.display_name}
                />
                <Text style={styles.memberName}>{member.profiles.display_name}</Text>
                {member.user_id === creatorId && (
                  <Text style={styles.creatorBadge}>Creator</Text>
                )}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  dimmed: {
    opacity: 0.5,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  creatorBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
    marginLeft: 8,
  },
});
