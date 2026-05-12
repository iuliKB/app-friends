import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { BentoCard } from './BentoCard';
import { TILE_ACCENTS, ACCENT_FILL } from './tileAccents';
import type { UseTodosResult } from '@/hooks/useTodos';

interface TodosTileProps {
  todos: UseTodosResult;
}

export function TodosTile({ todos }: TodosTileProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const overdueCount = todos.mine.filter(
    (t) => t.completed_at === null && t.is_overdue
  ).length;
  const dueTodayCount = todos.mine.filter(
    (t) => t.completed_at === null && t.is_due_today
  ).length;
  const total = overdueCount + dueTodayCount;
  // Accent flips to destructive when any overdue items exist; mirrors IOUTile
  // positive/negative accent flip.
  const tileAccent =
    overdueCount > 0 ? colors.interactive.destructive : TILE_ACCENTS.todos;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
        iconBubble: {
          width: 28,
          height: 28,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tileAccent + ACCENT_FILL,
        },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        bigNumber: {
          fontSize: FONT_SIZE.display,
          fontFamily: FONT_FAMILY.display.semibold,
          letterSpacing: -0.5,
        },
        bigNumberMuted: {
          color: colors.text.secondary,
        },
        sub: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        skeletonBar: {
          height: 14,
          borderRadius: RADII.md,
          backgroundColor: colors.border,
        },
      }),
    [colors, tileAccent]
  );

  if (todos.loading) {
    return (
      <BentoCard containerStyle={{ flex: 1 }} accessibilityLabel="Loading to-dos">
        <View style={[styles.skeletonBar, { width: '50%' }]} />
        <View style={[styles.skeletonBar, { width: '70%', height: 22 }]} />
        <View style={[styles.skeletonBar, { width: '40%' }]} />
      </BentoCard>
    );
  }

  // Subline copy per UI-SPEC §Copywriting Contract — Bento tile labels.
  const subline =
    overdueCount > 0
      ? 'due now'
      : dueTodayCount > 0
        ? 'due today'
        : 'all caught up';

  const a11yLabel =
    total === 0
      ? 'To-Dos. All caught up. Tap to open.'
      : `To-Dos. ${total} ${subline}. Tap to open.`;

  return (
    <BentoCard
      onPress={() => router.push('/squad/todos' as never)}
      containerStyle={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconBubble}>
          <Ionicons name="list-outline" size={16} color={tileAccent} />
        </View>
        <Text style={styles.title}>To-Dos</Text>
      </View>

      <Text
        style={[
          styles.bigNumber,
          total > 0 ? { color: tileAccent } : styles.bigNumberMuted,
        ]}
      >
        {total}
      </Text>

      <Text style={styles.sub}>{subline}</Text>
    </BentoCard>
  );
}
