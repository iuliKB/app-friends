// Phase 29.1 Plan 06 — ChatTodoListRow component.
// Renders one ChatTodoRow in /squad/todos/index.tsx "From chats" section (D-13).
//
// Collapsed state:  📋 {title} · {done}/{total} done   +  chevron-down (0°)
// Expanded state:   same header + chevron rotates 180° + child item list
//
// Controlled-prop expansion (W9 — checker pass 1): parent owns expanded state
// and decides when items are fetched. Component renders based on `items.length`:
//   • items.length === 0 → collapsed view
//   • items.length > 0   → expanded view (with child items sorted incomplete-first)
//   • items empty + loadingItems → 3 skeleton rows
//
// Animation: LayoutAnimation.easeInEaseOut on container height (UI-SPEC §Animation
// > Chat to-do list expand). Chevron rotation: Animated.timing on rotation value.

import React, { useEffect, useMemo, useRef } from 'react';
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
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { TILE_ACCENTS, ACCENT_FILL } from '@/components/squad/bento/tileAccents';
import type { ChatTodoItem, ChatTodoRow } from '@/types/todos';

// Android requires explicit opt-in for LayoutAnimation to take effect
// (precedent: most RN projects toggle this once globally; safe to call here).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ChatTodoListRowProps {
  row: ChatTodoRow;
  items: ChatTodoItem[]; // empty = collapsed; populated = expanded (controlled-prop)
  loadingItems: boolean; // true while child items load
  onExpand: (listId: string) => void; // header tapped — parent fetches items + re-renders
  onToggleItem: (itemId: string) => Promise<unknown>;
}

export function ChatTodoListRow({
  row,
  items,
  loadingItems,
  onExpand,
  onToggleItem,
}: ChatTodoListRowProps) {
  const { colors } = useTheme();
  const expanded = items.length > 0 || loadingItems;
  // Chevron rotation driven by Animated.timing (useNativeDriver: true)
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
        container: {
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          minHeight: 56,
          gap: SPACING.sm,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          minHeight: 44,
        },
        headerPressed: { opacity: 0.75 },
        headerText: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        progressText: {
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
          paddingLeft: SPACING.lg,
          gap: SPACING.xs,
        },
        itemRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.sm,
          gap: SPACING.md,
          minHeight: 44,
        },
        itemTitle: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        itemTitleCompleted: {
          textDecorationLine: 'line-through',
          opacity: 0.6,
        },
        itemToggleWrapper: {
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        },
        itemCheckbox: {
          width: 24,
          height: 24,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
        },
        skeletonRow: {
          marginVertical: SPACING.xs,
        },
      }),
    [colors]
  );

  function handleHeaderPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Trigger LayoutAnimation BEFORE invoking the parent callback so the
    // parent's setState-driven re-render gets the easeInEaseOut transition
    // (per UI-SPEC §Animation > Chat to-do list expand).
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onExpand(row.list_id);
  }

  async function handleItemToggle(itemId: string, wasCompleted: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const result = await onToggleItem(itemId);
    if (!wasCompleted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    return result;
  }

  // Sort: incomplete first, completed last (per plan §action).
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDone = a.completed_at !== null ? 1 : 0;
      const bDone = b.completed_at !== null ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.position - b.position;
    });
  }, [items]);

  const rotateInterpolation = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const a11yLabel = row.is_list
    ? `To-do list ${row.title}, ${row.done_count} of ${row.total_count} done`
    : `To-do ${row.title}`;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleHeaderPress}
        style={({ pressed }) => [styles.headerRow, pressed && styles.headerPressed]}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Tap to expand"
      >
        <Text style={styles.headerText} numberOfLines={1}>
          {`📋 ${row.title}`}
        </Text>
        <Text style={styles.progressText}>{`· ${row.done_count}/${row.total_count} done`}</Text>
        <Animated.View
          style={[styles.chevronWrap, { transform: [{ rotate: rotateInterpolation }] }]}
        >
          <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
        </Animated.View>
      </Pressable>

      {expanded && (
        <View style={styles.itemsList}>
          {loadingItems && items.length === 0 ? (
            <>
              {[0, 1, 2].map((n) => (
                <View key={n} style={styles.skeletonRow}>
                  <SkeletonPulse width="100%" height={40} />
                </View>
              ))}
            </>
          ) : (
            sortedItems.map((item) => {
              const completed = item.completed_at !== null;
              const itemCheckboxStyle = completed
                ? {
                    backgroundColor: TILE_ACCENTS.todos + ACCENT_FILL,
                    borderColor: TILE_ACCENTS.todos,
                  }
                : {
                    backgroundColor: 'transparent',
                    borderColor: colors.text.secondary,
                  };
              return (
                <View key={item.id} style={styles.itemRow}>
                  <Text
                    style={[styles.itemTitle, completed && styles.itemTitleCompleted]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Pressable
                    style={styles.itemToggleWrapper}
                    onPress={() => handleItemToggle(item.id, completed)}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: completed }}
                    accessibilityLabel={
                      completed ? `Mark "${item.title}" not done` : `Mark "${item.title}" done`
                    }
                  >
                    <View style={[styles.itemCheckbox, itemCheckboxStyle]}>
                      {completed && (
                        <Ionicons name="checkmark" size={14} color={TILE_ACCENTS.todos} />
                      )}
                    </View>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}
