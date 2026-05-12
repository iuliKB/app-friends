/**
 * HomeTodosTile — Phase 29.1 Plan 08.
 *
 * Home-screen To-Dos widget. Uses the Phase 29 neon-green Home aesthetic
 * (TileShell + EyebrowPill from HomeTilePrimitives) — NOT the cyan/violet
 * Bento aesthetic from src/components/squad/bento (Pitfall 7).
 *
 * Layout (UI-SPEC §Home widgets):
 *   - Eyebrow pill "TO-DOS" + list-outline icon
 *   - "Add" chip in top-right (small accent-tinted pill → /squad/todos/create)
 *   - Hero "{overdueCount + dueTodayCount}"
 *     - destructive when overdue > 0
 *     - accent when overdue == 0 AND due-today > 0
 *     - text.primary when count == 0 AND there are still incomplete mine items
 *     - text.secondary muted when mine is empty AND count == 0
 *   - Caption "due now" / "due today" / "all caught up"
 *   - Tap card body → /squad/todos (D-19 detail-intent, W11)
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';
import { TileShell, EyebrowPill } from './HomeTilePrimitives';
import type { UseTodosResult } from '@/hooks/useTodos';

interface HomeTodosTileProps {
  todos: UseTodosResult;
}

export function HomeTodosTile({ todos }: HomeTodosTileProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // Count overdue + due-today across BOTH Mine and From-chats — matches the
  // Bento TodosTile semantics. From-chats rows expose is_overdue/is_due_today
  // at the list level (rolled up across child items by the RPC).
  const overdueCount =
    todos.mine.filter((t) => t.is_overdue && !t.completed_at).length +
    todos.fromChats.filter((t) => t.is_overdue).length;
  const dueTodayCount =
    todos.mine.filter((t) => t.is_due_today && !t.completed_at).length +
    todos.fromChats.filter((t) => t.is_due_today).length;
  const total = overdueCount + dueTodayCount;
  const hasAnyMine = todos.mine.some((t) => !t.completed_at) || todos.fromChats.length > 0;

  // Hero color (UI-SPEC):
  //   destructive when overdue > 0
  //   accent when overdue === 0 AND dueToday > 0
  //   text.primary when total === 0 AND there ARE incomplete mine items
  //   text.secondary when total === 0 AND mine is empty
  const heroColor =
    overdueCount > 0
      ? colors.interactive.destructive
      : dueTodayCount > 0
        ? colors.interactive.accent
        : hasAnyMine
          ? colors.text.primary
          : colors.text.secondary;

  // Caption (UI-SPEC):
  //   "due now" when overdue > 0
  //   "due today" when overdue === 0 AND dueToday > 0
  //   "all caught up" when total === 0
  const caption = overdueCount > 0 ? 'due now' : dueTodayCount > 0 ? 'due today' : 'all caught up';

  // Accent-tinted "Add" chip — mirrors the LiveChip shape from YourZoneSection
  // but is static (no pulse animation). Uses neon-green at the same alpha as
  // EyebrowPill (Pitfall 7 — NOT the Bento per-tool violet accent).
  const chipBg = isDark ? 'rgba(185,255,59,0.14)' : 'rgba(77,124,0,0.10)';
  const chipBorder = isDark ? 'rgba(185,255,59,0.45)' : 'rgba(77,124,0,0.30)';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          flex: 1,
          justifyContent: 'flex-end',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          gap: 4,
        },
        hero: {
          fontSize: FONT_SIZE.display,
          fontFamily: FONT_FAMILY.display.semibold,
          letterSpacing: -0.5,
        },
        caption: {
          fontFamily: FONT_FAMILY.body.regular,
          fontSize: FONT_SIZE.xs,
          color: colors.text.secondary,
        },
        addChip: {
          paddingHorizontal: SPACING.sm,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 4,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: chipBorder,
          backgroundColor: chipBg,
        },
        addChipText: {
          fontFamily: FONT_FAMILY.body.bold,
          fontSize: FONT_SIZE.xs,
          letterSpacing: 0.5,
          color: colors.interactive.accent,
        },
      }),
    [colors, chipBg, chipBorder]
  );

  const a11yLabel =
    total === 0
      ? hasAnyMine
        ? 'To-Dos. All caught up. Tap to open.'
        : 'To-Dos. No to-dos. Tap to open.'
      : `To-Dos. ${total} ${caption}. Tap to open.`;

  return (
    <TileShell
      eyebrow={<EyebrowPill icon="list-outline" label="TO-DOS" />}
      hot={overdueCount > 0}
      chip={
        <Pressable
          style={styles.addChip}
          onPress={() => router.push('/squad/todos/create' as never)}
          accessibilityRole="button"
          accessibilityLabel="Add a to-do"
          hitSlop={8}
        >
          <Text style={styles.addChipText}>Add</Text>
        </Pressable>
      }
      onPress={() => router.push('/squad/todos' as never)}
      a11yLabel={a11yLabel}
    >
      <View style={styles.body}>
        <Text style={[styles.hero, { color: heroColor }]}>{total}</Text>
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      </View>
    </TileShell>
  );
}
