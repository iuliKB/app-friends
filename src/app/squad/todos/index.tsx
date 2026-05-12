// Phase 29.1 Plan 06 — To-Dos list screen.
// Route: /squad/todos (Expo Router maps todos/index.tsx → /squad/todos).
//
// Layout:
//   • Header comes from src/app/squad/_layout.tsx (Stack.Screen title "To-Dos")
//   • 3-tile metric row (Overdue / Today / This week) — counts active items only
//   • SectionList with two collapsible sections — "Mine" + "From chats"
//   • "From chats" is flattened: each chat-todo-item renders as a flat row
//     (TodoRow visual), source list shown as small attribution below the title
//   • FAB "+ New to-do" → /squad/todos/create

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';
import { EmptyState } from '@/components/common/EmptyState';
import { FAB } from '@/components/common/FAB';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { TodoRow } from '@/components/todos/TodoRow';
import { ChatTodoListRow } from '@/components/todos/ChatTodoListRow';
import { useTodos } from '@/hooks/useTodos';
import { supabase } from '@/lib/supabase';
import type { ChatTodoItem, ChatTodoRow, MyTodoRow } from '@/types/todos';

// Android opt-in for LayoutAnimation.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Wrapper for chat-todo-items in the flattened "From chats" section.
// Carries the parent list title alongside the item for attribution.
interface ChatFlat {
  flatItem: ChatTodoItem;
  flatListTitle: string;
}

type ListItem = MyTodoRow | ChatFlat;
type SectionData =
  | { kind: 'mine'; data: MyTodoRow[] }
  | { kind: 'chat'; data: ChatFlat[] };
type SectionShape = SectionData & { title: 'Mine' | 'From chats' };

function daysUntilLocal(dateLocal: string): number {
  const parts = dateLocal.split('-');
  const y = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 1);
  const d = Number(parts[2] ?? 1);
  const due = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

interface MetricTileProps {
  label: string;
  count: number;
  tone: 'destructive' | 'accent' | 'neutral';
}

function MetricTile({ label, count, tone }: MetricTileProps) {
  const { colors, isDark } = useTheme();
  const isActive = count > 0;

  const accentBg = isDark ? 'rgba(185,255,59,0.10)' : 'rgba(77,124,0,0.06)';
  const destructiveBg = isDark ? 'rgba(248,113,113,0.10)' : 'rgba(220,38,38,0.06)';

  const heroColor = !isActive
    ? colors.text.secondary
    : tone === 'destructive'
      ? colors.interactive.destructive
      : tone === 'accent'
        ? colors.interactive.accent
        : colors.text.primary;

  const tileBg = !isActive
    ? colors.surface.card
    : tone === 'destructive'
      ? destructiveBg
      : tone === 'accent'
        ? accentBg
        : colors.surface.card;

  const tileBorder = !isActive
    ? colors.border
    : tone === 'destructive'
      ? colors.interactive.destructive
      : tone === 'accent'
        ? colors.interactive.accent
        : colors.border;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tile: {
          flex: 1,
          borderRadius: RADII.lg,
          borderWidth: 1,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          minHeight: 84,
          justifyContent: 'space-between',
        },
        eyebrow: {
          fontFamily: FONT_FAMILY.display.semibold,
          fontSize: FONT_SIZE.xs,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: colors.text.secondary,
        },
        hero: {
          fontSize: FONT_SIZE.xxxl,
          fontFamily: FONT_FAMILY.display.bold,
          letterSpacing: -0.5,
        },
      }),
    [colors]
  );

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: tileBg, borderColor: tileBorder },
      ]}
    >
      <Text style={styles.eyebrow}>{label}</Text>
      <Text style={[styles.hero, { color: heroColor }]}>{count}</Text>
    </View>
  );
}

export default function TodosIndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { mine, fromChats, loading, error, refetch, completeTodo, completeChatTodo } = useTodos();
  const [mineExpanded, setMineExpanded] = useState(true);
  const [chatExpanded, setChatExpanded] = useState(true);
  const [itemsByList, setItemsByList] = useState<Record<string, ChatTodoItem[]>>({});
  // Tracks which list_ids have been fetched (or are in-flight) so the
  // auto-load effect doesn't re-fire after state updates.
  const loadedListsRef = useRef<Set<string>>(new Set());

  // Default "From chats" to collapsed when empty (UI-SPEC).
  useEffect(() => {
    if (!loading && fromChats.length === 0) {
      setChatExpanded(false);
    }
  }, [loading, fromChats.length]);

  // Auto-load child items for every "From chats" list as soon as the row data
  // arrives — the screen renders each item as a flat row, so we always need
  // the full item list per parent list.
  useEffect(() => {
    fromChats.forEach(async (row) => {
      const listId = row.list_id;
      if (loadedListsRef.current.has(listId)) return;
      loadedListsRef.current.add(listId);
      const { data, error: queryErr } = await (supabase as any)
        .from('chat_todo_items')
        .select('*')
        .eq('list_id', listId)
        .order('position', { ascending: true });
      if (queryErr) {
        console.warn('chat_todo_items fetch failed', queryErr);
        loadedListsRef.current.delete(listId);
        return;
      }
      setItemsByList((prev) => ({
        ...prev,
        [listId]: (data ?? []) as ChatTodoItem[],
      }));
    });
  }, [fromChats]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const handleRowPress = useCallback(
    (todoId: string) => {
      router.push({
        pathname: '/squad/todos/[id]' as never,
        params: { id: todoId },
      } as never);
    },
    [router]
  );

  const handleChatItemToggle = useCallback(
    async (itemId: string) => {
      const result = await completeChatTodo(itemId);
      const ownerListId = Object.entries(itemsByList).find(([, items]) =>
        items.some((i) => i.id === itemId)
      )?.[0];
      if (ownerListId) {
        const { data, error: queryErr } = await (supabase as any)
          .from('chat_todo_items')
          .select('*')
          .eq('list_id', ownerListId)
          .order('position', { ascending: true });
        if (!queryErr) {
          setItemsByList((prev) => ({
            ...prev,
            [ownerListId]: (data ?? []) as ChatTodoItem[],
          }));
        }
      }
      return result;
    },
    [completeChatTodo, itemsByList]
  );

  const toggleSection = useCallback((section: 'mine' | 'chat') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (section === 'mine') setMineExpanded((v) => !v);
    else setChatExpanded((v) => !v);
  }, []);

  // Metrics — count only active (uncompleted) items across both sections.
  const metrics = useMemo(() => {
    const activeMine = mine.filter((t) => !t.completed_at);
    const overdueCount =
      activeMine.filter((t) => t.is_overdue).length +
      fromChats.filter((c) => c.is_overdue).length;
    const todayCount =
      activeMine.filter((t) => t.is_due_today).length +
      fromChats.filter((c) => c.is_due_today).length;
    const thisWeekCount =
      activeMine.filter((t) => {
        if (t.is_overdue || t.is_due_today || !t.due_date) return false;
        const days = daysUntilLocal(t.due_date);
        return days > 0 && days <= 7;
      }).length +
      fromChats.filter((c) => {
        if (c.is_overdue || c.is_due_today || !c.next_due_date) return false;
        const days = daysUntilLocal(c.next_due_date);
        return days > 0 && days <= 7;
      }).length;
    return { overdueCount, todayCount, thisWeekCount };
  }, [mine, fromChats]);

  // Flatten chat lists into individual items so they render as TodoRow-style
  // rows under the "From chats" section. Each item carries its parent list
  // title for attribution.
  const flatChatItems: ChatFlat[] = useMemo(() => {
    return fromChats.flatMap((list) => {
      const items = itemsByList[list.list_id] ?? [];
      return items.map((item) => ({ flatItem: item, flatListTitle: list.title }));
    });
  }, [fromChats, itemsByList]);

  const sections: SectionShape[] = useMemo(() => {
    return [
      { kind: 'mine' as const, title: 'Mine' as const, data: mineExpanded ? mine : [] },
      {
        kind: 'chat' as const,
        title: 'From chats' as const,
        data: chatExpanded ? flatChatItems : [],
      },
    ];
  }, [mine, flatChatItems, mineExpanded, chatExpanded]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        listContent: { paddingBottom: SPACING.xxl },
        emptyContainer: { flex: 1 },
        metricsRow: {
          flexDirection: 'row',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.md,
        },
        sectionHeaderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.sm,
          gap: SPACING.sm,
        },
        sectionHeaderLabel: {
          flex: 1,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        sectionCount: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
        },
        sectionEmptyBody: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.md,
        },
        separator: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          height: 1,
          backgroundColor: colors.border,
          marginHorizontal: SPACING.lg,
        },
        skeletonRow: {
          marginHorizontal: SPACING.lg,
          marginVertical: SPACING.sm,
        },
      }),
    [colors]
  );

  function renderMetricsHeader() {
    return (
      <View style={styles.metricsRow}>
        <MetricTile label="Overdue" count={metrics.overdueCount} tone="destructive" />
        <MetricTile label="Today" count={metrics.todayCount} tone="accent" />
        <MetricTile label="This week" count={metrics.thisWeekCount} tone="neutral" />
      </View>
    );
  }

  function renderSectionHeader(section: SectionShape) {
    const isMine = section.kind === 'mine';
    const expanded = isMine ? mineExpanded : chatExpanded;
    const totalItems = isMine ? mine.length : flatChatItems.length;
    return (
      <View>
        <TouchableOpacity
          onPress={() => toggleSection(isMine ? 'mine' : 'chat')}
          style={styles.sectionHeaderRow}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${section.title}. Tap to ${expanded ? 'collapse' : 'expand'}.`}
        >
          <Text style={styles.sectionHeaderLabel}>{section.title}</Text>
          {totalItems > 0 && <Text style={styles.sectionCount}>{totalItems}</Text>}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
        {expanded && isMine && mine.length === 0 && (
          <Text style={styles.sectionEmptyBody}>
            Nothing on your list. Tap + to add one.
          </Text>
        )}
        {expanded && !isMine && fromChats.length === 0 && (
          <Text style={styles.sectionEmptyBody}>
            No to-dos from chats. Friends can send you tasks from any group chat.
          </Text>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {[0, 1, 2, 3].map((n) => (
          <View key={n} style={styles.skeletonRow}>
            <SkeletonPulse width="100%" height={56} />
          </View>
        ))}
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <SectionList
          sections={[]}
          keyExtractor={() => ''}
          renderItem={() => null}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={colors.interactive.accent}
              accessibilityLabel="Refresh to-dos"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="warning-outline"
              iconType="ionicons"
              heading="Couldn't load to-dos"
              body="Check your connection and try again."
              ctaLabel="Retry"
              onCta={() => void refetch()}
            />
          }
        />
      </SafeAreaView>
    );
  }

  const totalCount = mine.length + fromChats.length;
  const isAbsoluteEmpty = totalCount === 0;

  return (
    <SafeAreaView style={styles.container}>
      <SectionList<ListItem, SectionShape>
        sections={sections}
        keyExtractor={(item, idx) => {
          if ('flatItem' in item) return `chat-${item.flatItem.id}`;
          if ('id' in item) return `mine-${item.id}`;
          return `idx-${idx}`;
        }}
        ListHeaderComponent={renderMetricsHeader()}
        renderSectionHeader={({ section }) => renderSectionHeader(section)}
        renderItem={({ item, section }) => {
          if (section.kind === 'mine') {
            return (
              <TodoRow
                todo={item as MyTodoRow}
                onToggle={completeTodo}
                onPress={handleRowPress}
              />
            );
          }
          const flat = item as ChatFlat;
          return (
            <ChatTodoListRow
              item={flat.flatItem}
              listTitle={flat.flatListTitle}
              onToggle={handleChatItemToggle}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={isAbsoluteEmpty ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.interactive.accent}
            accessibilityLabel="Refresh to-dos"
          />
        }
        ListEmptyComponent={
          isAbsoluteEmpty ? (
            <EmptyState
              icon="checkmark-done-outline"
              iconType="ionicons"
              heading="Inbox zero"
              body="Add your first to-do, or have a friend send you one in chat."
              ctaLabel="Add a to-do"
              onCta={() => router.push('/squad/todos/create' as never)}
            />
          ) : null
        }
      />
      <FAB
        icon={<Ionicons name="add" size={22} color={colors.surface.base} />}
        label="New to-do"
        onPress={() => router.push('/squad/todos/create' as never)}
        accessibilityLabel="New to-do"
      />
    </SafeAreaView>
  );
}
