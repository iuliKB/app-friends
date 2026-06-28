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
  Switch,
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
import { useDmPartner } from '@/hooks/useDmPartner';
import { useFriends } from '@/hooks/useFriends';
import { AvatarCircle } from '@/components/common/AvatarCircle';
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
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              activeOpacity={0.6}
              disabled={!friendId}
              onPress={() => setCreateVisible(true)}
              accessibilityLabel="Create a group with this friend"
            >
              <Ionicons name="people-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.rowLabel}>Create Group</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.rowBorder]}
              activeOpacity={0.6}
              disabled={!friendId}
              onPress={() => friendId && router.push(`/friends/${friendId}` as never)}
              accessibilityLabel="View full profile"
            >
              <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.rowLabel}>View full profile</Text>
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
