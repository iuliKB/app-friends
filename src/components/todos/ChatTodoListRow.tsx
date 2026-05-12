// Phase 29.1 Plan 06 — ChatTodoListRow (flat row).
// Renders a SINGLE chat-todo-item as a flat row, matching the Mine-section
// visual contract (44×44 checkbox on the left, title, sub-row with due-date +
// source list attribution). No per-list dropdown — the parent screen
// flattens each chat list into its child items.

import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING, ANIMATION } from '@/theme';
import { TILE_ACCENTS, ACCENT_FILL } from '@/components/squad/bento/tileAccents';
import type { ChatTodoItem } from '@/types/todos';

interface ChatTodoListRowProps {
  item: ChatTodoItem;
  listTitle: string;
  onToggle: (itemId: string) => Promise<unknown>;
}

function formatShortDate(dateLocal: string): string {
  const parts = dateLocal.split('-');
  const y = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 1);
  const d = Number(parts[2] ?? 1);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function daysUntilLocal(dueDateLocal: string): number {
  const parts = dueDateLocal.split('-');
  const dueY = Number(parts[0] ?? 0);
  const dueM = Number(parts[1] ?? 1);
  const dueD = Number(parts[2] ?? 1);
  const due = new Date(dueY, dueM - 1, dueD).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function formatDueLabel(dateLocal: string | null, completed: boolean): {
  text: string | null;
  isOverdue: boolean;
} {
  if (!dateLocal) return { text: null, isOverdue: false };
  const days = daysUntilLocal(dateLocal);
  if (days < 0 && !completed) {
    return { text: `OVERDUE · ${formatShortDate(dateLocal)}`, isOverdue: true };
  }
  if (days === 0) return { text: 'Due today', isOverdue: false };
  if (days === 1) return { text: 'Due tomorrow', isOverdue: false };
  if (days > 1) return { text: `Due in ${days} days`, isOverdue: false };
  return { text: `Due ${formatShortDate(dateLocal)}`, isOverdue: false };
}

export function ChatTodoListRow({ item, listTitle, onToggle }: ChatTodoListRowProps) {
  const { colors } = useTheme();
  const checkScale = useRef(new Animated.Value(1)).current;
  const isCompleted = item.completed_at !== null;
  const dueInfo = formatDueLabel(item.due_date, isCompleted);
  const showOverdueBorder = dueInfo.isOverdue;
  // For single-item chat todos the parent list title typically equals the
  // item title — don't show duplicate text in that case.
  const showAttribution = listTitle && listTitle.trim() !== item.title.trim();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          minHeight: 64,
          gap: SPACING.md,
        },
        overdueBorder: {
          borderLeftWidth: 3,
          borderLeftColor: colors.interactive.destructive,
        },
        toggleWrapper: {
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkbox: {
          width: 28,
          height: 28,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
        },
        contentColumn: { flex: 1, gap: SPACING.xs },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        titleCompleted: {
          textDecorationLine: 'line-through',
          opacity: 0.6,
        },
        subRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          flexWrap: 'wrap',
        },
        subLabel: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        subLabelOverdue: {
          color: colors.interactive.destructive,
          fontFamily: FONT_FAMILY.body.semibold,
        },
        attribution: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        dot: {
          fontSize: FONT_SIZE.xs,
          color: colors.text.secondary,
        },
      }),
    [colors]
  );

  const checkboxStyle = isCompleted
    ? {
        backgroundColor: TILE_ACCENTS.todos + ACCENT_FILL,
        borderColor: TILE_ACCENTS.todos,
      }
    : {
        backgroundColor: 'transparent',
        borderColor: colors.text.secondary,
      };

  async function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    checkScale.setValue(0.8);
    Animated.spring(checkScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
    }).start();
    const result = await onToggle(item.id);
    if (!isCompleted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    return result;
  }

  const a11yToggleLabel = isCompleted
    ? `Mark "${item.title}" not done`
    : `Mark "${item.title}" done`;
  const a11yRowLabel = showAttribution
    ? `${item.title}${dueInfo.text ? `. ${dueInfo.text}` : ''}. From ${listTitle}.`
    : `${item.title}${dueInfo.text ? `. ${dueInfo.text}` : ''}.`;

  return (
    <View
      style={[styles.row, showOverdueBorder && styles.overdueBorder]}
      accessibilityRole="text"
      accessibilityLabel={a11yRowLabel}
    >
      <Pressable
        style={styles.toggleWrapper}
        onPress={handleToggle}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isCompleted }}
        accessibilityLabel={a11yToggleLabel}
      >
        <Animated.View
          style={[styles.checkbox, checkboxStyle, { transform: [{ scale: checkScale }] }]}
        >
          {isCompleted && <Ionicons name="checkmark" size={18} color={TILE_ACCENTS.todos} />}
        </Animated.View>
      </Pressable>

      <View style={styles.contentColumn}>
        <Text style={[styles.title, isCompleted && styles.titleCompleted]} numberOfLines={2}>
          {item.title}
        </Text>
        {(dueInfo.text || showAttribution) && (
          <View style={styles.subRow}>
            {dueInfo.text && (
              <Text style={[styles.subLabel, dueInfo.isOverdue && styles.subLabelOverdue]}>
                {dueInfo.text}
              </Text>
            )}
            {dueInfo.text && showAttribution && <Text style={styles.dot}>·</Text>}
            {showAttribution && <Text style={styles.attribution}>{listTitle}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}
