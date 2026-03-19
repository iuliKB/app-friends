import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useFriends } from '@/hooks/useFriends';
import { RequestCard } from '@/components/friends/RequestCard';
import { EmptyState } from '@/components/common/EmptyState';

export function FriendRequests() {
  const {
    pendingRequests,
    loadingPending,
    fetchPendingRequests,
    acceptRequest,
    rejectRequest,
    fetchFriends,
  } = useFriends();
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Refetch every time this screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchPendingRequests();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function handleAccept(id: string) {
    setLoadingIds((prev) => new Set(prev).add(id));
    const { error } = await acceptRequest(id);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (error) {
      Alert.alert('Error', "Couldn't accept request. Try again.");
    } else {
      fetchPendingRequests();
      fetchFriends();
    }
  }

  async function handleDecline(id: string) {
    setLoadingIds((prev) => new Set(prev).add(id));
    const { error } = await rejectRequest(id);
    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (error) {
      Alert.alert('Error', "Couldn't decline request. Try again.");
    } else {
      fetchPendingRequests();
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onAccept={() => handleAccept(item.id)}
            onDecline={() => handleDecline(item.id)}
            loading={loadingIds.has(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loadingPending ? null : (
            <EmptyState
              icon="person-add-outline"
              iconType="ionicons"
              heading="No pending requests"
              body="Friend requests you receive will show up here."
            />
          )
        }
        onRefresh={fetchPendingRequests}
        refreshing={loadingPending}
        contentContainerStyle={pendingRequests.length === 0 ? styles.emptyList : undefined}
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
});
