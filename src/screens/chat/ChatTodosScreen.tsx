// Dedicated "To-Dos" screen reached from the chat info screens (DM + group),
// mirroring how Group Members lives on its own screen. Keeps the info screen
// uncluttered — the full per-item list + "New to-do" composer live here.

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme, SPACING } from '@/theme';
import { useAuthStore } from '@/stores/useAuthStore';
import { useChatMembers } from '@/hooks/useChatMembers';
import { ChatInfoTodosSection } from '@/components/chat/ChatInfoTodosSection';
import type { ChatScope } from '@/hooks/useChatTodos';

interface ChatTodosScreenProps {
  groupChannelId?: string;
  dmChannelId?: string;
  planId?: string;
}

export function ChatTodosScreen({ groupChannelId, dmChannelId, planId }: ChatTodosScreenProps) {
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.session?.user?.id ?? '');

  const scope = useMemo<ChatScope | null>(() => {
    if (groupChannelId) return { kind: 'group', groupChannelId };
    if (dmChannelId) return { kind: 'dm', dmChannelId };
    if (planId) return { kind: 'plan', planId };
    return null;
  }, [groupChannelId, dmChannelId, planId]);

  const { members } = useChatMembers(scope);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        content: { paddingBottom: SPACING.xxl },
      }),
    [colors]
  );

  if (!scope) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'To-Dos' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ChatInfoTodosSection scope={scope} members={members} currentUserId={userId} />
      </ScrollView>
    </View>
  );
}
