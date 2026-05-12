import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTheme, FONT_SIZE, FONT_FAMILY, SPACING, RADII } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { CompactFriendRow } from '@/components/squad/CompactFriendRow';
import { FriendActionSheet } from '@/components/friends/FriendActionSheet';
import { BentoGrid } from '@/components/squad/bento/BentoGrid';
import { MemoriesTabContent } from '@/components/squad/MemoriesTabContent';
import { useFriends } from '@/hooks/useFriends';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import { useStreakData } from '@/hooks/useStreakData';
import { useIOUSummary } from '@/hooks/useIOUSummary';
import { useUpcomingBirthdays } from '@/hooks/useUpcomingBirthdays';
import { useHabits } from '@/hooks/useHabits';
import { useTodos } from '@/hooks/useTodos';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { computeHeartbeatState } from '@/lib/heartbeat';
import type { FriendWithStatus } from '@/hooks/useFriends';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TABS = ['Friends', 'Memories', 'Activity'] as const;

type FriendBucket = 'free' | 'maybe' | 'busy' | 'inactive';

const BUCKET_ORDER: ReadonlyArray<{ key: FriendBucket; title: string }> = [
  { key: 'free', title: 'Free' },
  { key: 'maybe', title: 'Maybe' },
  { key: 'busy', title: 'Busy' },
  { key: 'inactive', title: 'Inactive' },
];

function getFriendBucket(friend: FriendWithStatus): FriendBucket {
  const state = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);
  if (state === 'dead') return 'inactive';
  return friend.status;
}

export default function SquadScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  // Tab state
  const scrollX = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Scroll to Memories page when navigated here from the Home widget
  useEffect(() => {
    if (tab === 'memories') {
      const t = setTimeout(() => {
        pagerRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
        setActiveTab(1);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [tab]);

  // Data hooks
  const { count: pendingCount } = usePendingRequestsCount();
  const { friends, fetchFriends, removeFriend } = useFriends();
  const streak = useStreakData();
  const iouSummary = useIOUSummary();
  const birthdays = useUpcomingBirthdays();
  const habits = useHabits();
  const todos = useTodos();

  // Action sheet state
  const [selectedFriend, setSelectedFriend] = useState<FriendWithStatus | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loadingDM, setLoadingDM] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Group friends into Free / Maybe / Busy / Inactive sections, filtered by search
  const friendSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? friends.filter(
          (f) =>
            f.display_name.toLowerCase().includes(q) ||
            f.username.toLowerCase().includes(q)
        )
      : friends;

    const buckets: Record<FriendBucket, FriendWithStatus[]> = {
      free: [],
      maybe: [],
      busy: [],
      inactive: [],
    };
    for (const f of filtered) {
      buckets[getFriendBucket(f)].push(f);
    }

    return BUCKET_ORDER.map(({ key, title }) => ({
      key,
      title,
      data: buckets[key],
    })).filter((s) => s.data.length > 0);
  }, [friends, searchQuery]);

  useEffect(() => {
    fetchFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Underline indicator: translateX driven by scroll position on native thread
  // Each tab is SCREEN_WIDTH/3 wide; indicator slides to tab index × that width
  const indicatorTranslateX = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH, SCREEN_WIDTH * 2],
    outputRange: [0, SCREEN_WIDTH / 3, (SCREEN_WIDTH / 3) * 2],
    extrapolate: 'clamp',
  });

  // Tab label opacity: active tab is full opacity, inactive is dimmed
  const tab0Opacity = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH, SCREEN_WIDTH * 2],
    outputRange: [1, 0.45, 0.45],
    extrapolate: 'clamp',
  });
  const tab1Opacity = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH, SCREEN_WIDTH * 2],
    outputRange: [0.45, 1, 0.45],
    extrapolate: 'clamp',
  });
  const tab2Opacity = scrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH, SCREEN_WIDTH * 2],
    outputRange: [0.45, 0.45, 1],
    extrapolate: 'clamp',
  });
  const tabOpacities = [tab0Opacity, tab1Opacity, tab2Opacity];

  function goToTab(index: number) {
    pagerRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setActiveTab(index);
  }

  const [refreshingSquad, setRefreshingSquad] = useState(false);
  const [refreshingActivity, setRefreshingActivity] = useState(false);

  async function handleRefreshSquad() {
    setRefreshingSquad(true);
    await fetchFriends();
    setRefreshingSquad(false);
  }

  async function handleRefreshActivity() {
    setRefreshingActivity(true);
    await Promise.all([
      streak.refetch(),
      iouSummary.refetch(),
      birthdays.refetch(),
      habits.refetch(),
      todos.refetch(),
    ]);
    setRefreshingActivity(false);
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        headerContainer: {
          paddingHorizontal: SPACING.lg,
        },

        // Tab header
        tabHeader: {
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          position: 'relative',
        },
        tabButton: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: SPACING.md,
        },
        tabLabel: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        tabIndicator: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '33.33%', // exactly one third — one tab's width
          height: 2,
          backgroundColor: colors.interactive.accent,
          borderRadius: RADII.xs,
        },

        // Pager
        pager: {
          flex: 1,
        },
        page: {
          width: SCREEN_WIDTH,
          flex: 1,
        },

        // Squad tab
        listContent: {
          flexGrow: 1,
        },
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginLeft: SPACING.lg + 36 + SPACING.md,
        },
        requestsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface.card,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.lg,
          marginBottom: SPACING.sm,
          gap: SPACING.md,
        },
        requestsLabel: {
          flex: 1,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        emptyState: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: SPACING.xxl * 2,
          gap: SPACING.md,
        },
        emptyText: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.xs,
          backgroundColor: colors.surface.base,
          gap: SPACING.xs,
        },
        sectionHeaderText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5, // eslint-disable-line campfire/no-hardcoded-styles
        },
        sectionHeaderCount: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },

        // Activity tab
        activityContent: {
          padding: SPACING.lg,
          gap: SPACING.md,
        },
      }),
    [colors]
  );

  if (streak.error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
        <ErrorDisplay
          mode="screen"
          message="Couldn't load your streak."
          onRetry={streak.refetch}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={styles.headerContainer}>
        <ScreenHeader
          title="Friends"
          rightAction={
            <TouchableOpacity
              onPress={() => router.push('/friends/add')}
              accessibilityLabel="Add friend"
              accessibilityRole="button"
            >
              <Ionicons name="person-add-outline" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Tab header */}
      <View style={styles.tabHeader}>
        {TABS.map((label, index) => (
          <Pressable
            key={label}
            style={styles.tabButton}
            onPress={() => goToTab(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === index }}
          >
            <Animated.Text style={[styles.tabLabel, { opacity: tabOpacities[index] }]}>
              {label}
            </Animated.Text>
          </Pressable>
        ))}
        {/* Animated orange underline — slides on native thread */}
        <Animated.View
          style={[styles.tabIndicator, { transform: [{ translateX: indicatorTranslateX }] }]}
        />
      </View>

      {/* Paged content */}
      <Animated.ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActiveTab(page);
        }}
        style={styles.pager}
      >
        {/* ── Page 0: Friends tab ── */}
        <View style={styles.page}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search friends"
          />
          <SectionList<FriendWithStatus, { key: FriendBucket; title: string }>
            sections={friendSections}
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
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
                <Text style={styles.sectionHeaderCount}>· {section.data.length}</Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            stickySectionHeadersEnabled={false}
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
                    color={colors.text.secondary}
                  />
                  <Text style={styles.requestsLabel}>Friend Requests ({pendingCount})</Text>
                  <Ionicons name="chevron-forward" size={SPACING.lg} color={colors.border} />
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.border} />
                <Text style={styles.emptyText}>
                  {friends.length === 0
                    ? 'No friends yet'
                    : `No friends match “${searchQuery.trim()}”`}
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshingSquad}
                onRefresh={handleRefreshSquad}
                tintColor={colors.interactive.accent}
              />
            }
          />
        </View>

        {/* ── Page 1: Memories tab ── */}
        <View style={styles.page}>
          <MemoriesTabContent />
        </View>

        {/* ── Page 2: Activity tab ── */}
        <View style={styles.page}>
          <ScrollView
            contentContainerStyle={[
              styles.activityContent,
              { paddingBottom: insets.bottom + SPACING.xxl },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshingActivity}
                onRefresh={handleRefreshActivity}
                tintColor={colors.interactive.accent}
              />
            }
          >
            <BentoGrid
              iou={iouSummary}
              streak={streak}
              birthdays={birthdays}
              habits={habits}
              todos={todos}
            />
          </ScrollView>
        </View>
      </Animated.ScrollView>

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
