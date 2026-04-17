// Phase 11 v1.4 — Friend Birthday Page (D-12, D-13, D-14, D-15, D-16, D-18)
// Route: /squad/birthday/[id]?name=...
// Shows: friend's wish list with claim toggles, their friends list (for group selection),
//        and a "Plan Birthday" button that creates a private group chat.
// Birthday friend is NOT selectable in the group picker (D-16).

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/stores/useChatStore';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { WishListItem } from '@/components/squad/WishListItem';
import { useFriendWishList } from '@/hooks/useFriendWishList';
import { useFriendsOfFriend, type FriendOfFriend } from '@/hooks/useFriendsOfFriend';

export default function FriendBirthdayPage() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const friendId = id ?? '';
  const friendName = name ? decodeURIComponent(name) : 'Friend';

  const invalidateChatList = useChatStore((s) => s.invalidateChatList);
  const { items, loading: wishListLoading, error: wishListError, refetch: refetchWishList, toggleClaim } = useFriendWishList(friendId);
  const { friends, loading: friendsLoading, error: friendsError, refetch: refetchFriends } = useFriendsOfFriend(friendId);

  // Group member selection state (D-16: birthday friend is excluded from picker)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  function toggleSelectFriend(friendOfFriendId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendOfFriendId)) {
        next.delete(friendOfFriendId);
      } else {
        next.add(friendOfFriendId);
      }
      return next;
    });
  }

  async function handlePlanBirthday() {
    if (creating) return;
    setCreating(true);
    const groupName = `${friendName}'s birthday`;
    const memberIds = Array.from(selectedIds);

    const { data: groupChannelId, error: rpcErr } = await supabase.rpc(
      'create_birthday_group',
      {
        p_name: groupName,
        p_member_ids: memberIds,
        p_birthday_person_id: friendId,
      }
    );

    setCreating(false);

    if (rpcErr || !groupChannelId) {
      // Silent failure — show no alert, just return. User can retry.
      console.warn('create_birthday_group failed', rpcErr);
      return;
    }

    // Bust the chat list cache so the new group appears immediately when the user visits Chats
    invalidateChatList();

    // Navigate to the group chat room using the existing chat UI (D-18)
    router.push(
      `/chat/room?group_channel_id=${groupChannelId}&friend_name=${encodeURIComponent(groupName)}&birthday_person_id=${friendId}` as never
    );
  }

  function handleRefresh() {
    void refetchWishList();
    void refetchFriends();
  }

  const isLoading = wishListLoading || friendsLoading;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.interactive.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
          tintColor={COLORS.interactive.accent}
        />
      }
    >
      {/* Wish List Section */}
      <Text style={styles.sectionLabel}>
        {friendName}'s Wish List
      </Text>

      {wishListError ? (
        <Text style={styles.errorText}>
          {wishListError}
        </Text>
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>
          {friendName} hasn't added any wishes yet.
        </Text>
      ) : (
        items.map((item) => (
          <WishListItem
            key={item.id}
            title={item.title}
            url={item.url}
            notes={item.notes}
            isClaimed={item.isClaimed}
            isClaimedByMe={item.isClaimedByMe}
            onToggleClaim={() => void toggleClaim(item.id, item.isClaimedByMe)}
          />
        ))
      )}

      {/* Friend Picker Section (D-13, D-14) */}
      <Text style={styles.sectionLabel}>
        Plan Birthday With
      </Text>
      <Text style={styles.sectionSub}>
        Select friends to include in a secret group chat.
      </Text>

      {friendsError ? (
        <Text style={styles.errorText}>{friendsError}</Text>
      ) : friends.length === 0 ? (
        <Text style={styles.emptyText}>No other friends to include.</Text>
      ) : (
        friends.map((friend) => (
          <FriendPickerRow
            key={friend.friend_id}
            friend={friend}
            selected={selectedIds.has(friend.friend_id)}
            onToggle={() => toggleSelectFriend(friend.friend_id)}
          />
        ))
      )}

      {/* Plan Birthday Button */}
      <View style={styles.buttonWrapper}>
        <Pressable
          style={({ pressed }) => [
            styles.planButton,
            (creating || selectedIds.size === 0) && styles.planButtonDisabled,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handlePlanBirthday}
          disabled={creating || selectedIds.size === 0}
          accessibilityLabel="Plan birthday group chat"
        >
          <Text style={styles.planButtonText}>
            {creating ? 'Creating...' : 'Plan Birthday'}
          </Text>
        </Pressable>
        {selectedIds.size === 0 && (
          <Text style={styles.planButtonHint}>
            Select at least one friend above to create a group.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

interface FriendPickerRowProps {
  friend: FriendOfFriend;
  selected: boolean;
  onToggle: () => void;
}

function FriendPickerRow({ friend, selected, onToggle }: FriendPickerRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.pickerRow,
        selected && styles.pickerRowSelected,
        pressed && { opacity: 0.75 },
      ]}
      onPress={onToggle}
      accessibilityLabel={`${selected ? 'Deselect' : 'Select'} ${friend.display_name}`}
    >
      <AvatarCircle
        size={36}
        imageUri={friend.avatar_url}
        displayName={friend.display_name}
      />
      <Text style={styles.pickerName} numberOfLines={1}>
        {friend.display_name}
      </Text>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface.base,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  sectionSub: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.interactive.destructive,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.surface.base,
  },
  pickerRowSelected: {
    backgroundColor: COLORS.surface.card,
  },
  pickerName: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADII.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.interactive.accent,
    borderColor: COLORS.interactive.accent,
  },
  checkmark: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.surface.base,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontWeight: '700',
  },
  buttonWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  planButton: {
    backgroundColor: COLORS.interactive.accent,
    borderRadius: RADII.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  planButtonDisabled: {
    opacity: 0.4,
  },
  planButtonText: {
    fontSize: FONT_SIZE.lg,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontWeight: '700',
    color: COLORS.surface.base,
  },
  planButtonHint: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
