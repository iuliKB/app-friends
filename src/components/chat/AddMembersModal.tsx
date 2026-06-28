// Friend-picker modal for inviting people to a group. Lists the current user's
// friends who aren't already members (reuses the canonical useFriends cache),
// multi-select, and hands the selected ids back to the caller. The caller owns
// the actual mutation (add_group_members RPC) so this component stays generic.

import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { useFriends } from '@/hooks/useFriends';
import { AvatarCircle } from '@/components/common/AvatarCircle';

interface AddMembersModalProps {
  visible: boolean;
  onClose: () => void;
  existingMemberIds: string[];
  onAdd: (ids: string[]) => void;
  submitting: boolean;
}

export function AddMembersModal({
  visible,
  onClose,
  existingMemberIds,
  onAdd,
  submitting,
}: AddMembersModalProps) {
  const { colors } = useTheme();
  const { friends } = useFriends();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const candidates = useMemo(
    () => friends.filter((f) => !existingMemberIds.includes(f.friend_id)),
    [friends, existingMemberIds]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          padding: SPACING.lg,
        },
        card: {
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
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.sm,
          gap: SPACING.md,
        },
        name: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
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
        empty: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          paddingVertical: SPACING.md,
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

  function handleAdd() {
    if (selected.size === 0) return;
    onAdd(Array.from(selected));
    setSelected(new Set());
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <Text style={styles.title}>Add members</Text>
              <ScrollView>
                {candidates.length === 0 ? (
                  <Text style={styles.empty}>No friends left to add.</Text>
                ) : (
                  candidates.map((f) => {
                    const isSel = selected.has(f.friend_id);
                    return (
                      <TouchableOpacity
                        key={f.friend_id}
                        style={styles.row}
                        activeOpacity={0.7}
                        onPress={() => toggle(f.friend_id)}
                        accessibilityLabel={`${isSel ? 'Deselect' : 'Select'} ${f.display_name}`}
                      >
                        <AvatarCircle
                          size={36}
                          imageUri={f.avatar_url}
                          displayName={f.display_name}
                        />
                        <Text style={styles.name} numberOfLines={1}>
                          {f.display_name}
                        </Text>
                        <View style={[styles.checkbox, isSel && styles.checkboxSelected]}>
                          {isSel && <Ionicons name="checkmark" size={16} color="#0E0F11" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
              <View style={styles.actions}>
                <TouchableOpacity onPress={onClose}>
                  <Text style={[styles.btn, styles.btnMuted]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={selected.size === 0 || submitting} onPress={handleAdd}>
                  <Text
                    style={styles.btn}
                  >{`Add${selected.size > 0 ? ` (${selected.size})` : ''}`}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
