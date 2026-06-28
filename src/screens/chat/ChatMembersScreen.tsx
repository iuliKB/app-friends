// Dedicated members screen for group + plan chats.
//   • Group scope: full member list with Add (any member → add_group_members
//     RPC, which also posts a system message) and Remove (creator only, via the
//     0028 delete policy).
//   • Plan scope: read-only member list (RSVP-based membership).

import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useGroupDetail } from '@/hooks/useGroupDetail';
import { useChatMembers } from '@/hooks/useChatMembers';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { AddMembersModal } from '@/components/chat/AddMembersModal';

interface ChatMembersScreenProps {
  groupChannelId?: string;
  planId?: string;
}

interface MemberRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export function ChatMembersScreen({ groupChannelId, planId }: ChatMembersScreenProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? '';
  const [addVisible, setAddVisible] = useState(false);

  // Group scope
  const { members: groupMembers, refetch: refetchGroup } = useGroupMembers(groupChannelId ?? null);
  const { detail } = useGroupDetail(groupChannelId ?? null);
  // Plan scope
  const { members: planMembers } = useChatMembers(planId ? { kind: 'plan', planId } : null);

  const isGroup = !!groupChannelId;
  const isCreator = isGroup && !!detail && detail.createdBy === userId;

  const members: MemberRow[] = useMemo(() => {
    if (isGroup) return groupMembers;
    return planMembers.map((m) => ({
      id: m.user_id,
      display_name: m.display_name,
      avatar_url: m.avatar_url,
    }));
  }, [isGroup, groupMembers, planMembers]);

  const addMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      // Cast through any: add_group_members not in database.ts yet (migration 0029).
      const { error } = await (supabase as any).rpc('add_group_members', {
        p_group_channel_id: groupChannelId,
        p_member_ids: memberIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAddVisible(false);
      void refetchGroup();
      // Surface the "X invited Y" system message in the open thread + list.
      if (groupChannelId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.chat.messages(groupChannelId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) });
    },
    onError: () => Alert.alert('Error', "Couldn't add members. Try again."),
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('group_channel_members')
        .delete()
        .eq('group_channel_id', groupChannelId ?? '')
        .eq('user_id', memberId);
      if (error) throw error;
    },
    onSuccess: () => void refetchGroup(),
    onError: () => Alert.alert('Error', "Couldn't remove the member. Try again."),
  });

  function confirmRemove(memberId: string, name: string) {
    Alert.alert('Remove member?', `Remove ${name} from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(memberId) },
    ]);
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        content: { paddingVertical: SPACING.lg },
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
          minHeight: 56,
        },
        rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
        name: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        addLabel: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.interactive.accent,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Group Members' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {isGroup && (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.6}
              onPress={() => setAddVisible(true)}
              accessibilityLabel="Add members"
            >
              <Ionicons name="person-add-outline" size={22} color={colors.interactive.accent} />
              <Text style={styles.addLabel}>Add members</Text>
            </TouchableOpacity>
          )}
          {members.map((m, i) => (
            <View key={m.id} style={[styles.row, (i > 0 || isGroup) && styles.rowBorder]}>
              <AvatarCircle size={40} imageUri={m.avatar_url} displayName={m.display_name} />
              <Text style={styles.name} numberOfLines={1}>
                {m.display_name}
                {isGroup && m.id === detail?.createdBy ? ' · Admin' : ''}
              </Text>
              {isCreator && m.id !== userId && (
                <TouchableOpacity
                  onPress={() => confirmRemove(m.id, m.display_name)}
                  accessibilityLabel={`Remove ${m.display_name}`}
                  hitSlop={8}
                >
                  <Ionicons
                    name="remove-circle-outline"
                    size={22}
                    color={colors.interactive.destructive}
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {isGroup && (
        <AddMembersModal
          visible={addVisible}
          onClose={() => setAddVisible(false)}
          existingMemberIds={members.map((m) => m.id)}
          onAdd={(ids) => addMutation.mutate(ids)}
          submitting={addMutation.isPending}
        />
      )}
    </View>
  );
}
