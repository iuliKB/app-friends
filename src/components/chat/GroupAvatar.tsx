// Shared chat avatar for non-DM chats. Renders a consistent icon badge across
// the chat list row, chat-room header, and info screens:
//   • birthday group → gift  (#F97316)
//   • custom/squad   → people (#9333EA)
//   • plan chat      → calendar (#3B82F6)
//
// Colors match ChatListRow.tsx and are kept as literals with the same eslint
// exemption the list row uses. `isBirthday` is preserved for existing callers;
// `variant` takes precedence when provided.

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADII } from '@/theme';

export type GroupAvatarVariant = 'group' | 'birthday' | 'plan';

interface GroupAvatarProps {
  /** Birthday groups (non-null birthday_person_id) get the gift icon. */
  isBirthday?: boolean;
  /** Explicit variant; overrides `isBirthday` when set. */
  variant?: GroupAvatarVariant;
  size?: number;
}

const ICONS: Record<GroupAvatarVariant, keyof typeof Ionicons.glyphMap> = {
  group: 'people-outline',
  birthday: 'gift-outline',
  plan: 'calendar-outline',
};

export function GroupAvatar({ isBirthday = false, variant, size = 48 }: GroupAvatarProps) {
  const resolved: GroupAvatarVariant = variant ?? (isBirthday ? 'birthday' : 'group');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: size,
          height: size,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // eslint-disable-next-line campfire/no-hardcoded-styles
        birthday: { backgroundColor: '#F97316' },
        // eslint-disable-next-line campfire/no-hardcoded-styles
        group: { backgroundColor: '#9333EA' },
        // eslint-disable-next-line campfire/no-hardcoded-styles
        plan: { backgroundColor: '#3B82F6' },
      }),
    [size]
  );

  return (
    <View style={[styles.container, styles[resolved]]}>
      <Ionicons name={ICONS[resolved]} size={Math.round(size * 0.46)} color="#fff" />
    </View>
  );
}
