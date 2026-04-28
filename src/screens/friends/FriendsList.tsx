import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, SPACING } from '@/theme';
import { useFriends } from '@/hooks/useFriends';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendActionSheet } from '@/components/friends/FriendActionSheet';
import { EmptyState } from '@/components/common/EmptyState';
import { FAB } from '@/components/common/FAB';
import { supabase } from '@/lib/supabase';
import type { FriendWithStatus } from '@/hooks/useFriends';

export function FriendsList() {
  const { colors } = useTheme();
  const router = useRouter();
  const { friends, loadingFriends, fetchFriends, removeFriend } = useFriends();
  const [selectedFriend, setSelectedFriend] = useState<FriendWithStatus | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loadingDM, setLoadingDM] = useState(false);

  useEffect(() => {
    fetchFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFriendPress(friend: FriendWithStatus) {
    setSelectedFriend(friend);
    setSheetVisible(true);
  }

  function handleCloseSheet() {
    setSheetVisible(false);
    setSelectedFriend(null);
  }

  async function handleRemoveFriend() {
    if (!selectedFriend) return;
    const { error } = await removeFriend(selectedFriend.friend_id);
    if (error) {
      Alert.alert('Error', "Couldn't remove friend. Try again.");
    } else {
      fetchFriends();
    }
  }

  function handleViewProfile() {
    if (!selectedFriend) return;
    router.push(`/friends/${selectedFriend.friend_id}` as never);
    handleCloseSheet();
  }

  async function handleStartDM() {
    if (!selectedFriend) return;
    setLoadingDM(true);
    const { data: channelId, error: rpcError } = await supabase.rpc('get_or_create_dm_channel', {
      other_user_id: selectedFriend.friend_id,
    });
    setLoadingDM(false);
    if (rpcError || !channelId) {
      Alert.alert('Error', "Couldn't open chat. Try again.");
      return;
    }
    handleCloseSheet();
    router.push(
      `/chat/room?dm_channel_id=${channelId}&friend_name=${encodeURIComponent(selectedFriend.display_name)}` as never
    );
  }

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface.base,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
    },
    emptyList: {
      flex: 1,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.friend_id}
        renderItem={({ item }) => (
          <FriendCard friend={item} onPress={() => handleFriendPress(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loadingFriends ? null : (
            <EmptyState
              icon="people-outline"
              iconType="ionicons"
              heading="No friends yet"
              body="Add friends by username or share your QR code — tap the + button to get started."
              ctaLabel="Add Friend"
              onCta={() => router.push('/friends/add')}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={loadingFriends}
            onRefresh={fetchFriends}
            tintColor={colors.interactive.accent}
          />
        }
        contentContainerStyle={friends.length === 0 ? styles.emptyList : undefined}
      />

      <FAB
        icon={<Ionicons name="person-add-outline" size={24} color={colors.surface.base} />}
        onPress={() => router.push('/friends/add')}
        accessibilityLabel="Add a friend"
      />

      <FriendActionSheet
        visible={sheetVisible}
        onClose={handleCloseSheet}
        friend={selectedFriend}
        onViewProfile={handleViewProfile}
        onStartDM={handleStartDM}
        onRemoveFriend={handleRemoveFriend}
        loadingDM={loadingDM}
      />
    </View>
  );
}
