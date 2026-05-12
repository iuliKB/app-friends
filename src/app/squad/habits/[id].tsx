// Phase 29.1 Plan 05 — Habit detail screen.
// Route: /squad/habits/[id]
//
// Layout:
//   • ScreenHeader (truncated habit title)
//   • Cadence display: Daily / Weekly / N× per week
//   • HabitMemberStrip (only when totalCount > 1)
//   • "Mark done today" / "Mark not done today" toggle (large button)
//   • HabitCheckinHistory
//   • "Delete habit" destructive action at bottom

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { useHabitDetail } from '@/hooks/useHabitDetail';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase';
import { todayLocal } from '@/lib/dateLocal';
import { HabitMemberStrip } from '@/components/habits/HabitMemberStrip';
import { HabitCheckinHistory } from '@/components/habits/HabitCheckinHistory';
import { TILE_ACCENTS, ACCENT_FILL } from '@/components/squad/bento/tileAccents';
import type { Habit } from '@/types/habits';

function formatCadence(habit: Habit | null): string {
  if (!habit) return '';
  if (habit.cadence === 'daily') return 'Daily';
  if (habit.cadence === 'weekly') return 'Weekly';
  const target = habit.weekly_target ?? 0;
  return `${target}× per week`;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + '…';
}

export default function HabitDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = id ?? '';
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;
  const { habit, members, checkins, loading, error, refetch } = useHabitDetail(habitId);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [doneToday, setDoneToday] = useState<boolean | null>(null);

  // Derived: caller's done-today state. Computed from checkins if not yet
  // optimistically set.
  const isDoneToday = useMemo(() => {
    if (doneToday !== null) return doneToday;
    if (!userId) return false;
    const today = todayLocal();
    return checkins.some((c) => c.user_id === userId && c.date_local === today);
  }, [doneToday, userId, checkins]);

  const handleToggleDone = useCallback(async () => {
    if (toggling) return;
    setToggling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !isDoneToday;
    setDoneToday(next);
    // Cast through any: database.ts not regenerated since migration 0024
    // (same pattern as useHabits.ts in Plan 03).
    const { error: rpcErr } = await (supabase as any).rpc('toggle_habit_today_checkin', {
      p_habit_id: habitId,
      p_date_local: todayLocal(),
    });
    setToggling(false);
    if (rpcErr) {
      console.warn('toggle_habit_today_checkin failed', rpcErr);
      setDoneToday(!next);
      Alert.alert("Couldn't save", "We couldn't save your check-in. Try again.");
      return;
    }
    // Re-fetch detail so checkins/members reflect the change accurately.
    await refetch();
    setDoneToday(null);
  }, [habitId, isDoneToday, refetch, toggling]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete habit?', 'This removes all check-in history. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (deleting || !habitId) return;
          setDeleting(true);
          const { error: delErr } = await (supabase as any)
            .from('habits')
            .delete()
            .eq('id', habitId);
          setDeleting(false);
          if (delErr) {
            console.warn('habit delete failed', delErr);
            Alert.alert("Couldn't delete", delErr.message);
            return;
          }
          router.back();
        },
      },
    ]);
  }, [habitId, deleting, router]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        content: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.xxl,
          gap: SPACING.xl,
        },
        cadenceLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        cadenceValue: {
          fontSize: FONT_SIZE.xl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        toggleButton: {
          paddingVertical: SPACING.lg,
          paddingHorizontal: SPACING.lg,
          borderRadius: RADII.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: SPACING.sm,
        },
        toggleButtonPending: {
          borderWidth: 1.5,
          borderColor: TILE_ACCENTS.habits,
          backgroundColor: TILE_ACCENTS.habits + ACCENT_FILL,
        },
        toggleButtonDone: {
          backgroundColor: TILE_ACCENTS.habits,
        },
        toggleLabelPending: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: TILE_ACCENTS.habits,
        },
        toggleLabelDone: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.surface.base,
        },
        sectionLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          marginBottom: SPACING.md,
        },
        deleteButton: {
          paddingVertical: SPACING.lg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        deleteText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.interactive.destructive,
        },
        errorText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.interactive.destructive,
          padding: SPACING.lg,
          textAlign: 'center',
        },
        skeletonRow: {
          marginVertical: SPACING.sm,
        },
      }),
    [colors]
  );

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.skeletonRow}>
          <SkeletonPulse width="100%" height={42} />
        </View>
        <View style={styles.skeletonRow}>
          <SkeletonPulse width="100%" height={42} />
        </View>
        <View style={styles.skeletonRow}>
          <SkeletonPulse width="100%" height={42} />
        </View>
      </ScrollView>
    );
  }

  if (error || !habit) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.interactive.accent}
          />
        }
      >
        <Text style={styles.errorText}>
          {error ?? "Couldn't load habit. Pull down to refresh."}
        </Text>
      </ScrollView>
    );
  }

  // Members for the strip — exclude pending invitees (accepted_at is null)
  // so the "X of Y done today" reflects accepted members only.
  const acceptedMembers = members.filter((m) => m.accepted_at !== null);
  const totalCount = acceptedMembers.length;
  const today = todayLocal();
  const doneCount = acceptedMembers.filter((m) =>
    checkins.some((c) => c.user_id === m.user_id && c.date_local === today)
  ).length;

  const stripMembers = acceptedMembers.map((m) => ({
    user_id: m.user_id,
    display_name: m.display_name,
    avatar_url: m.avatar_url,
    did_check_in_today: checkins.some((c) => c.user_id === m.user_id && c.date_local === today),
  }));

  const historyMembers = acceptedMembers.map((m) => ({
    user_id: m.user_id,
    display_name: m.display_name,
    avatar_url: m.avatar_url,
  }));

  const headerTitle = truncate(habit.title, 24);
  const toggleLabel = isDoneToday ? 'Mark not done today' : 'Mark done today';

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.interactive.accent}
          />
        }
      >
        {/* Cadence */}
        <View>
          <Text style={styles.cadenceLabel}>Cadence</Text>
          <Text style={styles.cadenceValue}>{formatCadence(habit)}</Text>
        </View>

        {/* Member strip — only for group habits */}
        {totalCount > 1 && (
          <HabitMemberStrip members={stripMembers} doneCount={doneCount} totalCount={totalCount} />
        )}

        {/* Done-today toggle */}
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isDoneToday ? styles.toggleButtonDone : styles.toggleButtonPending,
          ]}
          onPress={handleToggleDone}
          disabled={toggling}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ checked: isDoneToday }}
          accessibilityLabel={toggleLabel}
        >
          {toggling ? (
            <ActivityIndicator
              size="small"
              color={isDoneToday ? colors.surface.base : TILE_ACCENTS.habits}
            />
          ) : (
            <>
              <Ionicons
                name={isDoneToday ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={isDoneToday ? colors.surface.base : TILE_ACCENTS.habits}
              />
              <Text style={isDoneToday ? styles.toggleLabelDone : styles.toggleLabelPending}>
                {toggleLabel}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* History */}
        <View>
          <Text style={styles.sectionLabel}>History</Text>
          <HabitCheckinHistory checkins={checkins} members={historyMembers} loading={false} />
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Delete habit"
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.interactive.destructive} />
          ) : (
            <Text style={styles.deleteText}>Delete habit</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}
