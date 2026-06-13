// Phase 33 — Friend profile screen rewrite (D-13).
//
// Replaces the inline useState + useEffect + direct profiles select
// block with composed TanStack Query hooks. Implements the full Telegram-style
// redesign: FriendProfileHeader (collapsing avatar), QuickActionsRow, INFO/MUTUAL/
// WISH LIST grouped-inset sections.
//
// Architecture:
//   - Parent-owned scrollY SharedValue shared by FriendProfileHeader AND
//     Stack.Screen headerTitle (AnimatedStackTitle component below).
//   - AnimatedStackTitle is a FILE-PRIVATE top-level component (not an inline arrow)
//     per RESEARCH §Risks #1 + UI-SPEC §Reanimated Implementation Notes #2.
//   - Remove Friend follows canonical Pattern 5: optimistic splice, rollback,
//     settle-invalidate — satisfies mutationShape gate.
//   - friend-not-found: detected via `data.friendsSince === null` (NOT profile === null)
//     per RESEARCH §Recommendations §Friend-not-found fallback + Plan 02 SUMMARY.

import { router, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useReducedMotion,
} from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { openChat } from '@/lib/openChat';
import { showActionSheet } from '@/lib/action-sheet';

import { useFriendProfile } from '@/hooks/useFriendProfile';
import { useFriendMutuals } from '@/hooks/useFriendMutuals';
import { useFriendWishList } from '@/hooks/useFriendWishList';
import { useExpensesWithFriend } from '@/hooks/useExpensesWithFriend';
import { useFriends } from '@/hooks/useFriends';
import { useFriendsOfFriend } from '@/hooks/useFriendsOfFriend';

import { FriendProfileHeader } from '@/components/friends/FriendProfileHeader';
import { QuickActionsRow } from '@/components/friends/QuickActionsRow';
import { GroupedInsetSection } from '@/components/friends/GroupedInsetSection';
import { ProfileInfoRow } from '@/components/friends/ProfileInfoRow';
import { BioRow } from '@/components/friends/BioRow';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { ImageViewerModal } from '@/components/chat/ImageViewerModal';
import { WishListItem } from '@/components/squad/WishListItem';
import { PrimaryButton } from '@/components/common/PrimaryButton';

// Nav-title animation constants (must match FriendProfileHeader.tsx)
const COLLAPSE_END = 160;

// ─── AnimatedStackTitle (file-private top-level component) ──────────────────
// Top-level component (NOT inline arrow) per UI-SPEC §Reanimated Implementation
// Notes #2 — expo-router clones the render-prop each navigation event.

interface AnimatedStackTitleProps {
  scrollY: SharedValue<number>;
  displayName: string;
}

function AnimatedStackTitle({ scrollY, displayName }: AnimatedStackTitleProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const navTitleStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 1 };
    return {
      opacity: interpolate(
        scrollY.value,
        [COLLAPSE_END * 0.6, COLLAPSE_END],
        [0, 1],
        Extrapolation.CLAMP
      ),
    };
  }, [reducedMotion]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        title: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
      }),
    [colors]
  );

  return (
    <Animated.Text style={[styles.title, navTitleStyle]} numberOfLines={1}>
      {displayName}
    </Animated.Text>
  );
}

// ─── NotFriendsView (file-private inline component) ───────────────────────
// ~15 LOC custom view per RESEARCH §Recommendations §Friend-not-found fallback
// (NOT ErrorDisplay — uses router.back CTA).

interface NotFriendsViewProps {
  onBack: () => void;
}

function NotFriendsView({ onBack }: NotFriendsViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: SPACING.xxl,
          backgroundColor: colors.surface.base,
        },
        heading: {
          fontSize: FONT_SIZE.xl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          textAlign: 'center',
          marginTop: SPACING.lg,
          marginBottom: SPACING.sm,
        },
        body: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
          marginBottom: SPACING.xl,
        },
      }),
    [colors]
  );
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>No longer friends</Text>
      <Text style={styles.body}>{"This person isn't in your friends list anymore."}</Text>
      <PrimaryButton title="Back to friends" onPress={onBack} />
    </View>
  );
}

// ─── SkeletonShells (file-private loading state) ─────────────────────────────

function SkeletonShells() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.surface.base,
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.xxl,
          alignItems: 'center',
        },
        row: {
          marginTop: SPACING.md,
        },
        sectionRow: {
          marginTop: SPACING.xl,
          alignSelf: 'stretch',
        },
      }),
    [colors]
  );
  return (
    <View style={styles.container}>
      {/* Avatar */}
      <SkeletonPulse width={140} height={140} />
      {/* Display name */}
      <View style={styles.row}>
        <SkeletonPulse width={180} height={24} />
      </View>
      {/* Username */}
      <View style={styles.row}>
        <SkeletonPulse width={100} height={14} />
      </View>
      {/* Status pill */}
      <View style={styles.row}>
        <SkeletonPulse width={140} height={24} />
      </View>
      {/* INFO section skeleton */}
      <View style={styles.sectionRow}>
        <SkeletonPulse width="100%" height={56} />
      </View>
      {/* MUTUAL section skeleton */}
      <View style={styles.sectionRow}>
        <SkeletonPulse width="100%" height={56} />
      </View>
      {/* WISH LIST section skeleton */}
      <View style={styles.sectionRow}>
        <SkeletonPulse width="100%" height={56} />
      </View>
    </View>
  );
}

// ─── Helper: format birthday ─────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatBirthday(month: number, day: number): string {
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

function formatFriendsSince(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 'Unknown';
  return `Since ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Helper: IOU balance summary ─────────────────────────────────────────────

interface IouSummary {
  balanceCents: number;
  direction: 'owe' | 'owed' | 'settled';
}

function computeIouSummary(
  expenses: { totalCents: number; isFullySettled: boolean; payerName: string }[],
  myDisplayName: string
): IouSummary {
  if (expenses.length === 0) return { balanceCents: 0, direction: 'settled' };
  const unsettled = expenses.filter((e) => !e.isFullySettled);
  if (unsettled.length === 0) return { balanceCents: 0, direction: 'settled' };
  // Simple heuristic: sum totalCents where payer is NOT me (I owe them) or IS me (they owe me)
  let iOwe = 0;
  let theyOwe = 0;
  for (const e of unsettled) {
    if (e.payerName === myDisplayName) {
      theyOwe += e.totalCents;
    } else {
      iOwe += e.totalCents;
    }
  }
  const net = theyOwe - iOwe;
  if (net === 0) return { balanceCents: 0, direction: 'settled' };
  if (net > 0) return { balanceCents: net, direction: 'owed' }; // they owe me
  return { balanceCents: -net, direction: 'owe' }; // I owe them
}

function formatIouValue(summary: IouSummary, friendFirstName: string): string {
  if (summary.direction === 'settled') return 'All settled';
  const dollars = (summary.balanceCents / 100).toFixed(2);
  if (summary.direction === 'owed') return `${friendFirstName} owes you $${dollars}`;
  return `You owe ${friendFirstName} $${dollars}`;
}

// ─── Main screen component ────────────────────────────────────────────────────

export default function FriendProfileScreen() {
  const { colors } = useTheme();
  const localRouter = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const friendId = (Array.isArray(params.id) ? params.id[0] : (params.id ?? '')) ?? '';
  const session = useAuthStore((s) => s.session);
  const myId = session?.user?.id ?? '';
  const queryClient = useQueryClient();

  // ── Shared scrollY owned by this screen ──
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // ── Imperative scroll ref + wishlist anchor for the "Wish list" INFO row ──
  const scrollRef = useRef<ScrollView>(null);
  const wishlistYRef = useRef<number | null>(null);
  const handleWishlistAnchorLayout = (e: LayoutChangeEvent) => {
    wishlistYRef.current = e.nativeEvent.layout.y;
  };
  const scrollToWishlist = () => {
    const y = wishlistYRef.current;
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
  };

  // ── Data hooks ──
  const { data, isLoading, error, refetch } = useFriendProfile(friendId);
  const { data: mutuals } = useFriendMutuals(friendId);
  const {
    items: wishListItems,
    loading: wishListLoading,
    toggleClaim,
  } = useFriendWishList(friendId);
  const { expenses } = useExpensesWithFriend(friendId);

  // ── Cache-warming hooks (warm friends list + friends-of-friend caches for mutual friend count) ──
  useFriends();
  useFriendsOfFriend(friendId);

  // ── Avatar viewer state ──
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);

  // ── Remove Friend mutation (canonical Pattern 5) ──
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!myId || !friendId) throw new Error('Missing IDs');
      const { error: deleteError } = await supabase
        .from('friendships')
        .delete()
        .or(
          `and(requester_id.eq.${myId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${myId})`
        );
      if (deleteError) throw deleteError;
    },
    onMutate: async () => {
      const listKey = queryKeys.friends.list(myId);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousList = queryClient.getQueryData(listKey);
      queryClient.setQueryData(listKey, (old: { friend_id: string }[] | undefined) =>
        (old ?? []).filter((f) => f.friend_id !== friendId)
      );
      return { previousList };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousList !== undefined) {
        queryClient.setQueryData(queryKeys.friends.list(myId), ctx.previousList);
      }
      Alert.alert('Error', "Couldn't remove friend. Try again.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.friends.list(myId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.friends(myId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home.pendingRequestCount(myId) });
    },
  });

  // ── Quick action handlers ──

  function handleMessage() {
    if (!data?.profile) return;
    openChat(router, {
      kind: 'dmFriend',
      friendId,
      friendName: data.profile.display_name,
    });
  }

  function handlePhotos() {
    localRouter.push(`/friends/${friendId}/photos` as never);
  }

  function handleConfirmRemove() {
    if (!data?.profile) return;
    Alert.alert(
      'Remove Friend',
      `Remove ${data.profile.display_name} from your friends? You can add them again by searching their username.`,
      [
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeMutation.mutate(undefined, {
              onSuccess: () => router.back(),
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  function handleMore() {
    if (!data?.profile) return;
    showActionSheet(data.profile.display_name, [
      { label: 'Remove Friend', destructive: true, onPress: handleConfirmRemove },
    ]);
  }

  // ── Styles ──
  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        scrollContent: {
          paddingBottom: SPACING.xxl,
        },
        wishListEmpty: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
        },
        notFoundOuter: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        errorOuter: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
      }),
    [colors]
  );

  // ── Loading / error / not-found states ──

  if (isLoading && !data) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '',
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
          }}
        />
        <SkeletonShells />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.errorOuter}>
          <ErrorDisplay
            mode="screen"
            message="Couldn't load profile. Check your connection and try again."
            onRetry={refetch}
          />
        </View>
      </>
    );
  }

  // friend-not-found: friendsSince === null per Plan 02 SUMMARY + RESEARCH §Recommendations
  if (!isLoading && data && data.friendsSince === null) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.notFoundOuter}>
          <NotFriendsView onBack={() => router.back()} />
        </View>
      </>
    );
  }

  const profile = data?.profile ?? null;
  const displayName = profile?.display_name ?? '';
  const firstName = displayName.split(' ')[0] ?? displayName;

  // IOU balance
  const iouSummary = computeIouSummary(expenses, displayName);
  const iouValue = formatIouValue(iouSummary, firstName);

  return (
    <>
      <Stack.Screen
        options={{
          title: displayName,
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerTitle: () => <AnimatedStackTitle scrollY={scrollY} displayName={displayName} />,
        }}
      />

      <Animated.ScrollView
        ref={scrollRef as unknown as React.Ref<Animated.ScrollView>}
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <FriendProfileHeader
          scrollY={scrollY}
          displayName={displayName}
          username={profile?.username ?? ''}
          avatarUrl={profile?.avatar_url ?? null}
          status={data?.status ?? null}
          contextTag={data?.contextTag ?? null}
          statusExpiresAt={data?.statusExpiresAt ?? null}
          lastActiveAt={data?.lastActiveAt ?? null}
          onAvatarPress={profile?.avatar_url ? () => setAvatarViewerOpen(true) : undefined}
        />

        {/* Quick Actions Row */}
        <QuickActionsRow
          onMessage={handleMessage}
          onPhotos={handlePhotos}
          onMore={handleMore}
          friendFirstName={firstName}
          messageDisabled={false}
        />

        {/* INFO section */}
        <GroupedInsetSection title="INFO">
          {profile?.bio ? <BioRow bio={profile.bio} /> : null}
          {data?.friendsSince ? (
            <ProfileInfoRow
              iconTint="friendsSince"
              label="Friends since"
              value={formatFriendsSince(data.friendsSince)}
              accessibilityLabel={`Friends since ${formatFriendsSince(data.friendsSince)}`}
            />
          ) : null}
          {profile?.birthday_month && profile?.birthday_day ? (
            <ProfileInfoRow
              iconTint="birthday"
              label="Birthday"
              value={formatBirthday(profile.birthday_month, profile.birthday_day)}
              accessibilityLabel={`Birthday ${formatBirthday(profile.birthday_month, profile.birthday_day)}`}
            />
          ) : null}
          <ProfileInfoRow
            iconTint="wishlist"
            label="Wish list"
            value={
              wishListLoading
                ? '…'
                : wishListItems.length > 0
                  ? String(wishListItems.length)
                  : 'None yet'
            }
            onPress={wishListItems.length > 0 ? scrollToWishlist : undefined}
            chevron={wishListItems.length > 0}
            accessibilityLabel={`Wish list: ${wishListItems.length} ${wishListItems.length === 1 ? 'item' : 'items'}`}
            accessibilityHint={
              wishListItems.length > 0 ? 'Scrolls down to the wish list section' : undefined
            }
          />
          {/* Fallback row when all optional INFO rows are null — always show friends since at minimum */}
          {!profile?.bio && !data?.friendsSince && !profile?.birthday_month ? (
            <ProfileInfoRow iconTint="friendsSince" label="Friends since" value="Unknown" />
          ) : null}
        </GroupedInsetSection>

        {/* MUTUAL section */}
        <GroupedInsetSection title="MUTUAL">
          <ProfileInfoRow
            iconTint="mutualPlans"
            label="Mutual plans"
            value={
              mutuals && mutuals.mutualPlansCount > 0
                ? String(mutuals.mutualPlansCount)
                : 'None yet'
            }
            onPress={
              mutuals && mutuals.mutualPlansCount > 0
                ? () => localRouter.push(`/friends/${friendId}/mutual-plans` as never)
                : undefined
            }
            chevron={!!(mutuals && mutuals.mutualPlansCount > 0)}
            accessibilityLabel={`Mutual plans: ${mutuals?.mutualPlansCount ?? 0}`}
            accessibilityHint={
              mutuals && mutuals.mutualPlansCount > 0 ? 'Opens the list of mutual plans' : undefined
            }
          />
          <ProfileInfoRow
            iconTint="mutualFriends"
            label="Mutual friends"
            value={
              mutuals && mutuals.mutualFriendsCount > 0
                ? String(mutuals.mutualFriendsCount)
                : 'None yet'
            }
            onPress={
              mutuals && mutuals.mutualFriendsCount > 0
                ? () => localRouter.push(`/friends/${friendId}/mutual-friends` as never)
                : undefined
            }
            chevron={!!(mutuals && mutuals.mutualFriendsCount > 0)}
            accessibilityLabel={`Mutual friends: ${mutuals?.mutualFriendsCount ?? 0}`}
            accessibilityHint={
              mutuals && mutuals.mutualFriendsCount > 0
                ? 'Opens the list of mutual friends'
                : undefined
            }
          />
          <ProfileInfoRow
            iconTint="sharedPhotos"
            label="Shared photos"
            value={
              mutuals && mutuals.sharedPhotosCount > 0
                ? String(mutuals.sharedPhotosCount)
                : 'None yet'
            }
            onPress={mutuals && mutuals.sharedPhotosCount > 0 ? handlePhotos : undefined}
            chevron={!!(mutuals && mutuals.sharedPhotosCount > 0)}
            accessibilityLabel={`Shared photos: ${mutuals?.sharedPhotosCount ?? 0}`}
            accessibilityHint={
              mutuals && mutuals.sharedPhotosCount > 0 ? 'Opens shared photos' : undefined
            }
          />
          <ProfileInfoRow
            iconTint="iou"
            label="IOU balance"
            value={iouValue}
            accessibilityLabel={`IOU balance: ${iouValue}`}
          />
        </GroupedInsetSection>

        {/* WISH LIST section (anchored for INFO → Wish list nav row scroll-to) */}
        <View onLayout={handleWishlistAnchorLayout} />
        <GroupedInsetSection title="WISH LIST">
          {wishListLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.interactive.accent}
              style={{ paddingVertical: SPACING.md }}
            />
          ) : wishListItems.length === 0 ? (
            <Text style={styles.wishListEmpty}>No wish list items.</Text>
          ) : (
            wishListItems.map((item) => (
              <WishListItem
                key={item.id}
                title={item.title}
                url={item.url}
                notes={item.notes}
                isClaimed={item.isClaimed}
                isClaimedByMe={item.isClaimedByMe}
                onToggleClaim={() => toggleClaim(item.id, item.isClaimed)}
              />
            ))
          )}
        </GroupedInsetSection>
      </Animated.ScrollView>

      {/* Full-screen avatar viewer */}
      <ImageViewerModal
        visible={avatarViewerOpen}
        imageUrl={profile?.avatar_url ?? null}
        onClose={() => setAvatarViewerOpen(false)}
      />
    </>
  );
}
