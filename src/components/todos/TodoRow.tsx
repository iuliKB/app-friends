// Phase 29.1 Plan 06 — TodoRow component.
// Renders one MyTodoRow in /squad/todos/index.tsx Mine section:
//   • Title (FONT_SIZE.md / body.medium / text.primary), strikethrough when completed
//   • Due-date label below title — `OVERDUE · {date}`, `Due today`, `Due tomorrow`,
//     `Due in N days`, or `No due date`. Overdue label is destructive-colored.
//   • Priority chip (Low / Medium / High) with UI-SPEC colors.
//   • 3px destructive left border when `is_overdue && !completed_at`.
//   • 44×44 done-toggle checkbox on the right; filled `TILE_ACCENTS.todos`
//     when completed.
//
// Pattern: clones HabitRow.tsx layout (Plan 05); priority chip styled like
// the Solo/Group chip; overdue treatment from UI-SPEC §Color > Overdue treatment.

import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING, ANIMATION } from '@/theme';
import { TILE_ACCENTS, ACCENT_FILL } from '@/components/squad/bento/tileAccents';
import type { MyTodoRow, TodoPriority } from '@/types/todos';

interface TodoRowProps {
  todo: MyTodoRow;
  onToggle: (todoId: string) => Promise<unknown>;
  onPress: (todoId: string) => void;
}

// Format MMM D from YYYY-MM-DD (local). Always interpret as a local date
// (avoid the UTC-slice off-by-one — Pitfall 5 reference).
function formatShortDate(dateLocal: string): string {
  // Build Date from explicit local parts so the timezone interpretation matches
  // the date_local semantics on the server (YYYY-MM-DD with no offset).
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
  const ms = due - today;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatDueLabel(todo: MyTodoRow): {
  text: string;
  isOverdue: boolean;
  isMissing: boolean;
} {
  if (!todo.due_date) {
    return { text: 'No due date', isOverdue: false, isMissing: true };
  }
  if (todo.is_overdue && !todo.completed_at) {
    return {
      text: `OVERDUE · ${formatShortDate(todo.due_date)}`,
      isOverdue: true,
      isMissing: false,
    };
  }
  if (todo.is_due_today) {
    return { text: 'Due today', isOverdue: false, isMissing: false };
  }
  const days = daysUntilLocal(todo.due_date);
  if (days === 1) return { text: 'Due tomorrow', isOverdue: false, isMissing: false };
  if (days > 1) return { text: `Due in ${days} days`, isOverdue: false, isMissing: false };
  // days <= 0 but not flagged is_overdue — RPC said completed or edge case; fall back to short date
  return { text: `Due ${formatShortDate(todo.due_date)}`, isOverdue: false, isMissing: false };
}

function priorityLabel(priority: TodoPriority): string {
  return priority === 'low' ? 'Low' : priority === 'high' ? 'High' : 'Medium';
}

export function TodoRow({ todo, onToggle, onPress }: TodoRowProps) {
  const { colors } = useTheme();
  const checkScale = useRef(new Animated.Value(1)).current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          minHeight: 56,
          gap: SPACING.md,
        },
        rowPressed: { opacity: 0.75 },
        overdueBorder: {
          // 3px destructive left border per UI-SPEC §Color > Overdue treatment
          borderLeftWidth: 3,
          borderLeftColor: colors.interactive.destructive,
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
        bottomRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        },
        dueLabel: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        dueLabelOverdue: {
          color: colors.interactive.destructive,
          fontFamily: FONT_FAMILY.body.semibold,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.sm,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 4, // UI-SPEC phase exception — chip pill (precedent: YourZoneSection.tsx:223)
          borderRadius: RADII.full,
          borderWidth: 1,
          gap: SPACING.xs,
        },
        chipText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          letterSpacing: 0.5,
        },
        toggleWrapper: {
          // 44×44 tap target (iOS HIG min)
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
      }),
    [colors]
  );

  const isCompleted = todo.completed_at !== null;
  const dueInfo = formatDueLabel(todo);
  const showOverdueBorder = todo.is_overdue && !isCompleted;

  // Priority chip palette per UI-SPEC §Color:
  // low = text.secondary, medium = feedback.info, high = interactive.destructive
  const priorityBorderColor =
    todo.priority === 'high'
      ? colors.interactive.destructive
      : todo.priority === 'medium'
        ? colors.feedback.info
        : colors.text.secondary;
  const priorityBgColor = priorityBorderColor + ACCENT_FILL;
  const priorityTextColor = priorityBorderColor;

  // Done checkbox: filled TILE_ACCENTS.todos when completed
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
    // Spring scale 0.8 → 1.0 (matches HabitRow pattern, ANIMATION.easing.spring)
    checkScale.setValue(0.8);
    Animated.spring(checkScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
    }).start();
    const result = await onToggle(todo.id);
    if (!isCompleted) {
      // Just transitioned to done — success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    return result;
  }

  const a11yToggleLabel = isCompleted
    ? `Mark "${todo.title}" not done`
    : `Mark "${todo.title}" done`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        showOverdueBorder && styles.overdueBorder,
        pressed && styles.rowPressed,
      ]}
      onPress={() => onPress(todo.id)}
      accessibilityRole="button"
      accessibilityLabel={`${todo.title}. ${dueInfo.text}. Priority ${priorityLabel(todo.priority)}.`}
    >
      <View style={styles.contentColumn}>
        <Text style={[styles.title, isCompleted && styles.titleCompleted]} numberOfLines={2}>
          {todo.title}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={[styles.dueLabel, dueInfo.isOverdue && styles.dueLabelOverdue]}>
            {dueInfo.text}
          </Text>
          <View
            style={[
              styles.chip,
              { borderColor: priorityBorderColor, backgroundColor: priorityBgColor },
            ]}
          >
            <Text style={[styles.chipText, { color: priorityTextColor }]}>
              {priorityLabel(todo.priority)}
            </Text>
          </View>
        </View>
      </View>

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
    </Pressable>
  );
}
