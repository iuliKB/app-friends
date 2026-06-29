// Group chat info & settings screen. Opened by tapping the group header in
// ChatRoomScreen. Shows group avatar + name, a "Group Members" row (full list +
// add/remove live on the dedicated members screen), shared media, and settings.
// Rename is creator-only (RLS 0028); Mute + Leave are available to every member
// (migrations 0022 + chat_preferences).

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { useGroupDetail } from '@/hooks/useGroupDetail';
import { useChatMedia } from '@/hooks/useChatMedia';
import { useChatDmPreferences } from '@/hooks/useChatDmPreferences';
import { useChatChannelTodos } from '@/hooks/useChatChannelTodos';
import { useChatChannelExpenses } from '@/hooks/useChatChannelExpenses';
import type { ChatScope } from '@/hooks/useChatTodos';
import { GroupAvatar } from '@/components/chat/GroupAvatar';
import { SharedMediaGrid } from '@/components/chat/SharedMediaGrid';
import { SettingsRow } from '@/components/common/SettingsRow';
import { SettingsSection } from '@/components/common/SettingsSection';

interface GroupInfoScreenProps {
  groupChannelId: string;
  birthdayPersonId?: string;
}

export function GroupInfoScreen({ groupChannelId, birthdayPersonId }: GroupInfoScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? '';

  const { detail, refetch: refetchDetail } = useGroupDetail(groupChannelId);
  const { members } = useGroupMembers(groupChannelId);
  const { media } = useChatMedia({ kind: 'group', groupChannelId });
  const { data: prefs, refetch: refetchPrefs } = useChatDmPreferences(groupChannelId, 'group');
  const isMuted = prefs?.isMuted ?? false;

  const scope = useMemo<ChatScope>(() => ({ kind: 'group', groupChannelId }), [groupChannelId]);
  const { lists: todoLists } = useChatChannelTodos(scope);
  const { expenses } = useChatChannelExpenses({ groupChannelId });
  const openTodoCount = todoLists.reduce(
    (n, l) => n + l.items.filter((i) => i.completed_at === null).length,
    0
  );
  const unsettledExpenseCount = expenses.filter((e) => !e.isFullySettled).length;

  const isCreator = !!detail && detail.createdBy === userId;
  const isBirthday = !!(birthdayPersonId ?? detail?.birthdayPersonId);

  const [renameVisible, setRenameVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  function invalidateChatList() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) });
  }

  const muteMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase.from('chat_preferences').upsert(
        {
          user_id: userId,
          chat_type: 'group',
          chat_id: groupChannelId,
          is_muted: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,chat_type,chat_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void refetchPrefs();
      invalidateChatList();
    },
  });

  const renameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('group_channels')
        .update({ name })
        .eq('id', groupChannelId);
      if (error) throw error;
    },
    onSuccess: () => {
      setRenameVisible(false);
      void refetchDetail();
      invalidateChatList();
    },
    onError: () => Alert.alert('Error', "Couldn't rename the group. Try again."),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('group_channel_members')
        .delete()
        .eq('group_channel_id', groupChannelId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateChatList();
      // Pop the whole chat stack (group-info → room) back to the chat list.
      try {
        router.dismissAll();
      } catch {
        router.back();
      }
    },
    onError: () => Alert.alert('Error', "Couldn't leave the group. Try again."),
  });

  function confirmLeave() {
    Alert.alert('Leave group?', 'You will stop receiving messages from this group.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
    ]);
  }

  function openRename() {
    setRenameValue(detail?.name ?? '');
    setRenameVisible(true);
  }

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
        // Rename modal
        modalBackdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          padding: SPACING.lg,
        },
        modalCard: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          padding: SPACING.lg,
          gap: SPACING.md,
        },
        modalTitle: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: RADII.md,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
          color: colors.text.primary,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
        },
        modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.lg },
        modalBtn: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.interactive.accent,
        },
        modalBtnMuted: { color: colors.text.secondary },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Group Info' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <GroupAvatar isBirthday={isBirthday} size={96} />
          <Text style={styles.name}>{detail?.name ?? ''}</Text>
        </View>

        {/* Members → dedicated screen */}
        <SettingsSection title="MEMBERS">
          <SettingsRow
            icon="people-outline"
            label="Group Members"
            value={String(members.length)}
            onPress={() => router.push(`/chat/members?group_channel_id=${groupChannelId}` as never)}
            chevron
            accessibilityLabel="View group members"
          />
        </SettingsSection>

        {/* Activity → dedicated screens */}
        <SettingsSection title="ACTIVITY">
          <SettingsRow
            icon="checkbox-outline"
            label="To-Dos"
            value={openTodoCount > 0 ? String(openTodoCount) : undefined}
            onPress={() => router.push(`/chat/todos?group_channel_id=${groupChannelId}` as never)}
            chevron
            accessibilityLabel="View to-dos"
          />
          <SettingsRow
            icon="cash-outline"
            label="Expenses"
            value={unsettledExpenseCount > 0 ? String(unsettledExpenseCount) : undefined}
            onPress={() =>
              router.push(`/chat/expenses?group_channel_id=${groupChannelId}` as never)
            }
            chevron
            accessibilityLabel="View expenses"
          />
        </SettingsSection>

        {/* Shared media */}
        <SettingsSection title="SHARED MEDIA">
          <View style={styles.mediaCard}>
            <SharedMediaGrid media={media} />
          </View>
        </SettingsSection>

        {/* Settings */}
        <SettingsSection title="SETTINGS">
          <SettingsRow
            icon="notifications-off-outline"
            label="Mute notifications"
            switchValue={isMuted}
            onToggle={(next) => muteMutation.mutate(next)}
            switchDisabled={muteMutation.isPending}
          />
          {isCreator && (
            <SettingsRow
              icon="create-outline"
              label="Rename group"
              onPress={openRename}
              chevron
              accessibilityLabel="Rename group"
            />
          )}
          <SettingsRow
            icon="exit-outline"
            label="Leave group"
            tone="destructive"
            onPress={confirmLeave}
            disabled={leaveMutation.isPending}
            accessibilityLabel="Leave group"
          />
        </SettingsSection>
      </ScrollView>

      {/* Rename modal */}
      <Modal visible={renameVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setRenameVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Rename group</Text>
                <TextInput
                  style={styles.input}
                  value={renameValue}
                  onChangeText={setRenameValue}
                  placeholder="Group name"
                  placeholderTextColor={colors.text.secondary}
                  autoFocus
                  maxLength={60}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setRenameVisible(false)}>
                    <Text style={[styles.modalBtn, styles.modalBtnMuted]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!renameValue.trim() || renameMutation.isPending}
                    onPress={() => renameMutation.mutate(renameValue.trim())}
                  >
                    <Text style={styles.modalBtn}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
