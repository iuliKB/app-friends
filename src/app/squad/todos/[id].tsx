// Phase 29.1 Plan 06 — To-Do detail screen.
// Route: /squad/todos/[id]
//
// The `id` param may correspond to either:
//   • A Mine row in the `todos` table (created by caller), OR
//   • A chat-origin item in the `chat_todo_items` table.
//
// Disambiguation: try the personal todos lookup first; fall back to the
// chat_todo_items lookup (with parent list + group channel name join) when
// not found. RLS gates both reads to authorized callers.
//
// Layout:
//   • ScreenHeader (truncated title)
//   • Origin caption: `Mine` for personal; `From {chat_name}` for chat-origin
//   • Due-date label: `Due {formatted}` or `No due date`
//   • Notes section (Mine only — chat items have no notes)
//   • Priority chip (Mine only — chat items have no priority)
//   • Mark done / Mark not done CTA
//   • Delete button (Mine only; chat items live in chat_todo_items and the
//     list creator owns deletion)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { supabase } from '@/lib/supabase';
import { TILE_ACCENTS, ACCENT_FILL } from '@/components/squad/bento/tileAccents';
import type { Todo, TodoPriority } from '@/types/todos';

type MineDetail = {
  flavor: 'mine';
  id: string;
  title: string;
  due_date: string | null;
  notes: string | null;
  priority: TodoPriority;
  completed_at: string | null;
};

type ChatDetail = {
  flavor: 'chat';
  id: string;
  list_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  chat_name: string;
};

type Detail = MineDetail | ChatDetail;

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + '…';
}

function formatLongDate(dateLocal: string): string {
  const parts = dateLocal.split('-');
  const y = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 1);
  const d = Number(parts[2] ?? 1);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function priorityLabel(priority: TodoPriority): string {
  return priority === 'low' ? 'Low' : priority === 'high' ? 'High' : 'Medium';
}

export default function TodoDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const todoId = id ?? '';

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!todoId) {
      setError('Missing to-do id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    // 1. Try Mine lookup first — `todos` table is the more common case and RLS
    //    silently filters non-owned rows so we won't get a false positive.
    // Cast through any: database.ts not regenerated since migration 0024.
    const { data: mineData, error: mineErr } = await (supabase as any)
      .from('todos')
      .select('*')
      .eq('id', todoId)
      .maybeSingle();

    if (mineErr) {
      console.warn('todos detail fetch failed', mineErr);
    }
    if (mineData) {
      const row = mineData as Todo;
      setDetail({
        flavor: 'mine',
        id: row.id,
        title: row.title,
        due_date: row.due_date,
        notes: row.notes,
        priority: row.priority,
        completed_at: row.completed_at,
      });
      setLoading(false);
      return;
    }

    // 2. Fall back to chat_todo_items + parent list + group channel name.
    const { data: chatData, error: chatErr } = await (supabase as any)
      .from('chat_todo_items')
      .select('*, chat_todo_lists!inner(*, group_channels!inner(name))')
      .eq('id', todoId)
      .maybeSingle();

    if (chatErr) {
      console.warn('chat_todo_items detail fetch failed', chatErr);
      setError(chatErr.message);
      setLoading(false);
      return;
    }
    if (!chatData) {
      setError('To-do not found');
      setLoading(false);
      return;
    }
    const c = chatData as {
      id: string;
      list_id: string;
      title: string;
      due_date: string | null;
      completed_at: string | null;
      chat_todo_lists?: {
        group_channels?: { name?: string | null } | null;
      } | null;
    };
    setDetail({
      flavor: 'chat',
      id: c.id,
      list_id: c.list_id,
      title: c.title,
      due_date: c.due_date,
      completed_at: c.completed_at,
      chat_name: c.chat_todo_lists?.group_channels?.name ?? 'a chat',
    });
    setLoading(false);
  }, [todoId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const handleToggleDone = useCallback(async () => {
    if (!detail || toggling) return;
    setToggling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const wasCompleted = detail.completed_at !== null;
    if (detail.flavor === 'mine') {
      // Direct UPDATE — RLS UPDATE policy gates on user_id = auth.uid().
      const newCompletedAt = wasCompleted ? null : new Date().toISOString();
      const { error: updErr } = await (supabase as any)
        .from('todos')
        .update({ completed_at: newCompletedAt })
        .eq('id', detail.id);
      setToggling(false);
      if (updErr) {
        console.warn('todos update failed', updErr);
        Alert.alert("Couldn't save", updErr.message);
        return;
      }
      setDetail({ ...detail, completed_at: newCompletedAt });
    } else {
      // Chat-origin: RPC handles atomic state update + system message insert.
      // Idempotent — already-complete items return NULL and the local row
      // already reflects completion.
      if (wasCompleted) {
        // For chat-origin we only support completing (the RPC is
        // complete_chat_todo). Un-completing is out of scope for v1.
        setToggling(false);
        return;
      }
      const { error: rpcErr } = await (supabase as any).rpc('complete_chat_todo', {
        p_item_id: detail.id,
      });
      setToggling(false);
      if (rpcErr) {
        console.warn('complete_chat_todo failed', rpcErr);
        Alert.alert("Couldn't save", rpcErr.message);
        return;
      }
      setDetail({ ...detail, completed_at: new Date().toISOString() });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [detail, toggling]);

  const handleDelete = useCallback(() => {
    if (!detail || detail.flavor !== 'mine') return;
    Alert.alert('Delete to-do?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (deleting) return;
          setDeleting(true);
          const { error: delErr } = await (supabase as any)
            .from('todos')
            .delete()
            .eq('id', detail.id);
          setDeleting(false);
          if (delErr) {
            console.warn('todos delete failed', delErr);
            Alert.alert("Couldn't delete", delErr.message);
            return;
          }
          router.back();
        },
      },
    ]);
  }, [detail, deleting, router]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        content: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.xxl,
          gap: SPACING.xl,
        },
        sectionLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          marginBottom: SPACING.sm,
        },
        captionText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        bodyText: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          paddingHorizontal: SPACING.sm,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 4,
          borderRadius: RADII.full,
          borderWidth: 1,
        },
        chipText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          letterSpacing: 0.5,
        },
        toggleButton: {
          paddingVertical: SPACING.lg,
          paddingHorizontal: SPACING.lg,
          borderRadius: RADII.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: SPACING.sm,
        },
        toggleButtonPending: {
          borderWidth: 1.5,
          borderColor: TILE_ACCENTS.todos,
          backgroundColor: TILE_ACCENTS.todos + ACCENT_FILL,
        },
        toggleButtonDone: {
          backgroundColor: TILE_ACCENTS.todos,
        },
        toggleLabelPending: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: TILE_ACCENTS.todos,
        },
        toggleLabelDone: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.surface.base,
        },
        deleteButton: {
          paddingVertical: SPACING.lg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        deleteText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.interactive.destructive,
        },
        errorText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.interactive.destructive,
          padding: SPACING.lg,
          textAlign: 'center',
        },
        skeletonRow: {
          marginVertical: SPACING.sm,
        },
        notesText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
          lineHeight: 22,
        },
      }),
    [colors]
  );

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.skeletonRow}>
          <SkeletonPulse width="100%" height={42} />
        </View>
        <View style={styles.skeletonRow}>
          <SkeletonPulse width="100%" height={42} />
        </View>
        <View style={styles.skeletonRow}>
          <SkeletonPulse width="100%" height={42} />
        </View>
      </ScrollView>
    );
  }

  if (error || !detail) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={fetchDetail}
            tintColor={colors.interactive.accent}
          />
        }
      >
        <Text style={styles.errorText}>
          {error ?? "Couldn't load to-do. Pull down to refresh."}
        </Text>
      </ScrollView>
    );
  }

  const isCompleted = detail.completed_at !== null;
  const dueLabel = detail.due_date ? `Due ${formatLongDate(detail.due_date)}` : 'No due date';
  const originCaption = detail.flavor === 'mine' ? 'Mine' : `From ${detail.chat_name}`;
  const toggleLabel = isCompleted ? 'Mark not done' : 'Mark done';
  const headerTitle = truncate(detail.title, 24);

  // Priority chip palette mirrors TodoRow (only relevant for Mine flavor).
  const priorityBorderColor =
    detail.flavor === 'mine'
      ? detail.priority === 'high'
        ? colors.interactive.destructive
        : detail.priority === 'medium'
          ? colors.feedback.info
          : colors.text.secondary
      : colors.text.secondary;
  const priorityBgColor = priorityBorderColor + ACCENT_FILL;

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={fetchDetail}
            tintColor={colors.interactive.accent}
          />
        }
      >
        {/* Origin caption */}
        <View>
          <Text style={styles.captionText}>{originCaption}</Text>
          <Text style={styles.bodyText}>{detail.title}</Text>
        </View>

        {/* Due-date label */}
        <View>
          <Text style={styles.sectionLabel}>Due date</Text>
          <Text style={styles.bodyText}>{dueLabel}</Text>
        </View>

        {/* Notes (Mine only, non-empty) */}
        {detail.flavor === 'mine' && detail.notes && detail.notes.trim().length > 0 && (
          <View>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notesText}>{detail.notes}</Text>
          </View>
        )}

        {/* Priority chip (Mine only) */}
        {detail.flavor === 'mine' && (
          <View>
            <Text style={styles.sectionLabel}>Priority</Text>
            <View
              style={[
                styles.chip,
                { borderColor: priorityBorderColor, backgroundColor: priorityBgColor },
              ]}
            >
              <Text style={[styles.chipText, { color: priorityBorderColor }]}>
                {priorityLabel(detail.priority)}
              </Text>
            </View>
          </View>
        )}

        {/* Mark done / Mark not done */}
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isCompleted ? styles.toggleButtonDone : styles.toggleButtonPending,
          ]}
          onPress={handleToggleDone}
          disabled={toggling || (detail.flavor === 'chat' && isCompleted)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ checked: isCompleted }}
          accessibilityLabel={toggleLabel}
        >
          {toggling ? (
            <ActivityIndicator
              size="small"
              color={isCompleted ? colors.surface.base : TILE_ACCENTS.todos}
            />
          ) : (
            <>
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={isCompleted ? colors.surface.base : TILE_ACCENTS.todos}
              />
              <Text style={isCompleted ? styles.toggleLabelDone : styles.toggleLabelPending}>
                {isCompleted ? '✓ Done' : toggleLabel}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete (Mine only) */}
        {detail.flavor === 'mine' && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Delete to-do"
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.interactive.destructive} />
            ) : (
              <Text style={styles.deleteText}>Delete to-do</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}
