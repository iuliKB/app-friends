// Phase 11 v1.4 — Collapsible wish list panel shown at the top of birthday group chats.
// Friends can claim / unclaim gifts directly from within the chat.
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';
import { WishListItem } from '@/components/squad/WishListItem';
import { useFriendWishList } from '@/hooks/useFriendWishList';

interface BirthdayWishListPanelProps {
  birthdayPersonId: string;
  birthdayPersonName?: string;
}

export function BirthdayWishListPanel({ birthdayPersonId, birthdayPersonName }: BirthdayWishListPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const { items, loading, toggleClaim } = useFriendWishList(birthdayPersonId);

  const name = birthdayPersonName ?? 'Their';
  const label = `🎁 ${name}'s Wish List`;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        accessibilityLabel={expanded ? 'Collapse wish list' : 'Expand wish list'}
      >
        <Text style={styles.headerText}>{label}</Text>
        <View style={styles.headerRight}>
          {!loading && (
            <Text style={styles.count}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
          )}
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
            items.map((item) => (
              <WishListItem
                key={item.id}
                title={item.title}
                url={item.url}
                notes={item.notes}
                isClaimed={item.isClaimed}
                isClaimedByMe={item.isClaimedByMe}
                onToggleClaim={() => void toggleClaim(item.id, item.isClaimedByMe)}
              />
            ))
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
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
});
