import React, { useRef, useEffect } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { useHomeScreen } from '@/hooks/useHomeScreen';
import { useStatus } from '@/hooks/useStatus';
import { SegmentedControl } from '@/components/status/SegmentedControl';
import { HomeFriendCard } from '@/components/home/HomeFriendCard';
import { EmptyState } from '@/components/common/EmptyState';
import type { FriendWithStatus } from '@/hooks/useFriends';
import type { StatusValue } from '@/types/app';

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, loading: statusLoading, saving, updateStatus } = useStatus();
  const { friends, freeFriends, otherFriends, error, refreshing, handleRefresh } = useHomeScreen();

  const countScale = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef(freeFriends.length);

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

  async function handleStatusChange(newStatus: StatusValue) {
    const { error: statusError } = await updateStatus(newStatus);
    if (statusError) Alert.alert('Error', "Couldn't update status. Try again.");
  }

  const countHeading =
    freeFriends.length > 0 ? `${freeFriends.length} friends free now` : 'No friends free right now';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.textSecondary}
          />
        }
      >
        {/* Status toggle */}
        <View style={styles.toggleContainer}>
          <SegmentedControl value={status} onValueChange={handleStatusChange} saving={saving} />
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
              renderItem={({ item }) => <HomeFriendCard friend={item} showStatusPill />}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.gridContent}
            />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => router.push('/plan-create')}
        activeOpacity={0.8}
        accessibilityLabel="Start Plan"
      >
        <Ionicons name="add" size={20} color={COLORS.dominant} />
        <Text style={styles.fabLabel}>{'Start Plan'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  toggleContainer: {
    paddingTop: 0,
    paddingBottom: 16,
  },
  errorText: {
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  countHeading: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  columnWrapper: {
    paddingHorizontal: 8,
  },
  gridContent: {
    paddingHorizontal: 8,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 16,
  },
  fab: {
    position: 'absolute',
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabLabel: {
    color: COLORS.dominant,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
  },
});
