// Phase 29.1 Plan 06 — To-Dos list screen.
// Route: /squad/todos (Expo Router maps todos/index.tsx → /squad/todos).
//
// Layout (D-04): SectionList with two sections — "Mine" + "From chats".
//   • "Mine" section renders TodoRow for each MyTodoRow with TodoQuickAdd inline
//   • "From chats" section renders ChatTodoListRow for each ChatTodoRow (D-13);
//     parent owns expanded state and lazy-fetches child items on first expand.
//   • Collapsible section headers (local state, toggled with LayoutAnimation).
//   • Empty body copy per UI-SPEC §Copywriting Contract.
//   • FAB "+ New to-do" → /squad/todos/create.
//   • RefreshControl wired to useTodos.refetch.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
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
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { FAB } from '@/components/common/FAB';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { TodoRow } from '@/components/todos/TodoRow';
import { ChatTodoListRow } from '@/components/todos/ChatTodoListRow';
import { TodoQuickAdd } from '@/components/todos/TodoQuickAdd';
import { useTodos } from '@/hooks/useTodos';
import { supabase } from '@/lib/supabase';
import type { ChatTodoItem, ChatTodoRow, MyTodoRow } from '@/types/todos';

// Android opt-in for LayoutAnimation (same precedent as ChatTodoListRow).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SectionData = { kind: 'mine'; data: MyTodoRow[] } | { kind: 'chat'; data: ChatTodoRow[] };

type SectionShape = SectionData & { title: 'Mine' | 'From chats' };

export default function TodosIndexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { mine, fromChats, loading, error, refetch, completeTodo, completeChatTodo } = useTodos();
  const [mineExpanded, setMineExpanded] = useState(true);
  const [chatExpanded, setChatExpanded] = useState(true);
  // Cache of fetched chat-todo-list items, keyed by list_id.
  const [itemsByList, setItemsByList] = useState<Record<string, ChatTodoItem[]>>({});
  // Tracks which list_ids are currently being fetched (avoid duplicate requests).
  const [loadingLists, setLoadingLists] = useState<Set<string>>(new Set());

  // Default the "From chats" section to collapsed if zero items (UI-SPEC §Layout).
  useEffect(() => {
    if (!loading && fromChats.length === 0) {
      setChatExpanded(false);
    }
  }, [loading, fromChats.length]);

  // Re-fetch on screen focus so adding a to-do elsewhere or completing one in
  // a chat reflects when the user returns.
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

  // Lazy-fetch child items when a chat-todo list is expanded for the first time.
  const handleChatListExpand = useCallback(
    async (listId: string) => {
      // Toggle: if already expanded (items cached and non-empty), collapse by
      // clearing the cache entry.
      if (itemsByList[listId] && itemsByList[listId].length > 0) {
        setItemsByList((prev) => {
          const next = { ...prev };
          delete next[listId];
          return next;
        });
        return;
      }
      if (loadingLists.has(listId)) return;
      setLoadingLists((prev) => {
        const next = new Set(prev);
        next.add(listId);
        return next;
      });
      // Cast through any: database.ts not regenerated since migration 0024
      // (same pattern as Plan 03 hooks and Plan 05 screens).
      const { data, error: queryErr } = await (supabase as any)
        .from('chat_todo_items')
        .select('*')
        .eq('list_id', listId)
        .order('position', { ascending: true });
      setLoadingLists((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
      if (queryErr) {
        console.warn('chat_todo_items fetch failed', queryErr);
        return;
      }
      setItemsByList((prev) => ({
        ...prev,
        [listId]: (data ?? []) as ChatTodoItem[],
      }));
    },
    [itemsByList, loadingLists]
  );

  const handleChatItemToggle = useCallback(
    async (itemId: string) => {
      const result = await completeChatTodo(itemId);
      // Refresh the affected list's items so the row reflects the new
      // completed_at (sortedItems puts completed at the end).
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

  const handleQuickAdd = useCallback(
    async (title: string) => {
      // Cast through any: database.ts not regenerated since migration 0024.
      const { error: rpcErr } = await (supabase as any).rpc('create_todo', {
        p_title: title,
        p_due_date: null,
        p_notes: null,
        p_priority: 'medium',
      });
      if (rpcErr) {
        console.warn('create_todo failed', rpcErr);
        return { error: rpcErr.message };
      }
      await refetch();
      return { error: null };
    },
    [refetch]
  );

  const toggleSection = useCallback((section: 'mine' | 'chat') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (section === 'mine') setMineExpanded((v) => !v);
    else setChatExpanded((v) => !v);
  }, []);

  const sections: SectionShape[] = useMemo(() => {
    return [
      { kind: 'mine' as const, title: 'Mine' as const, data: mineExpanded ? mine : [] },
      {
        kind: 'chat' as const,
        title: 'From chats' as const,
        data: chatExpanded ? fromChats : [],
      },
    ];
  }, [mine, fromChats, mineExpanded, chatExpanded]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        headerContainer: { paddingHorizontal: SPACING.lg },
        listContent: { paddingBottom: SPACING.xxl },
        emptyContainer: { flex: 1 },
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
        sectionEmptyBody: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.md,
        },
        separator: {
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

  function renderSectionHeader(section: SectionShape) {
    const isMine = section.kind === 'mine';
    const expanded = isMine ? mineExpanded : chatExpanded;
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
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
        {/* TodoQuickAdd lives inside the Mine section header so it stays
            visually grouped with personal todos even when expanded. */}
        {isMine && expanded && <TodoQuickAdd onAdd={handleQuickAdd} />}
        {/* Per-section empty copy when expanded with zero items */}
        {expanded && isMine && mine.length === 0 && (
          <Text style={styles.sectionEmptyBody}>
            Nothing on your list. Quick-add with the + below.
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
        <View style={styles.headerContainer}>
          <ScreenHeader title="To-Dos" />
        </View>
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
        <View style={styles.headerContainer}>
          <ScreenHeader title="To-Dos" />
        </View>
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
      <View style={styles.headerContainer}>
        <ScreenHeader title="To-Dos" />
      </View>
      <SectionList<MyTodoRow | ChatTodoRow, SectionShape>
        sections={sections}
        keyExtractor={(item, idx) => {
          // Discriminate by shape — MyTodoRow has `id`, ChatTodoRow has `list_id`.
          if ('id' in item) return `mine-${item.id}`;
          if ('list_id' in item) return `chat-${item.list_id}`;
          return `idx-${idx}`;
        }}
        renderSectionHeader={({ section }) => renderSectionHeader(section)}
        renderItem={({ item, section }) => {
          if (section.kind === 'mine') {
            const t = item as MyTodoRow;
            return <TodoRow todo={t} onToggle={completeTodo} onPress={handleRowPress} />;
          }
          const row = item as ChatTodoRow;
          return (
            <ChatTodoListRow
              row={row}
              items={itemsByList[row.list_id] ?? []}
              loadingItems={loadingLists.has(row.list_id)}
              onExpand={() => void handleChatListExpand(row.list_id)}
              onToggleItem={handleChatItemToggle}
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
          // Zero-in-both empty state (UI-SPEC §Copywriting Contract).
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
