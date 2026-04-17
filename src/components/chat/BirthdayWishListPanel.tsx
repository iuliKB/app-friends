// Phase 11 v1.4 — Collapsible birthday info panel with wish list, voting + claiming in birthday group chats.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useFriendWishList } from '@/hooks/useFriendWishList';
import { useWishListVotes } from '@/hooks/useWishListVotes';
import { formatBirthdayDate, formatTurningAge } from '@/utils/birthdayFormatters';

interface BirthdayWishListPanelProps {
  birthdayPersonId: string;
  groupChannelId: string;
  birthdayPersonName?: string;
}

interface BirthdayInfo {
  month: number;
  day: number;
  year: number | null;
}

export function BirthdayWishListPanel({ birthdayPersonId, groupChannelId, birthdayPersonName }: BirthdayWishListPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [birthdayInfo, setBirthdayInfo] = useState<BirthdayInfo | null>(null);
  const { items, loading, toggleClaim } = useFriendWishList(birthdayPersonId);
  const itemIds = items.map((i) => i.id);
  const { voteState, toggleVote } = useWishListVotes(groupChannelId, itemIds);

  const name = birthdayPersonName ?? 'Their';

  useEffect(() => {
    supabase
      .from('profiles')
      .select('birthday_month, birthday_day, birthday_year')
      .eq('id', birthdayPersonId)
      .single()
      .then(({ data }) => {
        if (data?.birthday_month && data?.birthday_day) {
          setBirthdayInfo({
            month: data.birthday_month as number,
            day: data.birthday_day as number,
            year: (data.birthday_year as number | null) ?? null,
          });
        }
      });
  }, [birthdayPersonId]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <Text style={styles.headerText}>🎁 {name}'s Birthday</Text>
        <View style={styles.headerRight}>
          {birthdayInfo && !expanded && (
            <Text style={styles.headerSubtitle}>
              {formatBirthdayDate(birthdayInfo.month, birthdayInfo.day)}
              {birthdayInfo.year !== null
                ? ` · ${formatTurningAge(birthdayInfo.year, birthdayInfo.month, birthdayInfo.day)}`
                : ''}
            </Text>
          )}
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          {/* Birthday info row */}
          {birthdayInfo && (
            <View style={styles.birthdayInfoRow}>
              <Text style={styles.birthdayInfoText}>
                🎂{'  '}
                {formatBirthdayDate(birthdayInfo.month, birthdayInfo.day)}
                {birthdayInfo.year !== null
                  ? `  ·  ${formatTurningAge(birthdayInfo.year, birthdayInfo.month, birthdayInfo.day)}`
                  : ''}
              </Text>
            </View>
          )}

          {/* Wish list section label */}
          <View style={styles.wishListHeader}>
            <Text style={styles.wishListLabel}>Wish List</Text>
            {!loading && (
              <Text style={styles.count}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
            )}
          </View>

          {/* Wish list items */}
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
                    {item.isClaimed && !item.isClaimedByMe && (
                      <Text style={styles.claimedBadge}>
                        🛍 {item.claimerName ? `${item.claimerName} is buying this` : 'Someone is buying this'}
                      </Text>
                    )}
                    {item.isClaimedByMe && (
                      <Text style={styles.claimedByMeBadge}>You're buying this</Text>
                    )}
                  </View>
                  <View style={styles.actions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.claimBtn,
                        item.isClaimedByMe && styles.claimBtnActive,
                        item.isClaimed && !item.isClaimedByMe && styles.claimBtnDisabled,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => void toggleClaim(item.id, item.isClaimedByMe)}
                      disabled={item.isClaimed && !item.isClaimedByMe}
                      accessibilityLabel={item.isClaimedByMe ? 'Cancel claim' : 'I\'ll buy this alone'}
                    >
                      <Text style={[styles.claimBtnText, item.isClaimedByMe && styles.claimBtnTextActive]}>
                        {item.isClaimedByMe ? '✓ I\'ll buy' : '🛍'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.voteBtn, voted && styles.voteBtnActive, pressed && { opacity: 0.7 }]}
                      onPress={() => void toggleVote(item.id)}
                      accessibilityLabel={voted ? 'Remove vote' : 'Vote for this gift'}
                    >
                      <Text style={styles.voteEmoji}>👍</Text>
                      {count > 0 && (
                        <Text style={[styles.voteCount, voted && styles.voteCountActive]}>{count}</Text>
                      )}
                    </Pressable>
                  </View>
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
  headerSubtitle: {
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
  birthdayInfoRow: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  birthdayInfoText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  wishListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  wishListLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  count: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
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
  claimedBadge: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  claimedByMeBadge: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.interactive.accent,
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  claimBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface.base,
    minWidth: 40,
  },
  claimBtnActive: {
    backgroundColor: COLORS.interactive.accent,
  },
  claimBtnDisabled: {
    opacity: 0.4,
  },
  claimBtnText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text.secondary,
  },
  claimBtnTextActive: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
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
