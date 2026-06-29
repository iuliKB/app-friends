// To-Dos section for the chat info screens (DM + group). Lists every chat
// to-do for this channel the caller can see (creator or assignee), flattened
// to one row per item, and lets the assignee tick items done in place.
// "+ New to-do" opens the same ChatTodoPickerSheet the chat room uses, scoped
// to this channel.

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { ChatTodoListRow } from '@/components/todos/ChatTodoListRow';
import { ChatTodoPickerSheet } from '@/components/chat/ChatTodoPickerSheet';
import { useChatChannelTodos } from '@/hooks/useChatChannelTodos';
import { useChatTodos, type ChatScope } from '@/hooks/useChatTodos';
import type { ChatMember } from '@/hooks/useChatMembers';
import type { ChatChannelTodoRow } from '@/types/todos';

interface ChatInfoTodosSectionProps {
  scope: ChatScope;
  members: ChatMember[];
  currentUserId: string;
}

// Attribution shown under each item: the parent list name when the item is
// part of a multi-item list I own, or "For <name>" when I created it for
// someone else. Single items assigned to me show nothing extra.
function attributionFor(list: ChatChannelTodoRow): string {
  if (!list.is_assignee) return `For ${list.assignee_name ?? 'someone'}`;
  return list.is_list ? list.title : '';
}

export function ChatInfoTodosSection({ scope, members, currentUserId }: ChatInfoTodosSectionProps) {
  const { colors } = useTheme();
  const { lists, loading, toggleItem } = useChatChannelTodos(scope);
  const { sendChatTodo } = useChatTodos();
  const [pickerVisible, setPickerVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sectionWrapper: { marginTop: SPACING.xl },
        sectionTitle: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.xs,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        card: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          overflow: 'hidden',
          marginHorizontal: SPACING.lg,
        },
        separator: { height: 1, backgroundColor: colors.border, marginLeft: SPACING.lg },
        empty: {
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.lg,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        addRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          minHeight: 52,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        addLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.interactive.accent,
        },
        loading: { paddingVertical: SPACING.lg, alignItems: 'center' },
      }),
    [colors]
  );

  // Flatten lists → items, preserving list metadata for each row.
  const rows = useMemo(
    () => lists.flatMap((list) => list.items.map((item) => ({ list, item }))),
    [lists]
  );

  return (
    <View style={styles.sectionWrapper}>
      <Text style={styles.sectionTitle}>To-Dos</Text>
      <View style={styles.card}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.text.secondary} />
          </View>
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No to-dos in this chat yet.</Text>
        ) : (
          rows.map(({ list, item }, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <View style={styles.separator} />}
              <ChatTodoListRow
                item={item}
                listTitle={attributionFor(list)}
                disabled={!list.is_assignee}
                onToggle={(itemId) => toggleItem(itemId, list.list_id)}
              />
            </React.Fragment>
          ))
        )}

        <TouchableOpacity
          style={styles.addRow}
          activeOpacity={0.6}
          onPress={() => setPickerVisible(true)}
          accessibilityLabel="Add a new to-do to this chat"
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.interactive.accent} />
          <Text style={styles.addLabel}>New to-do</Text>
        </TouchableOpacity>
      </View>

      <ChatTodoPickerSheet
        visible={pickerVisible}
        onDismiss={() => setPickerVisible(false)}
        scope={scope}
        members={members}
        currentUserId={currentUserId}
        onSend={sendChatTodo}
      />
    </View>
  );
}
