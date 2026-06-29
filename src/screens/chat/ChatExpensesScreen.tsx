// Dedicated "Expenses" screen reached from the chat info screens (DM + group).
// DM expenses come from the shared-with-friend query; group expenses from the
// channel-tagged query (migration 0032). Kept off the info screen so it stays
// uncluttered.

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme, SPACING } from '@/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useExpensesWithFriend } from '@/hooks/useExpensesWithFriend';
import { useChatChannelExpenses } from '@/hooks/useChatChannelExpenses';
import { ChatInfoExpensesSection } from '@/components/chat/ChatInfoExpensesSection';

interface ChatExpensesScreenProps {
  groupChannelId?: string;
  planId?: string;
  friendId?: string;
}

export function ChatExpensesScreen({ groupChannelId, planId, friendId }: ChatExpensesScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user?.id ?? '');

  // Exactly one source is active depending on entry point; the others stay
  // disabled (empty id) and return an empty list.
  const friendExpenses = useExpensesWithFriend(friendId ?? '');
  const channelExpenses = useChatChannelExpenses(
    planId ? { planId } : { groupChannelId: groupChannelId ?? '' }
  );
  const source = groupChannelId || planId ? channelExpenses : friendExpenses;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        content: { paddingBottom: SPACING.xxl },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Expenses' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ChatInfoExpensesSection
          expenses={source.expenses}
          loading={source.loading}
          currentUserId={userId}
          onOpen={(id) => router.push(`/squad/expenses/${id}` as never)}
          onCreate={() =>
            router.push(
              planId
                ? (`/squad/expenses/create?plan_id=${planId}` as never)
                : groupChannelId
                  ? (`/squad/expenses/create?group_channel_id=${groupChannelId}` as never)
                  : ('/squad/expenses/create' as never)
            )
          }
        />
      </ScrollView>
    </View>
  );
}
