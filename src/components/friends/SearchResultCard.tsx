import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { Profile } from '@/types/app';

interface SearchResultCardProps {
  profile: Profile;
  status: 'idle' | 'loading' | 'pending';
  onAddFriend: () => void;
  isSelf: boolean;
}

export function SearchResultCard({ profile, status, onAddFriend, isSelf }: SearchResultCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    username: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.xs,
    },
    addButton: {
      height: 36,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADII.md,
      backgroundColor: colors.interactive.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.surface.base,
    },
    pendingButton: {
      height: 36,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADII.md,
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pendingButtonText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
  }), [colors]);

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
          {status === 'loading' && <ActivityIndicator color={colors.text.secondary} />}
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
