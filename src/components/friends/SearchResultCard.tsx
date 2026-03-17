import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '@/constants/colors';
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
          {status === 'loading' && (
            <ActivityIndicator color={COLORS.textSecondary} />
          )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  username: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  addButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dominant,
  },
  pendingButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
});
