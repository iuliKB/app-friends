// Mutual plans list — opened from friend profile MUTUAL section.
// Filters usePlans() by useFriendMutuals().sharedPlanIds and renders PlanCard list.
// Tap → /plans/[id].

import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { usePlans } from '@/hooks/usePlans';
import { useFriendMutuals } from '@/hooks/useFriendMutuals';
import { useFriendProfile } from '@/hooks/useFriendProfile';
import { PlanCard } from '@/components/plans/PlanCard';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import type { PlanWithMembers } from '@/types/plans';

export default function MutualPlansScreen() {
  const { colors } = useTheme();
  const localRouter = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const friendId = (Array.isArray(params.id) ? params.id[0] : (params.id ?? '')) ?? '';

  const { plans, loading: plansLoading, error: plansError } = usePlans();
  const {
    data: mutuals,
    isLoading: mutualsLoading,
    error: mutualsError,
  } = useFriendMutuals(friendId);
  const { data: friendData } = useFriendProfile(friendId);

  const headerTitle = friendData?.profile?.display_name
    ? `Plans with ${friendData.profile.display_name.split(' ')[0]}`
    : 'Mutual plans';

  const filteredPlans: PlanWithMembers[] = useMemo(() => {
    const sharedSet = new Set(mutuals?.sharedPlanIds ?? []);
    return plans.filter((p) => sharedSet.has(p.id));
  }, [plans, mutuals]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        listContent: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.xxl,
          gap: SPACING.md,
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
    [colors]
  );

  const isLoading = plansLoading || mutualsLoading;
  const error = plansError || mutualsError;

  if (isLoading && filteredPlans.length === 0) {
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
            message="Couldn't load plans. Check your connection and try again."
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      {filteredPlans.length === 0 ? (
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.emptyHeading}>No mutual plans yet</Text>
          <Text style={styles.emptyBody}>
            When you both join the same plan, it&apos;ll appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.container}
          contentContainerStyle={styles.listContent}
          data={filteredPlans}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PlanCard plan={item} onPress={() => localRouter.push(`/plans/${item.id}` as never)} />
          )}
        />
      )}
    </>
  );
}
