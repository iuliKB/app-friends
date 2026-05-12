// Phase 29.1 Plan 05 — Habits list screen.
// Route: /squad/habits (Expo Router maps habits/index.tsx → /squad/habits).
//
// Layout: ScreenHeader "Habits" → optional "Invitations" section (HabitInvitationRow
// per pending row) → FlatList of HabitRow → FAB "+ New habit".
//
// Pattern: clones src/app/squad/expenses/index.tsx shape (SafeAreaView +
// header container + FlatList + RefreshControl + FAB + skeleton/empty/error
// branches). Hook substitution: useHabits().

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { FAB } from '@/components/common/FAB';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { useHabits } from '@/hooks/useHabits';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase';
import { HabitRow } from '@/components/habits/HabitRow';
import {
  HabitInvitationRow,
  type PendingHabitInvitation,
} from '@/components/habits/HabitInvitationRow';
import type { HabitOverviewRow } from '@/types/habits';

export default function HabitsIndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const { habits, loading, error, refetch, toggleToday } = useHabits();
  const [pendingInvites, setPendingInvites] = useState<PendingHabitInvitation[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const fetchPendingInvites = useCallback(async () => {
    if (!userId) {
      setPendingInvites([]);
      return;
    }
    setInvitesLoading(true);
    // habits.created_by references auth.users(id), so PostgREST cannot embed
    // public.profiles directly. Two-step fetch: invites → habits → profiles
    // (same pattern as useGroupMembers / useHabitDetail).
    const { data: inviteRows, error: queryErr } = await (supabase as any)
      .from('habit_members')
      .select('habit_id, habits!inner(id, title, cadence, created_by)')
      .is('accepted_at', null)
      .eq('user_id', userId);
    if (queryErr) {
      console.warn('pending habit invitations fetch failed', queryErr);
      setInvitesLoading(false);
      setPendingInvites([]);
      return;
    }
    const invites = ((inviteRows ?? []) as unknown[]).map((row) => {
      const r = row as {
        habit_id: string;
        habits?: {
          id: string;
          title: string;
          cadence: 'daily' | 'weekly' | 'n_per_week';
          created_by: string;
        } | null;
      };
      return {
        habit_id: r.habit_id,
        title: r.habits?.title ?? '(Untitled habit)',
        cadence: (r.habits?.cadence ?? 'daily') as PendingHabitInvitation['cadence'],
        inviter_id: r.habits?.created_by ?? null,
      };
    });

    let inviterNameById: Record<string, string> = {};
    const inviterIds = invites.map((i) => i.inviter_id).filter((v): v is string => !!v);
    if (inviterIds.length > 0) {
      const { data: profileRows, error: profErr } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', inviterIds);
      if (profErr) {
        console.warn('inviter profiles fetch failed', profErr);
      } else {
        inviterNameById = Object.fromEntries(
          (((profileRows ?? []) as unknown) as Array<{ id: string; display_name: string | null }>).map(
            (p) => [p.id, p.display_name ?? 'A friend']
          )
        );
      }
    }

    setPendingInvites(
      invites.map((i) => ({
        habit_id: i.habit_id,
        title: i.title,
        cadence: i.cadence,
        inviter_name: (i.inviter_id && inviterNameById[i.inviter_id]) || 'A friend',
      }))
    );
    setInvitesLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchPendingInvites();
  }, [fetchPendingInvites]);

  // Re-fetch on screen focus so accepting/declining invitations elsewhere reflects here.
  useFocusEffect(
    useCallback(() => {
      void refetch();
      void fetchPendingInvites();
    }, [refetch, fetchPendingInvites])
  );

  const handleRowPress = useCallback(
    (habitId: string) => {
      router.push({
        pathname: '/squad/habits/[id]' as never,
        params: { id: habitId },
      } as never);
    },
    [router]
  );

  const handleToggle = useCallback(
    async (habitId: string) => {
      const result = await toggleToday(habitId);
      return result;
    },
    [toggleToday]
  );

  const handleInviteResolved = useCallback(async () => {
    // After accept/decline, refresh both invitations and the habit list.
    await Promise.all([fetchPendingInvites(), refetch()]);
  }, [fetchPendingInvites, refetch]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        headerContainer: { paddingHorizontal: SPACING.lg },
        listContent: { paddingTop: SPACING.md, paddingBottom: SPACING.xxl },
        emptyContainer: { flex: 1 },
        sectionHeader: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.sm,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
        },
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginHorizontal: SPACING.lg,
        },
        errorText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.interactive.destructive,
          padding: SPACING.lg,
          textAlign: 'center',
        },
        skeletonRow: {
          marginHorizontal: SPACING.lg,
          marginVertical: SPACING.sm,
        },
      }),
    [colors]
  );

  function renderInvitationsSection() {
    if (invitesLoading) return null;
    if (pendingInvites.length === 0) return null;
    return (
      <View>
        <Text style={styles.sectionHeader}>Invitations · {pendingInvites.length}</Text>
        {pendingInvites.map((invite) => (
          <HabitInvitationRow
            key={invite.habit_id}
            habit={invite}
            onAccept={handleInviteResolved}
            onDecline={handleInviteResolved}
          />
        ))}
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <ScreenHeader title="Habits" />
        </View>
        {[0, 1, 2].map((n) => (
          <View key={n} style={styles.skeletonRow}>
            <SkeletonPulse width="100%" height={56} />
          </View>
        ))}
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <ScreenHeader title="Habits" />
        </View>
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={colors.interactive.accent}
              accessibilityLabel="Refresh habits"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="warning-outline"
              iconType="ionicons"
              heading="Couldn't load habits"
              body="Check your connection and try again."
              ctaLabel="Retry"
              onCta={() => {
                void refetch();
                void fetchPendingInvites();
              }}
            />
          }
        />
      </SafeAreaView>
    );
  }

  const hasHabits = habits.length > 0;
  const hasInvites = pendingInvites.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <ScreenHeader title="Habits" />
      </View>
      <FlatList<HabitOverviewRow>
        data={habits}
        keyExtractor={(item) => item.habit_id}
        renderItem={({ item }) => (
          <HabitRow habit={item} onToggle={handleToggle} onPress={handleRowPress} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={renderInvitationsSection()}
        contentContainerStyle={
          !hasHabits && !hasInvites ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void refetch();
              void fetchPendingInvites();
            }}
            tintColor={colors.interactive.accent}
            accessibilityLabel="Refresh habits"
          />
        }
        ListEmptyComponent={
          !hasInvites ? (
            <EmptyState
              icon="checkmark-done-outline"
              iconType="ionicons"
              heading="No habits yet"
              body="Pick something you want to do regularly. Solo or with friends."
              ctaLabel="Add a habit"
              onCta={() => router.push('/squad/habits/create' as never)}
            />
          ) : null
        }
      />
      <FAB
        icon={<Ionicons name="add" size={22} color={colors.surface.base} />}
        label="New habit"
        onPress={() => router.push('/squad/habits/create' as never)}
        accessibilityLabel="New habit"
      />
    </SafeAreaView>
  );
}
