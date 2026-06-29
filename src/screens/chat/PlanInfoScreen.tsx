// Plan chat info & settings screen. Opened by tapping the plan chat header.
// Plan membership is RSVP-based (read-only here), so this shows a Members row
// that opens the shared members screen, shared media, a mute toggle, and a
// link to the full plan detail.

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { usePlanDetail } from '@/hooks/usePlanDetail';
import { useChatMembers } from '@/hooks/useChatMembers';
import { useChatMedia } from '@/hooks/useChatMedia';
import { useChatDmPreferences } from '@/hooks/useChatDmPreferences';
import { useChatChannelTodos } from '@/hooks/useChatChannelTodos';
import { useChatChannelExpenses } from '@/hooks/useChatChannelExpenses';
import type { ChatScope } from '@/hooks/useChatTodos';
import { GroupAvatar } from '@/components/chat/GroupAvatar';
import { SharedMediaGrid } from '@/components/chat/SharedMediaGrid';
import { SettingsRow } from '@/components/common/SettingsRow';
import { SettingsSection } from '@/components/common/SettingsSection';

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

  const scope = useMemo<ChatScope>(() => ({ kind: 'plan', planId }), [planId]);
  const { lists: todoLists } = useChatChannelTodos(scope);
  const { expenses } = useChatChannelExpenses({ planId });
  const openTodoCount = todoLists.reduce(
    (n, l) => n + l.items.filter((i) => i.completed_at === null).length,
    0
  );
  const unsettledExpenseCount = expenses.filter((e) => !e.isFullySettled).length;

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

        <SettingsSection title="ABOUT">
          <SettingsRow
            icon="people-outline"
            label="Members"
            value={String(members.length)}
            onPress={() => router.push(`/chat/members?plan_id=${planId}` as never)}
            chevron
            accessibilityLabel="View members"
          />
          <SettingsRow
            icon="calendar-outline"
            label="View plan details"
            onPress={() => router.push(`/plans/${planId}` as never)}
            chevron
            accessibilityLabel="View plan details"
          />
        </SettingsSection>

        <SettingsSection title="ACTIVITY">
          <SettingsRow
            icon="checkbox-outline"
            label="To-Dos"
            value={openTodoCount > 0 ? String(openTodoCount) : undefined}
            onPress={() => router.push(`/chat/todos?plan_id=${planId}` as never)}
            chevron
            accessibilityLabel="View to-dos"
          />
          <SettingsRow
            icon="cash-outline"
            label="Expenses"
            value={unsettledExpenseCount > 0 ? String(unsettledExpenseCount) : undefined}
            onPress={() => router.push(`/chat/expenses?plan_id=${planId}` as never)}
            chevron
            accessibilityLabel="View expenses"
          />
        </SettingsSection>

        <SettingsSection title="SHARED MEDIA">
          <View style={styles.mediaCard}>
            <SharedMediaGrid media={media} />
          </View>
        </SettingsSection>

        <SettingsSection title="SETTINGS">
          <SettingsRow
            icon="notifications-off-outline"
            label="Mute notifications"
            switchValue={isMuted}
            onToggle={(next) => muteMutation.mutate(next)}
            switchDisabled={muteMutation.isPending}
          />
        </SettingsSection>
      </ScrollView>
    </View>
  );
}
