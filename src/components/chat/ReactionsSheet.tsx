import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';
import type { MessageReaction } from '@/types/chat';

interface ReactionRow {
  emoji: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ReactionsSheetProps {
  messageId: string;
  reactions: MessageReaction[];
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  onClose: () => void;
}

const ALL_TAB = 'All';

export function ReactionsSheet({
  messageId,
  reactions,
  currentUserId,
  onReact,
  onClose,
}: ReactionsSheetProps) {
  const [rows, setRows] = useState<ReactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(ALL_TAB);

  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [slideAnim]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data: reactionsData, error: reactionsFetchError } = await supabase
      .from('message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId);

    if (reactionsFetchError) {
      console.warn('[ReactionsSheet] Failed to fetch reactions:', reactionsFetchError.message);
      setLoading(false);
      return;
    }

    if (reactionsData && reactionsData.length > 0) {
      const userIds = [...new Set(reactionsData.map((r) => r.user_id))];
      const { data: profilesData, error: profilesFetchError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      if (profilesFetchError) {
        console.warn('[ReactionsSheet] Failed to fetch profiles:', profilesFetchError.message);
        setLoading(false);
        return;
      }

      const profileMap = new Map(
        (profilesData ?? []).map((p) => [p.id, p])
      );
      setRows(
        reactionsData.map((r) => ({
          emoji: r.emoji,
          userId: r.user_id,
          displayName: profileMap.get(r.user_id)?.display_name ?? 'Unknown',
          avatarUrl: profileMap.get(r.user_id)?.avatar_url ?? null,
        }))
      );
    } else {
      setRows([]);
    }
    setLoading(false);
  }, [messageId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const tabs = [ALL_TAB, ...reactions.map((r) => r.emoji)];

  const visibleRows =
    activeTab === ALL_TAB ? rows : rows.filter((r) => r.emoji === activeTab);

  function handleReactionRowPress(row: ReactionRow) {
    if (row.userId !== currentUserId) return;
    onReact(messageId, row.emoji);
    onClose();
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        {/* eslint-disable-next-line campfire/no-hardcoded-styles */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />
        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const count = tab === ALL_TAB
              ? rows.length
              : (reactions.find((r) => r.emoji === tab)?.count ?? 0);
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === ALL_TAB ? `All ${rows.length}` : `${tab} ${count}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.divider} />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.interactive.accent} />
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {visibleRows.map((row) => {
              const isOwn = row.userId === currentUserId;
              return (
                <TouchableOpacity
                  key={`${row.userId}-${row.emoji}`}
                  style={styles.row}
                  onPress={() => handleReactionRowPress(row)}
                  activeOpacity={isOwn ? 0.6 : 1}
                  accessibilityLabel={
                    isOwn
                      ? `You reacted ${row.emoji}. Tap to remove.`
                      : `${row.displayName} reacted ${row.emoji}`
                  }
                >
                  <AvatarCircle size={36} imageUri={row.avatarUrl} displayName={row.displayName} />
                  <Text style={[styles.name, isOwn && styles.nameOwn]}>
                    {isOwn ? 'You' : row.displayName}
                  </Text>
                  <Text style={styles.rowEmoji}>{row.emoji}</Text>
                  {isOwn && (
                    <Text style={styles.removeHint}>Tap to remove</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface.card,
    borderTopLeftRadius: RADII.lg,
    borderTopRightRadius: RADII.lg,
    paddingBottom: SPACING.xl,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    maxHeight: '60%',
  },
  handle: {
    alignSelf: 'center',
    // eslint-disable-next-line campfire/no-hardcoded-styles
    width: 36,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 4,
    borderRadius: RADII.full,
    backgroundColor: COLORS.border,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  tab: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surface.overlay,
  },
  tabActive: {
    backgroundColor: COLORS.interactive.accent,
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
  },
  tabTextActive: {
    color: COLORS.surface.base,
  },
  divider: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  loader: {
    marginTop: SPACING.xl,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  name: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  nameOwn: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.interactive.accent,
  },
  rowEmoji: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 22,
  },
  removeHint: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
});
