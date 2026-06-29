// DM chat info & settings screen. Opened by tapping the DM header in
// ChatRoomScreen. Shows the friend's avatar + name, chat settings (mute),
// shared media, a "Create Group" action (spin up a group with this friend +
// others), and a link to the full friend profile.
//
// The DM partner (friendId / username) is resolved via useDmPartner so the
// lookup is shared with the chat-room header.

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
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { queryKeys } from '@/lib/queryKeys';
import { openChat } from '@/lib/openChat';
import { useChatDmPreferences } from '@/hooks/useChatDmPreferences';
import { useChatMedia } from '@/hooks/useChatMedia';
import { useChatChannelTodos } from '@/hooks/useChatChannelTodos';
import { useDmPartner } from '@/hooks/useDmPartner';
import { useExpensesWithFriend } from '@/hooks/useExpensesWithFriend';
import { useFriends } from '@/hooks/useFriends';
import type { ChatScope } from '@/hooks/useChatTodos';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { SettingsRow } from '@/components/common/SettingsRow';
import { SettingsSection } from '@/components/common/SettingsSection';
import { SharedMediaGrid } from '@/components/chat/SharedMediaGrid';

interface DmInfoScreenProps {
  dmChannelId: string;
  friendName: string;
  avatarUrl?: string;
}

export function DmInfoScreen({ dmChannelId, friendName, avatarUrl }: DmInfoScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? '';

  const { data: prefs, refetch: refetchPrefs } = useChatDmPreferences(dmChannelId);
  const isMuted = prefs?.isMuted ?? false;
  const { media } = useChatMedia({ kind: 'dm', dmChannelId });
  const { partner } = useDmPartner(dmChannelId);
  const friendId = partner?.friendId ?? null;

  const scope = useMemo<ChatScope>(() => ({ kind: 'dm', dmChannelId }), [dmChannelId]);
  const { lists: todoLists } = useChatChannelTodos(scope);
  const { expenses } = useExpensesWithFriend(friendId ?? '');
  const openTodoCount = todoLists.reduce(
    (n, l) => n + l.items.filter((i) => i.completed_at === null).length,
    0
  );
  const unsettledExpenseCount = expenses.filter((e) => !e.isFullySettled).length;

  const [createVisible, setCreateVisible] = useState(false);

  const muteMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase.from('chat_preferences').upsert(
        {
          user_id: userId,
          chat_type: 'dm',
          chat_id: dmChannelId,
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
        },
        mediaCard: {
          marginHorizontal: SPACING.lg,
          marginTop: SPACING.xs,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Chat Info' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AvatarCircle size={96} imageUri={avatarUrl} displayName={friendName} />
          <Text style={styles.name}>{friendName}</Text>
        </View>

        <SettingsSection title="SETTINGS">
          <SettingsRow
            icon="notifications-off-outline"
            label="Mute notifications"
            switchValue={isMuted}
            onToggle={(next) => muteMutation.mutate(next)}
            switchDisabled={muteMutation.isPending}
          />
          <SettingsRow
            icon="people-outline"
            label="Create Group"
            onPress={() => setCreateVisible(true)}
            disabled={!friendId}
            chevron
            accessibilityLabel="Create a group with this friend"
          />
          <SettingsRow
            icon="person-outline"
            label="View full profile"
            onPress={() => friendId && router.push(`/friends/${friendId}` as never)}
            disabled={!friendId}
            chevron
            accessibilityLabel="View full profile"
          />
        </SettingsSection>

        <SettingsSection title="ACTIVITY">
          <SettingsRow
            icon="checkbox-outline"
            label="To-Dos"
            value={openTodoCount > 0 ? String(openTodoCount) : undefined}
            onPress={() => router.push(`/chat/todos?dm_channel_id=${dmChannelId}` as never)}
            chevron
            accessibilityLabel="View to-dos"
          />
          <SettingsRow
            icon="cash-outline"
            label="Expenses"
            value={unsettledExpenseCount > 0 ? String(unsettledExpenseCount) : undefined}
            onPress={() => friendId && router.push(`/chat/expenses?friend_id=${friendId}` as never)}
            disabled={!friendId}
            chevron
            accessibilityLabel="View expenses"
          />
        </SettingsSection>

        <SettingsSection title="SHARED MEDIA">
          <View style={styles.mediaCard}>
            <SharedMediaGrid media={media} />
          </View>
        </SettingsSection>
      </ScrollView>

      {friendId && (
        <CreateGroupModal
          visible={createVisible}
          onClose={() => setCreateVisible(false)}
          partnerId={friendId}
          partnerName={friendName}
          partnerAvatarUrl={avatarUrl ?? null}
        />
      )}
    </View>
  );
}

// ─── CreateGroupModal (file-private) ────────────────────────────────────────
// Group-name input + friend multi-picker. The DM partner is always included.
// Calls the create_group_chat RPC then navigates into the new group.

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl: string | null;
}

function CreateGroupModal({
  visible,
  onClose,
  partnerId,
  partnerName,
  partnerAvatarUrl,
}: CreateGroupModalProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? '';
  const { friends } = useFriends();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Everyone except the partner (who is always included implicitly).
  const candidates = useMemo(
    () => friends.filter((f) => f.friend_id !== partnerId),
    [friends, partnerId]
  );

  const createMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      const memberIds = [partnerId, ...Array.from(selected)];
      // create_group_chat not in database.ts yet (migration 0029).
      const { data, error } = await (supabase as any).rpc('create_group_chat', {
        p_name: name.trim(),
        p_member_ids: memberIds,
      });
      if (error || !data) throw error ?? new Error('no id');
      return data as string;
    },
    onSuccess: (groupChannelId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chat.list(userId) });
      onClose();
      setName('');
      setSelected(new Set());
      void openChat(router, {
        kind: 'group',
        groupChannelId,
        friendName: name.trim(),
      });
    },
    onError: () => Alert.alert('Error', "Couldn't create the group. Try again."),
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          padding: SPACING.lg,
        },
        cardModal: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          padding: SPACING.lg,
          gap: SPACING.md,
          maxHeight: '80%',
        },
        title: {
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
        pickerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.sm,
          gap: SPACING.md,
        },
        memberName: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        included: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        checkbox: {
          width: 22,
          height: 22,
          borderRadius: RADII.xs,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkboxSelected: {
          backgroundColor: colors.interactive.accent,
          borderColor: colors.interactive.accent,
        },
        actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.lg },
        btn: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.interactive.accent,
        },
        btnMuted: { color: colors.text.secondary },
      }),
    [colors]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canCreate = name.trim().length > 0 && !createMutation.isPending;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.cardModal}>
              <Text style={styles.title}>Create group</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Group name"
                placeholderTextColor={colors.text.secondary}
                autoFocus
                maxLength={60}
              />
              <ScrollView>
                {/* Partner is always included */}
                <View style={styles.pickerRow}>
                  <AvatarCircle size={36} imageUri={partnerAvatarUrl} displayName={partnerName} />
                  <Text style={styles.memberName} numberOfLines={1}>
                    {partnerName}
                  </Text>
                  <Text style={styles.included}>Included</Text>
                </View>
                {candidates.map((f) => {
                  const isSel = selected.has(f.friend_id);
                  return (
                    <TouchableOpacity
                      key={f.friend_id}
                      style={styles.pickerRow}
                      activeOpacity={0.7}
                      onPress={() => toggle(f.friend_id)}
                      accessibilityLabel={`${isSel ? 'Deselect' : 'Select'} ${f.display_name}`}
                    >
                      <AvatarCircle
                        size={36}
                        imageUri={f.avatar_url}
                        displayName={f.display_name}
                      />
                      <Text style={styles.memberName} numberOfLines={1}>
                        {f.display_name}
                      </Text>
                      <View style={[styles.checkbox, isSel && styles.checkboxSelected]}>
                        {isSel && <Ionicons name="checkmark" size={16} color="#0E0F11" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.actions}>
                <TouchableOpacity onPress={onClose}>
                  <Text style={[styles.btn, styles.btnMuted]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={!canCreate} onPress={() => createMutation.mutate()}>
                  <Text style={styles.btn}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
