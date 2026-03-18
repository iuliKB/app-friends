import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { useFriends } from '@/hooks/useFriends';
import { RequestCard } from '@/components/friends/RequestCard';

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

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.border} />
        <Text style={styles.emptyHeading}>All caught up</Text>
        <Text style={styles.emptyBody}>No pending friend requests.</Text>
      </View>
    );
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
        ListEmptyComponent={loadingPending ? null : renderEmpty()}
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
    marginTop: 8,
    textAlign: 'center',
  },
});
