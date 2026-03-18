import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { useFriends } from '@/hooks/useFriends';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendActionSheet } from '@/components/friends/FriendActionSheet';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { supabase } from '@/lib/supabase';
import type { FriendWithStatus } from '@/hooks/useFriends';

export function FriendsList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    Alert.alert('Coming soon', 'Coming in Phase 6');
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

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={COLORS.border} />
        <Text style={styles.emptyHeading}>No friends yet</Text>
        <Text style={styles.emptyBody}>Add friends by username or QR code to see them here.</Text>
        <PrimaryButton title="Add Friend" onPress={() => router.push('/friends/add')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.friend_id}
        renderItem={({ item }) => (
          <FriendCard friend={item} onPress={() => handleFriendPress(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={loadingFriends ? null : renderEmpty()}
        onRefresh={fetchFriends}
        refreshing={loadingFriends}
        contentContainerStyle={friends.length === 0 ? styles.emptyList : undefined}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => router.push('/friends/add')}
        activeOpacity={0.8}
        accessibilityLabel="Add friend"
      >
        <Ionicons name="person-add-outline" size={24} color={COLORS.dominant} />
      </TouchableOpacity>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyBody: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
