// Phase 29.1 Plan 05 — HabitInvitationRow.
// Row for a pending group-habit invitation. Title + inviter caption +
// Accept (primary) + Decline (secondary).
//
// Accept: UPDATE habit_members SET accepted_at = now() WHERE habit_id, user_id.
// Decline: DELETE FROM habit_members WHERE habit_id, user_id.
// RLS (Plan 01) gates user_id = auth.uid().

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { HabitCadence } from '@/types/habits';

export interface PendingHabitInvitation {
  habit_id: string;
  title: string;
  cadence: HabitCadence;
  inviter_name: string;
}

interface HabitInvitationRowProps {
  habit: PendingHabitInvitation;
  onAccept: () => Promise<void> | void;
  onDecline: () => Promise<void> | void;
}

export function HabitInvitationRow({ habit, onAccept, onDecline }: HabitInvitationRowProps) {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          padding: SPACING.lg,
          marginHorizontal: SPACING.lg,
          marginBottom: SPACING.md,
          borderWidth: 1,
          borderColor: colors.border,
          gap: SPACING.md,
        },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        caption: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        actions: {
          flexDirection: 'row',
          gap: SPACING.md,
        },
        button: {
          flex: 1,
          paddingVertical: SPACING.md,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: RADII.md,

          minHeight: 44,
        },
        acceptButton: {
          backgroundColor: colors.interactive.accent,
        },
        declineButton: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        },
        acceptText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.surface.base,
        },
        declineText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
        },
        disabled: { opacity: 0.5 },
      }),
    [colors]
  );

  async function handleAccept() {
    if (busy) return;
    const userId = session?.user?.id;
    if (!userId) return;
    setBusy('accept');
    // Cast through any: database.ts not regenerated since migration 0024
    // (same pattern as useHabitDetail.ts and useChatRoom.create_poll).
    const { error } = await (supabase as any)
      .from('habit_members')
      .update({ accepted_at: new Date().toISOString() })
      .eq('habit_id', habit.habit_id)
      .eq('user_id', userId);
    setBusy(null);
    if (!error) {
      await onAccept();
    } else {
      console.warn('habit invite accept failed', error);
    }
  }

  async function handleDecline() {
    if (busy) return;
    const userId = session?.user?.id;
    if (!userId) return;
    setBusy('decline');
    const { error } = await (supabase as any)
      .from('habit_members')
      .delete()
      .eq('habit_id', habit.habit_id)
      .eq('user_id', userId);
    setBusy(null);
    if (!error) {
      await onDecline();
    } else {
      console.warn('habit invite decline failed', error);
    }
  }

  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.title} numberOfLines={2}>
          {habit.title}
        </Text>
        <Text style={styles.caption}>{habit.inviter_name} invited you</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.declineButton, busy ? styles.disabled : null]}
          onPress={handleDecline}
          disabled={!!busy}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Decline invitation to ${habit.title}`}
        >
          {busy === 'decline' ? (
            <ActivityIndicator size="small" color={colors.text.secondary} />
          ) : (
            <Text style={styles.declineText}>Decline</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.acceptButton, busy ? styles.disabled : null]}
          onPress={handleAccept}
          disabled={!!busy}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Accept invitation to ${habit.title}`}
        >
          {busy === 'accept' ? (
            <ActivityIndicator size="small" color={colors.surface.base} />
          ) : (
            <Text style={styles.acceptText}>Accept</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
