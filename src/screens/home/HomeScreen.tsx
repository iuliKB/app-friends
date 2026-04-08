import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { FAB } from '@/components/common/FAB';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useHomeScreen } from '@/hooks/useHomeScreen';
import { useStatus } from '@/hooks/useStatus';
import { MoodPicker } from '@/components/status/MoodPicker';
import { ReEngagementBanner } from '@/components/home/ReEngagementBanner';
import { HomeFriendCard } from '@/components/home/HomeFriendCard';
import { EmptyState } from '@/components/common/EmptyState';
import type { FriendWithStatus } from '@/hooks/useFriends';

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { heartbeatState, currentStatus, loading: statusLoading } = useStatus();
  const { friends, freeFriends, otherFriends, error, refreshing, handleRefresh } = useHomeScreen();

  const countScale = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef(freeFriends.length);

  // OVR-06: 60s tick to force heartbeat re-evaluation across own + friend rows
  // without a refetch. setHeartbeatTick is enough to trigger a re-render that
  // recomputes computeHeartbeatState() in HomeFriendCard + the partition above.
  const [, setHeartbeatTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHeartbeatTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // D-27: "What's your status today?" heading appears only when the user opens
  // Home with own heartbeat already DEAD. Once they commit anything in this
  // session (or it flips back to alive/fading), the heading is suppressed for
  // the rest of the session.
  const deadOnOpenRef = useRef(heartbeatState === 'dead');
  const [hasCommittedThisSession, setHasCommittedThisSession] = useState(false);
  useEffect(() => {
    if (currentStatus && heartbeatState !== 'dead') {
      setHasCommittedThisSession(true);
    }
  }, [currentStatus, heartbeatState]);
  const showDeadHeading = deadOnOpenRef.current && !hasCommittedThisSession;

  // ReEngagementBanner "Update" → scroll the MoodPicker into view (T-02-28 accept).
  const scrollRef = useRef<ScrollView>(null);
  const moodPickerYRef = useRef(0);
  function handleUpdatePressed() {
    scrollRef.current?.scrollTo({ y: moodPickerYRef.current, animated: false });
  }

  useEffect(() => {
    if (prevCountRef.current !== freeFriends.length) {
      prevCountRef.current = freeFriends.length;
      Animated.sequence([
        Animated.timing(countScale, {
          toValue: 1.15,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(countScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [freeFriends.length, countScale]);

  const countHeading =
    freeFriends.length > 0 ? `${freeFriends.length} friends free now` : 'No friends free right now';

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.sm }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.interactive.accent}
          />
        }
      >
        {/* Screen title */}
        <View style={styles.headerContainer}>
          <ScreenHeader title="Campfire" />
        </View>

        {/* Re-engagement banner (FADING heartbeat) */}
        <ReEngagementBanner onUpdatePressed={handleUpdatePressed} />

        {/* DEAD heading on cold open (D-27) */}
        {showDeadHeading && <Text style={styles.deadHeading}>{"What's your status today?"}</Text>}

        {/* Mood picker */}
        <View
          style={styles.toggleContainer}
          onLayout={(e) => {
            moodPickerYRef.current = e.nativeEvent.layout.y;
          }}
        >
          <MoodPicker />
        </View>

        {/* Error state */}
        {error !== null && (
          <Text style={styles.errorText}>{"Couldn't load friends. Pull down to try again."}</Text>
        )}

        {/* Empty state */}
        {friends.length === 0 && !statusLoading && (
          <EmptyState
            icon="🔥"
            heading="Nobody's free right now"
            body="When friends set their status to Free, they'll show up here."
          />
        )}

        {/* Count heading */}
        {friends.length > 0 && (
          <Animated.Text
            style={[styles.countHeading, { transform: [{ scale: countScale }] }]}
            accessibilityRole="header"
          >
            {countHeading}
          </Animated.Text>
        )}

        {/* Free friends grid */}
        {freeFriends.length > 0 && (
          <FlatList<FriendWithStatus>
            data={freeFriends}
            keyExtractor={(item) => item.friend_id}
            numColumns={3}
            scrollEnabled={false}
            renderItem={({ item }) => <HomeFriendCard friend={item} />}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.gridContent}
          />
        )}

        {/* Everyone Else section */}
        {otherFriends.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{'Everyone Else'}</Text>
            <FlatList<FriendWithStatus>
              data={otherFriends}
              keyExtractor={(item) => item.friend_id}
              numColumns={3}
              scrollEnabled={false}
              renderItem={({ item }) => <HomeFriendCard friend={item} />}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.gridContent}
            />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <FAB
        icon={<Ionicons name="add" size={20} color={COLORS.surface.base} />}
        label="Start Plan"
        onPress={() => router.push('/plan-create')}
        accessibilityLabel="Create a new plan"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    paddingBottom: 100, // no exact token
  },
  headerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  toggleContainer: {
    paddingTop: 0,
    paddingBottom: SPACING.lg,
  },
  deadHeading: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  errorText: {
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  countHeading: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  columnWrapper: {
    paddingHorizontal: SPACING.sm,
  },
  gridContent: {
    paddingHorizontal: SPACING.sm,
  },
  sectionLabel: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 18, // no exact token
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
  },
});
