// Mutual friends list — opened from friend profile MUTUAL section.
// Intersects useFriends() (my friends, with status) with useFriendsOfFriend(friendId)
// and renders FriendCard list. Tap → /friends/[id].

import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { useFriends, type FriendWithStatus } from '@/hooks/useFriends';
import { useFriendsOfFriend } from '@/hooks/useFriendsOfFriend';
import { useFriendProfile } from '@/hooks/useFriendProfile';
import { FriendCard } from '@/components/friends/FriendCard';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';

export default function MutualFriendsScreen() {
  const { colors } = useTheme();
  const localRouter = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const friendId = (Array.isArray(params.id) ? params.id[0] : (params.id ?? '')) ?? '';

  const { friends, loadingFriends: friendsLoading, error: friendsError } = useFriends();
  const {
    friends: friendsOfFriend,
    loading: ofFriendLoading,
    error: ofFriendError,
  } = useFriendsOfFriend(friendId);
  const { data: friendData } = useFriendProfile(friendId);

  const headerTitle = friendData?.profile?.display_name
    ? `Friends with ${friendData.profile.display_name.split(' ')[0]}`
    : 'Mutual friends';

  const mutual: FriendWithStatus[] = useMemo(() => {
    const ofFriendIds = new Set(friendsOfFriend.map((f) => f.friend_id));
    return friends.filter((f) => ofFriendIds.has(f.friend_id));
  }, [friends, friendsOfFriend]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        listContent: {
          paddingBottom: SPACING.xxl,
        },
        separator: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginLeft: SPACING.lg + 40 + SPACING.lg,
        },
        emptyContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: SPACING.xxl,
        },
        emptyHeading: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          textAlign: 'center',
          marginBottom: SPACING.sm,
        },
        emptyBody: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
        },
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors],
  );

  const isLoading = friendsLoading || ofFriendLoading;
  const error = friendsError || ofFriendError;

  if (isLoading && mutual.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: headerTitle }} />
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={colors.interactive.accent} />
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: headerTitle }} />
        <View style={styles.container}>
          <ErrorDisplay
            mode="screen"
            message="Couldn't load friends. Check your connection and try again."
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      {mutual.length === 0 ? (
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.emptyHeading}>No mutual friends yet</Text>
          <Text style={styles.emptyBody}>
            When you and {friendData?.profile?.display_name?.split(' ')[0] ?? 'your friend'} share a
            connection, it&apos;ll appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.container}
          contentContainerStyle={styles.listContent}
          data={mutual}
          keyExtractor={(item) => item.friend_id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <FriendCard
              friend={item}
              onPress={() => localRouter.push(`/friends/${item.friend_id}` as never)}
            />
          )}
        />
      )}
    </>
  );
}
