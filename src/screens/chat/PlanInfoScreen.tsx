// Plan chat info & settings screen. Opened by tapping the plan chat header.
// Plan membership is RSVP-based (read-only here), so this shows a Members row
// that opens the shared members screen, shared media, a mute toggle, and a
// link to the full plan detail.

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { usePlanDetail } from '@/hooks/usePlanDetail';
import { useChatMembers } from '@/hooks/useChatMembers';
import { useChatMedia } from '@/hooks/useChatMedia';
import { useChatDmPreferences } from '@/hooks/useChatDmPreferences';
import { GroupAvatar } from '@/components/chat/GroupAvatar';
import { SharedMediaGrid } from '@/components/chat/SharedMediaGrid';

interface PlanInfoScreenProps {
  planId: string;
}

export function PlanInfoScreen({ planId }: PlanInfoScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? '';

  const { plan } = usePlanDetail(planId);
  const { members } = useChatMembers({ kind: 'plan', planId });
  const { media } = useChatMedia({ kind: 'plan', planId });
  const { data: prefs, refetch: refetchPrefs } = useChatDmPreferences(planId, 'plan');
  const isMuted = prefs?.isMuted ?? false;

  const muteMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase.from('chat_preferences').upsert(
        {
          user_id: userId,
          chat_type: 'plan',
          chat_id: planId,
          is_muted: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,chat_type,chat_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void refetchPrefs();
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) });
    },
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        content: { paddingBottom: SPACING.xxl },
        header: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.md },
        name: {
          fontSize: FONT_SIZE.xl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          textAlign: 'center',
          paddingHorizontal: SPACING.lg,
        },
        sectionTitle: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.xs,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        sectionWrapper: { marginTop: SPACING.xl },
        card: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          overflow: 'hidden',
          marginHorizontal: SPACING.lg,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          gap: SPACING.md,
          minHeight: 52,
        },
        rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
        rowLabel: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        countText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        mediaCard: { marginHorizontal: SPACING.lg, marginTop: SPACING.xs },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Plan Info' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <GroupAvatar variant="plan" size={96} />
          <Text style={styles.name}>{plan?.title ?? ''}</Text>
        </View>

        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.6}
              onPress={() => router.push(`/chat/members?plan_id=${planId}` as never)}
              accessibilityLabel="View members"
            >
              <Ionicons name="people-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.rowLabel}>Members</Text>
              <Text style={styles.countText}>{members.length}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              activeOpacity={0.6}
              onPress={() => router.push(`/plans/${planId}` as never)}
              accessibilityLabel="View plan details"
            >
              <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.rowLabel}>View plan details</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionTitle}>Shared Media</Text>
          <View style={styles.mediaCard}>
            <SharedMediaGrid media={media} />
          </View>
        </View>

        <View style={styles.sectionWrapper}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="notifications-off-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.rowLabel}>Mute notifications</Text>
              <Switch
                value={isMuted}
                onValueChange={(next) => muteMutation.mutate(next)}
                disabled={muteMutation.isPending}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
