// Phase 29.1 Plan 07 — ChatTodoBubble component.
//
// Renders message_type === 'todo' messages inside a chat thread. Two flavors:
//   • single-item (list.is_list === false): one row with title + due subline
//     + 44×44 checkbox on the right (D-09).
//   • list (list.is_list === true): collapsible header + child rows (D-13).
//     Header shows "📋 {title}" + "{done}/{total} done" + chevron-down (0°);
//     tap toggles expanded state — child rows render with their own
//     44×44 checkboxes, incomplete-first ordering.
//
// Completion gating (D-11 / T-29.1-32):
//   Only the assignee (currentUserId === list.assignee_id) can tap a checkbox.
//   For non-assignees the checkbox renders as a static (non-Pressable) icon —
//   server-side RLS on chat_todo_items enforces the same gate (RPC requires
//   assignee_id = auth.uid()).
//
// Long-press: NOT handled here (Pitfall 9). MessageBubble.handleLongPress
// bails on isTodo before any context-menu opens.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING, ANIMATION } from '@/theme';
import { TILE_ACCENTS, ACCENT_FILL, ACCENT_BORDER } from '@/components/squad/bento/tileAccents';
import type { ChatTodoItem, ChatTodoList } from '@/types/todos';
import type { MessageWithProfile } from '@/types/chat';

// Android needs explicit opt-in for LayoutAnimation (same precedent as
// ChatTodoListRow in Plan 06).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ChatTodoBubbleProps {
  message: MessageWithProfile;
  currentUserId: string;
  isOwn: boolean;
  list: ChatTodoList | null; // resolved by ChatRoomScreen via message_id lookup
  items: ChatTodoItem[];
  assigneeName: string; // for "for {firstName}" subline (D-09) — first token of full name
  onCompleteItem: (itemId: string) => Promise<unknown>;
}

function firstName(name: string): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  // Parse YYYY-MM-DD as a local date — appending T00:00:00 prevents the
  // string from being interpreted as UTC midnight (which would shift one
  // calendar day in negative-UTC zones; see Pitfall 5).
  const d = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dueDate;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'just now';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ChatTodoBubble({
  message,
  currentUserId,
  isOwn,
  list,
  items,
  assigneeName,
  onCompleteItem,
}: ChatTodoBubbleProps) {
  const { colors } = useTheme();
  const accent = TILE_ACCENTS.todos;
  const isAssignee = !!list && currentUserId === list.assignee_id;
  const isList = !!list && list.is_list;

  const [expanded, setExpanded] = useState(false);
  const chevronRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevronRotation, {
      toValue: expanded ? 1 : 0,
      duration: ANIMATION.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [expanded, chevronRotation]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          width: '100%',
          paddingHorizontal: SPACING.lg,
          marginBottom: SPACING.xs,
          alignItems: isOwn ? 'flex-end' : 'flex-start',
        },
        bubble: {
          maxWidth: '75%',
          minWidth: 220,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
          borderRadius: RADII.pill,
          borderWidth: 1,
          backgroundColor: isOwn ? accent + ACCENT_FILL : colors.surface.card,
          borderColor: isOwn ? accent + ACCENT_BORDER : colors.border,
        },
        singleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
        },
        textColumn: { flex: 1, gap: SPACING.xs },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        titleCompleted: {
          textDecorationLine: 'line-through',
          opacity: 0.6,
        },
        subline: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        // 44×44 outer wrapper preserves min tap target even when inner box is smaller
        checkboxWrap: {
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkbox: {
          width: 24,
          height: 24,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
        },
        // List flavor styles
        listHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          minHeight: 44,
        },
        listHeaderPressed: { opacity: 0.75 },
        listTitle: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        listProgress: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        chevronWrap: {
          width: 28,
          height: 28,
          alignItems: 'center',
          justifyContent: 'center',
        },
        itemsList: {
          paddingTop: SPACING.sm,
          gap: SPACING.xs,
        },
        itemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
          minHeight: 44,
        },
      }),
    [colors, accent, isOwn]
  );

  // Defensive: if list/items lookup hasn't resolved yet, render the raw body
  // (mirrors how PollCard fallback would look pre-fetch).
  if (!list) {
    return (
      <View style={styles.outer}>
        <View style={styles.bubble}>
          <Text style={styles.title}>{message.body ?? 'To-do'}</Text>
        </View>
      </View>
    );
  }

  async function handleToggle(itemId: string, wasCompleted: boolean) {
    if (!isAssignee || wasCompleted) return; // server is idempotent but UI shouldn't fire
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const result = await onCompleteItem(itemId);
    if (!wasCompleted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    return result;
  }

  function renderCheckbox(itemId: string, completed: boolean) {
    const checkboxStyle = completed
      ? { backgroundColor: accent + ACCENT_FILL, borderColor: accent }
      : { backgroundColor: 'transparent', borderColor: colors.text.secondary };
    const inner = (
      <View style={[styles.checkbox, checkboxStyle]}>
        {completed && <Ionicons name="checkmark" size={14} color={accent} />}
      </View>
    );
    if (!isAssignee) {
      // Non-assignee: static icon, no Pressable (T-29.1-32 — UI half of the gate).
      return (
        <View
          style={styles.checkboxWrap}
          accessibilityRole="image"
          accessibilityLabel={completed ? 'Completed' : 'Not yet completed'}
        >
          {inner}
        </View>
      );
    }
    return (
      <Pressable
        onPress={() => void handleToggle(itemId, completed)}
        hitSlop={8}
        style={styles.checkboxWrap}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={completed ? 'Done checkbox' : 'Mark done checkbox'}
      >
        {inner}
      </Pressable>
    );
  }

  // ── Single-item flavor (D-09) ────────────────────────────────────────
  if (!isList) {
    const item = items[0];
    const completed = !!item?.completed_at;
    const subline = completed
      ? `✓ Done ${relativeTime(item!.completed_at!)}`
      : (() => {
          const due = item ? formatDueDate(item.due_date) : null;
          const parts: string[] = [];
          if (due) parts.push(`Due ${due}`);
          const fn = firstName(assigneeName);
          if (fn) parts.push(`for ${fn}`);
          return parts.length ? parts.join(' · ') : ' ';
        })();

    return (
      <View style={styles.outer}>
        <View
          style={styles.bubble}
          accessibilityLabel={
            completed
              ? `Done. ${list.title}, completed by ${firstName(assigneeName)}.`
              : `To-do for ${firstName(assigneeName)}: ${list.title}, ${
                  item?.due_date ? `due ${formatDueDate(item.due_date)}` : 'no due date'
                }. ${isAssignee ? 'Tap to mark done.' : ''}`.trim()
          }
        >
          <View style={styles.singleRow}>
            <View style={styles.textColumn}>
              <Text style={[styles.title, completed && styles.titleCompleted]} numberOfLines={2}>
                {list.title}
              </Text>
              <Text style={styles.subline} numberOfLines={1}>
                {subline}
              </Text>
            </View>
            {item && renderCheckbox(item.id, completed)}
          </View>
        </View>
      </View>
    );
  }

  // ── List flavor (D-13) ───────────────────────────────────────────────
  const total = items.length;
  const done = items.reduce((n, it) => (it.completed_at ? n + 1 : n), 0);
  const sortedItems = [...items].sort((a, b) => {
    const aDone = a.completed_at ? 1 : 0;
    const bDone = b.completed_at ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return a.position - b.position;
  });

  function handleHeaderPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }

  const rotateInterpolation = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.outer}>
      <View
        style={styles.bubble}
        accessibilityLabel={`To-do list for ${firstName(assigneeName)}: ${list.title}, ${done} of ${total} done. Tap to ${expanded ? 'collapse' : 'expand'}.`}
      >
        <Pressable
          onPress={handleHeaderPress}
          style={({ pressed }) => [styles.listHeader, pressed && styles.listHeaderPressed]}
          accessibilityRole="button"
          accessibilityLabel={`${list.title}, ${done} of ${total} done`}
          accessibilityHint={expanded ? 'Tap to collapse' : 'Tap to expand'}
        >
          <Text style={styles.listTitle} numberOfLines={1}>
            {`📋 ${list.title}`}
          </Text>
          <Text style={styles.listProgress}>{`${done}/${total} done`}</Text>
          <Animated.View
            style={[styles.chevronWrap, { transform: [{ rotate: rotateInterpolation }] }]}
          >
            <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
          </Animated.View>
        </Pressable>

        {expanded && (
          <View style={styles.itemsList}>
            {sortedItems.map((item) => {
              const completed = !!item.completed_at;
              return (
                <View key={item.id} style={styles.itemRow}>
                  <Text
                    style={[styles.title, { flex: 1 }, completed && styles.titleCompleted]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  {renderCheckbox(item.id, completed)}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
