import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { useFriends } from '@/hooks/useFriends';
import { RequestCard } from '@/components/friends/RequestCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';

export function FriendRequests() {
  const { colors } = useTheme();
  const {
    pendingRequests,
    loadingPending,
    fetchPendingRequests,
    acceptRequest,
    rejectRequest,
    fetchFriends,
    error,
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      fetchPendingRequests();
    }
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

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
        <ErrorDisplay
          mode="screen"
          message="Couldn't load friend requests."
          onRetry={fetchPendingRequests}
        />
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
        refreshControl={
          <RefreshControl
            refreshing={loadingPending}
            onRefresh={fetchPendingRequests}
            tintColor={colors.interactive.accent}
          />
        }
        contentContainerStyle={pendingRequests.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}
