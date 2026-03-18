import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { COLORS } from '@/constants/colors';
import type { PlanMember } from '@/types/plans';

interface AvatarStackProps {
  members: PlanMember[];
  maxVisible?: number;
  size?: number;
}

export function AvatarStack({ members, maxVisible = 5, size = 28 }: AvatarStackProps) {
  const visibleMembers = members.slice(0, maxVisible);
  const overflow = members.length - visibleMembers.length;

  return (
    <View style={styles.container}>
      {visibleMembers.map((member, index) => (
        <View
          key={member.user_id}
          style={[
            styles.avatarWrapper,
            { marginLeft: index === 0 ? 0 : -8, zIndex: maxVisible - index },
          ]}
        >
          <AvatarCircle
            size={size}
            imageUri={member.profiles.avatar_url}
            displayName={member.profiles.display_name}
          />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.overflowBadge,
            { width: size, height: size, borderRadius: size / 2, marginLeft: -8, zIndex: 0 },
          ]}
          accessibilityLabel={`${overflow} more members`}
        >
          <Text style={styles.overflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    // zIndex set inline per avatar
  },
  overflowBadge: {
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
