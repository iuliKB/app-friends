import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { Profile } from '@/types/app';

interface SearchResultCardProps {
  profile: Profile;
  status: 'idle' | 'loading' | 'pending';
  onAddFriend: () => void;
  isSelf: boolean;
}

export function SearchResultCard({ profile, status, onAddFriend, isSelf }: SearchResultCardProps) {
  return (
    <View style={styles.container}>
      <AvatarCircle size={40} imageUri={profile.avatar_url} displayName={profile.display_name} />
      <View style={styles.info}>
        <Text style={styles.displayName}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
      </View>

      {!isSelf && (
        <>
          {status === 'idle' && (
            <TouchableOpacity style={styles.addButton} onPress={onAddFriend} activeOpacity={0.8}>
              <Text style={styles.addButtonText}>Add Friend</Text>
            </TouchableOpacity>
          )}
          {status === 'loading' && <ActivityIndicator color={COLORS.text.secondary} />}
          {status === 'pending' && (
            <View style={styles.pendingButton}>
              <Text style={styles.pendingButtonText}>Pending</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  info: {
    flex: 1,
    marginLeft: SPACING.lg,
  },
  displayName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  username: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  addButton: {
    height: 36,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
    backgroundColor: COLORS.interactive.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
  },
  pendingButton: {
    height: 36,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
});
