import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AvatarCircle } from '@/components/common/AvatarCircle';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { useFriendWishList } from '@/hooks/useFriendWishList';
import { WishListItem } from '@/components/squad/WishListItem';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

type StatusValue = 'free' | 'busy' | 'maybe';

interface FriendProfile {
  display_name: string;
  username: string;
  avatar_url: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
}

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

export default function FriendProfileScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const session = useAuthStore((s) => s.session);

  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [status, setStatus] = useState<StatusValue | null>(null);
  const [contextTag, setContextTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { items: wishListItems, loading: wishListLoading } = useFriendWishList(id ?? '');

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      const [profileResult, statusResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, username, avatar_url, birthday_month, birthday_day')
          .eq('id', id)
          .single(),
        supabase
          .from('effective_status')
          .select('effective_status, context_tag')
          .eq('user_id', id)
          .single(),
      ]);

      if (profileResult.data && !profileResult.error) {
        setProfile(profileResult.data as FriendProfile);
      }
      const effectiveStatus =
        statusResult.error || !statusResult.data
          ? null
          : (statusResult.data.effective_status as StatusValue | null);
      setStatus(effectiveStatus);
      setContextTag((statusResult.data?.context_tag as string | null) ?? null);
      setLoading(false);
    }

    fetchData();
  }, [id]);

  async function handleStartDM() {
    if (!profile) return;
    const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
      other_user_id: id,
    });
    if (error || !data) {
      Alert.alert('Error', "Couldn't open chat. Try again.");
      return;
    }
    router.push(
      `/chat/room?dm_channel_id=${data}&friend_name=${encodeURIComponent(profile.display_name)}` as never
    );
  }

  function handleRemoveFriend() {
    if (!profile || !session) return;
    Alert.alert(
      'Remove Friend',
      `Remove ${profile.display_name} from your friends? You can add them again by searching their username.`,
      [
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const myId = session.user.id;
            const { error } = await supabase
              .from('friendships')
              .delete()
              .or(
                `and(requester_id.eq.${myId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${myId})`
              );

            if (error) {
              Alert.alert('Error', "Couldn't remove friend. Try again.");
              return;
            }
            router.back();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!profile) {
    return null;
  }

  const firstName = profile.display_name.split(' ')[0];

  return (
    <>
      <Stack.Screen options={{ title: profile.display_name }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Top section */}
        <View style={styles.topSection}>
          <AvatarCircle
            size={80}
            imageUri={profile.avatar_url}
            displayName={profile.display_name}
          />
          <Text style={styles.displayName}>{profile.display_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>

          {/* Birthday row — only render when both month and day are non-null (D-10) */}
          {profile.birthday_month && profile.birthday_day ? (
            <Text style={styles.birthday}>
              {formatBirthday(profile.birthday_month, profile.birthday_day)}
            </Text>
          ) : null}

          {/* Status row — only render when effective_status is non-null (D-09) */}
          {status !== null ? (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.status[status] }]} />
              <Text style={[styles.statusText, { color: COLORS.status[status] }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
              {contextTag ? <Text style={styles.contextTag}> {contextTag}</Text> : null}
            </View>
          ) : null}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsSection}>
          <PrimaryButton title={`Message ${firstName}`} onPress={handleStartDM} />
          <TouchableOpacity style={styles.removeFriendButton} onPress={handleRemoveFriend}>
            <Text style={styles.removeFriendText}>Remove Friend</Text>
          </TouchableOpacity>
        </View>

        {/* Wish list section (D-11) */}
        <View style={styles.wishListSection}>
          <Text style={styles.sectionHeader}>WISH LIST</Text>
          {wishListLoading ? null : wishListItems.length === 0 ? (
            <Text style={styles.emptyWishList}>No wish list items.</Text>
          ) : (
            wishListItems.map((item) => (
              <WishListItem
                key={item.id}
                title={item.title}
                url={item.url}
                notes={item.notes}
                isClaimed={item.isClaimed}
                isClaimedByMe={item.isClaimedByMe}
                readOnly={true}
              />
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  topSection: {
    alignItems: 'center',
  },
  displayName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  username: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  birthday: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  statusDot: {
    width: SPACING.sm,
    height: SPACING.sm,
    borderRadius: RADII.xs,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    marginRight: 6, // no exact token
  },
  statusText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
  },
  contextTag: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  actionsSection: {
    marginTop: SPACING.xl,
  },
  removeFriendButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  removeFriendText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.interactive.destructive,
  },
  wishListSection: {
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  emptyWishList: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
});
