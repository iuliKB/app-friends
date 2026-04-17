// Phase 11 v1.4 — Collapsible wish list panel with voting in birthday group chats.
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';
import { useFriendWishList } from '@/hooks/useFriendWishList';
import { useWishListVotes } from '@/hooks/useWishListVotes';

interface BirthdayWishListPanelProps {
  birthdayPersonId: string;
  groupChannelId: string;
  birthdayPersonName?: string;
}

export function BirthdayWishListPanel({ birthdayPersonId, groupChannelId, birthdayPersonName }: BirthdayWishListPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const { items, loading } = useFriendWishList(birthdayPersonId);
  const itemIds = items.map((i) => i.id);
  const { voteState, toggleVote } = useWishListVotes(groupChannelId, itemIds);

  const name = birthdayPersonName ?? 'Their';

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.headerText}>🎁 {name}'s Wish List</Text>
        <View style={styles.headerRight}>
          {!loading && <Text style={styles.count}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>}
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={COLORS.interactive.accent} />
            </View>
          ) : items.length === 0 ? (
            <Text style={styles.emptyText}>No wish list items yet.</Text>
          ) : (
            items.map((item) => {
              const count = voteState.voteCounts[item.id] ?? 0;
              const voted = voteState.myVotes.has(item.id);
              return (
                <View key={item.id} style={styles.row}>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                    {item.url ? <Text style={styles.itemUrl} numberOfLines={1}>{item.url}</Text> : null}
                    {item.notes ? <Text style={styles.itemNotes} numberOfLines={2}>{item.notes}</Text> : null}
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.voteBtn, voted && styles.voteBtnActive, pressed && { opacity: 0.7 }]}
                    onPress={() => void toggleVote(item.id)}
                    accessibilityLabel={voted ? 'Remove vote' : 'Vote for this gift'}
                  >
                    <Text style={[styles.voteEmoji]}>👍</Text>
                    {count > 0 && (
                      <Text style={[styles.voteCount, voted && styles.voteCountActive]}>{count}</Text>
                    )}
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  count: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  chevron: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.secondary,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  loadingRow: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  itemUrl: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.interactive.accent,
    marginTop: SPACING.xs,
  },
  itemNotes: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  voteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface.base,
    minWidth: 48,
  },
  voteBtnActive: {
    backgroundColor: COLORS.interactive.accent,
  },
  voteEmoji: {
    fontSize: FONT_SIZE.lg,
  },
  voteCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  voteCountActive: {
    color: COLORS.surface.base,
  },
});
