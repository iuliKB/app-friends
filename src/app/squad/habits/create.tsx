// Phase 29.1 Plan 05 — Habit create screen.
// Route: /squad/habits/create
//
// Form:
//   1. Title input (max 80 chars)
//   2. Cadence picker (HabitCadencePicker)
//   3. Member picker — "Just me" (default) / "With friends"
//   4. Primary CTA "Create habit" — invokes `create_habit` RPC
//
// Pattern: clones src/app/squad/expenses/create.tsx (ScrollView form, useTheme,
// useMemo([colors]) styles, PrimaryButton, friend-row picker via useFriends).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { EmptyState } from '@/components/common/EmptyState';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { HabitCadencePicker, type HabitCadenceValue } from '@/components/habits/HabitCadencePicker';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';

const MAX_TITLE_LEN = 80;

type Mode = 'solo' | 'group';

export default function HabitCreateScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { friends, fetchFriends, loadingFriends } = useFriends();

  const [title, setTitle] = useState('');
  const [cadenceValue, setCadenceValue] = useState<HabitCadenceValue>({
    cadence: 'daily',
    weeklyTarget: null,
  });
  const [mode, setMode] = useState<Mode>('solo');
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Lazy-load friends when "With friends" is selected.
  useEffect(() => {
    if (mode === 'group' && friends.length === 0 && !loadingFriends) {
      void fetchFriends();
    }
  }, [mode, friends.length, loadingFriends, fetchFriends]);

  const toggleFriend = useCallback((friendId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  }, []);

  const handleModeChange = useCallback((nextMode: Mode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMode(nextMode);
    if (nextMode === 'solo') {
      setSelectedFriendIds(new Set());
    }
  }, []);

  const trimmedTitle = title.trim();
  const canSubmit =
    trimmedTitle.length > 0 &&
    (mode === 'solo' || selectedFriendIds.size > 0) &&
    (cadenceValue.cadence !== 'n_per_week' ||
      (cadenceValue.weeklyTarget !== null && cadenceValue.weeklyTarget >= 1));

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const memberIds = mode === 'group' ? Array.from(selectedFriendIds) : null;
    // Cast through any: database.ts not regenerated since migration 0024.
    const { error } = await (supabase as any).rpc('create_habit', {
      p_title: trimmedTitle,
      p_cadence: cadenceValue.cadence,
      p_weekly_target: cadenceValue.cadence === 'n_per_week' ? cadenceValue.weeklyTarget : null,
      p_member_ids: memberIds,
    });
    setSubmitting(false);
    if (error) {
      console.warn('create_habit failed', error);
      const msg = error.message ?? 'Try again.';
      setSubmitError(msg);
      Alert.alert("Couldn't create habit", msg);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  }, [canSubmit, submitting, mode, selectedFriendIds, trimmedTitle, cadenceValue, router]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        content: {
          padding: SPACING.lg,
          paddingBottom: SPACING.xxl,
          gap: SPACING.xl,
        },
        sectionLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          marginBottom: SPACING.sm,
        },
        textInput: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.md,
          padding: SPACING.lg,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
          borderWidth: 1,
          borderColor: colors.border,
        },
        modeRow: {
          flexDirection: 'row',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.md,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          padding: 4,
        },
        modeSegment: {
          flex: 1,
          paddingVertical: SPACING.sm,
          alignItems: 'center',
          borderRadius: RADII.md,
        },
        modeActive: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: '#ffffff14',
        },
        modeLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
        },
        modeLabelActive: {
          color: colors.text.primary,
        },
        friendsList: {
          marginTop: SPACING.md,
          gap: SPACING.sm,
        },
        friendRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.md,
          gap: SPACING.sm,

          minHeight: 44,
        },
        friendName: {
          flex: 1,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        selectedCount: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginTop: SPACING.xs,
        },
        errorText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.interactive.destructive,
        },
        loadingRow: {
          paddingVertical: SPACING.lg,
          alignItems: 'center',
        },
      }),
    [colors]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <View>
        <Text style={styles.sectionLabel}>Habit title</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={(t) => setTitle(t.slice(0, MAX_TITLE_LEN))}
          placeholder="e.g. Read 30 min, Gym session"
          placeholderTextColor={colors.text.secondary}
          maxLength={MAX_TITLE_LEN}
          accessibilityLabel="Habit title"
        />
      </View>

      {/* Cadence */}
      <View>
        <Text style={styles.sectionLabel}>How often?</Text>
        <HabitCadencePicker value={cadenceValue} onChange={setCadenceValue} />
      </View>

      {/* Solo / With friends */}
      <View>
        <Text style={styles.sectionLabel}>Solo or with friends?</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeSegment, mode === 'solo' && styles.modeActive]}
            onPress={() => handleModeChange('solo')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'solo' }}
            accessibilityLabel="Just me"
          >
            <Text style={[styles.modeLabel, mode === 'solo' && styles.modeLabelActive]}>
              Just me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeSegment, mode === 'group' && styles.modeActive]}
            onPress={() => handleModeChange('group')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'group' }}
            accessibilityLabel="With friends"
          >
            <Text style={[styles.modeLabel, mode === 'group' && styles.modeLabelActive]}>
              With friends
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'group' && (
          <View style={styles.friendsList}>
            {loadingFriends ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.interactive.accent} />
              </View>
            ) : friends.length === 0 ? (
              <EmptyState
                icon="people-outline"
                iconType="ionicons"
                heading="No friends yet"
                body="Add friends first to invite them to a habit."
              />
            ) : (
              <>
                <Text style={styles.selectedCount}>
                  {selectedFriendIds.size === 0
                    ? "Pick people who'll join this habit"
                    : `${selectedFriendIds.size} selected`}
                </Text>
                {friends.map((f) => {
                  const selected = selectedFriendIds.has(f.friend_id);
                  return (
                    <TouchableOpacity
                      key={f.friend_id}
                      style={styles.friendRow}
                      onPress={() => toggleFriend(f.friend_id)}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`Invite ${f.display_name}`}
                    >
                      <AvatarCircle
                        size={36}
                        imageUri={f.avatar_url}
                        displayName={f.display_name}
                      />
                      <Text style={styles.friendName}>{f.display_name}</Text>
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={selected ? colors.interactive.accent : colors.text.secondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}
      </View>

      {/* Submit */}
      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
      <PrimaryButton
        title="Create habit"
        onPress={handleSubmit}
        loading={submitting}
        disabled={!canSubmit || submitting}
      />
    </ScrollView>
  );
}
