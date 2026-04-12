import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { SquadTabSwitcher } from '@/components/squad/SquadTabSwitcher';
import { FriendsList } from '@/screens/friends/FriendsList';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import { StreakCard } from '@/components/squad/StreakCard';
import { useStreakData } from '@/hooks/useStreakData';
import { BirthdayCard } from '@/components/squad/BirthdayCard';
import { useUpcomingBirthdays } from '@/hooks/useUpcomingBirthdays';

export default function SquadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { count: pendingCount } = usePendingRequestsCount();
  const [activeTab, setActiveTab] = useState<'friends' | 'goals'>('friends');
  const streak = useStreakData();
  const birthdays = useUpcomingBirthdays();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SquadTabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'friends' ? (
        <View style={styles.tabContent}>
          {pendingCount > 0 && (
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
          )}
          <FriendsList />
        </View>
      ) : (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.goalsScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={streak.loading}
              onRefresh={streak.refetch}
              tintColor={COLORS.interactive.accent}
            />
          }
        >
          <StreakCard streak={streak} />
          <BirthdayCard birthdays={birthdays} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  tabContent: {
    flex: 1,
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
  goalsScrollContent: {
    paddingBottom: SPACING.xxl,
  },
});
