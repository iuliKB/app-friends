import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { CompactFriendRow } from '@/components/squad/CompactFriendRow';
import { FriendActionSheet } from '@/components/friends/FriendActionSheet';
import { StreakCard } from '@/components/squad/StreakCard';
import { IOUCard } from '@/components/squad/IOUCard';
import { BirthdayCard } from '@/components/squad/BirthdayCard';
import { useFriends } from '@/hooks/useFriends';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import { useStreakData } from '@/hooks/useStreakData';
import { useIOUSummary } from '@/hooks/useIOUSummary';
import { useUpcomingBirthdays } from '@/hooks/useUpcomingBirthdays';
import type { FriendWithStatus } from '@/hooks/useFriends';

// NOTE: The add-friend FAB (was inside FriendsList) is not present in this dashboard.
// This is an intentional regression for v1.4. Add-friend is reachable via Profile > QR Code
// or direct navigation to /friends/add. The "+" header button is reserved for create expense.

export default function SquadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { count: pendingCount } = usePendingRequestsCount();
  const { friends, fetchFriends, removeFriend } = useFriends();
  const [selectedFriend, setSelectedFriend] = useState<FriendWithStatus | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loadingDM, setLoadingDM] = useState(false);
  const streak = useStreakData();
  const iouSummary = useIOUSummary();
  const birthdays = useUpcomingBirthdays();

  // Entrance animation — fires only on first mount, NOT on pull-to-refresh
  // Per STATE.md D-04: isInteraction: false avoids blocking JS thread
  const streakAnim = useRef(new Animated.Value(0)).current;
  const iouAnim = useRef(new Animated.Value(0)).current;
  const birthdayAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = [streakAnim, iouAnim, birthdayAnim];
  const hasAnimated = useRef(false);

  useEffect(() => {
    fetchFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    Animated.stagger(
      80,
      cardAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          isInteraction: false,
        })
      )
    ).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentional: fires once on mount

  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      streak.refetch(),
      iouSummary.refetch(),
      birthdays.refetch(),
      fetchFriends(),
    ]);
    setRefreshing(false);
    // hasAnimated.current intentionally NOT reset — animations never replay on refresh (DASH-03)
  }

  function handleCloseSheet() {
    setSheetVisible(false);
    setSelectedFriend(null);
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

  async function handleRemoveFriend() {
    if (!selectedFriend) return;
    const { error } = await removeFriend(selectedFriend.friend_id);
    if (error) {
      Alert.alert('Error', "Couldn't remove friend. Try again.");
    } else {
      fetchFriends();
    }
  }

  function AnimatedCard({ anim, children }: { anim: Animated.Value; children: React.ReactNode }) {
    return (
      <Animated.View
        style={{
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        }}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Squad"
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/squad/expenses/create' as never)}
            accessibilityLabel="Create expense"
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={FONT_SIZE.xxl} color={COLORS.interactive.accent} />
          </TouchableOpacity>
        }
      />
      <FlatList<FriendWithStatus>
        data={friends}
        keyExtractor={(item) => item.friend_id}
        renderItem={({ item }) => (
          <CompactFriendRow
            friend={item}
            onPress={() => {
              setSelectedFriend(item);
              setSheetVisible(true);
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          pendingCount > 0 ? (
            <TouchableOpacity
              style={styles.requestsRow}
              onPress={() => router.push('/friends/requests')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person-add-outline"
                size={FONT_SIZE.xl}
                color={COLORS.text.secondary}
              />
              <Text style={styles.requestsLabel}>Friend Requests ({pendingCount})</Text>
              <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.border} />
            </TouchableOpacity>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.cardsSection}>
            <AnimatedCard anim={streakAnim}>
              <StreakCard streak={streak} />
            </AnimatedCard>
            <AnimatedCard anim={iouAnim}>
              <IOUCard summary={iouSummary} />
            </AnimatedCard>
            <AnimatedCard anim={birthdayAnim}>
              <BirthdayCard birthdays={birthdays} />
            </AnimatedCard>
            <View style={{ height: SPACING.xxl + insets.bottom }} />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.interactive.accent}
          />
        }
        contentContainerStyle={styles.listContent}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  listContent: {
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.lg + 36 + SPACING.md, // avatar width + gap — aligns with name text
  },
  requestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  requestsLabel: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  cardsSection: {
    paddingTop: SPACING.xl,
    gap: SPACING.md,
  },
});
