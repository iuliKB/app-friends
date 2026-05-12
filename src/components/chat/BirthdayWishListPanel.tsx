import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { supabase } from '@/lib/supabase';
import { useFriendWishList } from '@/hooks/useFriendWishList';
import { formatBirthdayDate, formatTurningAge } from '@/utils/birthdayFormatters';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface BirthdayWishListPanelProps {
  birthdayPersonId: string;
  groupChannelId: string;
  birthdayPersonName?: string;
  onStartGiftPoll?: (question: string, options: string[]) => void;
}

interface BirthdayInfo {
  month: number;
  day: number;
  year: number | null;
}

function extractDomain(url: string): string {
  try {
    const full = url.startsWith('http') ? url : `https://${url}`;
    const { hostname } = new URL(full);
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const EXPAND_ANIMATION = {
  duration: 220,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
} as const;

export function BirthdayWishListPanel({
  birthdayPersonId,
  birthdayPersonName,
  onStartGiftPoll,
}: BirthdayWishListPanelProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [birthdayInfo, setBirthdayInfo] = useState<BirthdayInfo | null>(null);
  const [pollMode, setPollMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const { items, loading, toggleClaim } = useFriendWishList(birthdayPersonId);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.surface.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      gap: SPACING.sm,
    },
    headerPressed: {
      opacity: 0.7,
    },
    headerText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      flex: 1,
    },
    dateChip: {
      backgroundColor: colors.surface.base,
      borderRadius: RADII.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    dateChipText: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },

    // ── Body ─────────────────────────────────────────────────────────────────
    body: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingBottom: SPACING.md,
    },

    // ── Birthday info row (date + age chip) ───────────────────────────────────
    birthdayInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    birthdayInfoText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    ageChip: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(185,255,59,0.12)',
      borderRadius: RADII.full,
      paddingHorizontal: SPACING.sm,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      paddingVertical: 3,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.interactive.accent,
    },
    ageChipText: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.interactive.accent,
    },

    // ── Wish list section header ──────────────────────────────────────────────
    wishListHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.xs,
      paddingBottom: SPACING.sm,
      gap: SPACING.sm,
    },
    wishListLabel: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      textTransform: 'uppercase',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      letterSpacing: 0.8,
      flex: 1,
    },
    count: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    createPollBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: RADII.full,
      backgroundColor: colors.surface.base,
    },
    createPollBtnText: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
    },

    // ── Loading / empty ───────────────────────────────────────────────────────
    loadingRow: {
      paddingVertical: SPACING.lg,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },

    // ── Scrollable items list ─────────────────────────────────────────────────
    itemsScroll: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      maxHeight: 280,
    },
    itemsList: {
      paddingHorizontal: SPACING.lg,
      gap: SPACING.sm,
      paddingBottom: SPACING.xs,
    },

    // ── Item card ─────────────────────────────────────────────────────────────
    row: {
      backgroundColor: colors.surface.overlay,
      borderRadius: RADII.lg,
      padding: SPACING.md,
      gap: SPACING.sm,
      borderWidth: StyleSheet.hairlineWidth,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderColor: 'rgba(255,255,255,0.07)',
    },
    rowSelected: {
      borderColor: colors.interactive.accent,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(185,255,59,0.06)',
    },
    rowDisabled: {
      opacity: 0.38,
    },
    itemContent: {
      gap: SPACING.xs,
    },
    itemTitle: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.medium,
      color: colors.text.primary,
    },
    itemUrl: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.interactive.accent,
    },
    itemNotes: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },

    // ── Poll mode: selection row ──────────────────────────────────────────────
    selectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    selectionCircle: {
      width: 20,
      height: 20,
      borderRadius: RADII.full,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectionCircleActive: {
      backgroundColor: colors.interactive.accent,
      borderColor: colors.interactive.accent,
    },

    // ── Claimed badge pill ────────────────────────────────────────────────────
    claimedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      alignSelf: 'flex-start' as const,
      backgroundColor: colors.surface.card,
      borderRadius: RADII.full,
      paddingHorizontal: SPACING.sm,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      paddingVertical: 3,
    },
    claimedBadgeOwn: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(185,255,59,0.10)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.interactive.accent,
    },
    claimedBadgeText: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    claimedBadgeTextOwn: {
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.interactive.accent,
    },

    // ── Actions row (claim only) ──────────────────────────────────────────────
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: SPACING.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    claimBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADII.full,
      backgroundColor: colors.surface.card,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 36,
    },
    claimBtnActive: {
      backgroundColor: colors.interactive.accent,
    },
    claimBtnDisabled: {
      opacity: 0.4,
    },
    claimBtnText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
    },
    claimBtnTextActive: {
      color: colors.surface.base,
    },

    // ── Poll confirm row ──────────────────────────────────────────────────────
    pollConfirmRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
    },
    cancelPollBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.sm,
      borderRadius: RADII.full,
      backgroundColor: colors.surface.base,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 40,
    },
    cancelPollText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
    },
    confirmPollBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
      paddingVertical: SPACING.sm,
      borderRadius: RADII.full,
      backgroundColor: colors.interactive.accent,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 40,
    },
    confirmPollBtnDisabled: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      opacity: 0.35,
    },
    confirmPollText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.surface.base,
    },
  }), [colors]);

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

  function handleToggle() {
    LayoutAnimation.configureNext(EXPAND_ANIMATION);
    if (expanded) {
      setPollMode(false);
      setSelectedItemIds(new Set());
    }
    setExpanded((v) => !v);
  }

  function enterPollMode() {
    LayoutAnimation.configureNext(EXPAND_ANIMATION);
    setPollMode(true);
    setSelectedItemIds(new Set());
  }

  function exitPollMode() {
    LayoutAnimation.configureNext(EXPAND_ANIMATION);
    setPollMode(false);
    setSelectedItemIds(new Set());
  }

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else if (next.size < 4) {
        next.add(itemId);
      }
      return next;
    });
  }

  function handleCreatePoll() {
    const selectedTitles = items
      .filter((i) => selectedItemIds.has(i.id))
      .map((i) => i.title);
    onStartGiftPoll?.(`What should we gift ${name}?`, selectedTitles);
    exitPollMode();
    LayoutAnimation.configureNext(EXPAND_ANIMATION);
    setExpanded(false);
  }

  const dateLabel = birthdayInfo
    ? formatBirthdayDate(birthdayInfo.month, birthdayInfo.day)
    : null;

  const ageLabel = birthdayInfo?.year !== null && birthdayInfo
    ? formatTurningAge(birthdayInfo.year!, birthdayInfo.month, birthdayInfo.day)
    : null;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <Pressable
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        onPress={handleToggle}
        accessibilityLabel={expanded ? 'Collapse birthday panel' : 'Expand birthday panel'}
      >
        <Ionicons name="gift-outline" size={18} color={colors.interactive.accent} />
        <Text style={styles.headerText}>{name}'s Birthday</Text>
        {dateLabel && !expanded && (
          <View style={styles.dateChip}>
            <Text style={styles.dateChipText}>{dateLabel}</Text>
          </View>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.text.secondary}
        />
      </Pressable>

      {/* ── Expanded body ── */}
      {expanded && (
        <View style={styles.body}>
          {/* Birthday date + age chip */}
          {birthdayInfo && (
            <View style={styles.birthdayInfoRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
              {dateLabel && (
                <Text style={styles.birthdayInfoText}>{dateLabel}</Text>
              )}
              {ageLabel && (
                <View style={styles.ageChip}>
                  <Text style={styles.ageChipText}>{ageLabel}</Text>
                </View>
              )}
            </View>
          )}

          {/* Wish list header */}
          <View style={styles.wishListHeader}>
            <Text style={styles.wishListLabel}>
              {pollMode ? 'Select up to 4 gifts' : 'Wish List'}
            </Text>
            {pollMode ? (
              <Text style={styles.count}>{selectedItemIds.size}/4</Text>
            ) : (
              !loading && (
                <Text style={styles.count}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </Text>
              )
            )}
            {!pollMode && items.length >= 2 && (
              <Pressable
                onPress={enterPollMode}
                style={({ pressed }) => [styles.createPollBtn, pressed && { opacity: 0.7 }]}
                accessibilityLabel="Create a gift poll"
              >
                <Ionicons name="stats-chart-outline" size={12} color={colors.text.secondary} />
                <Text style={styles.createPollBtnText}>Gift Poll</Text>
              </Pressable>
            )}
          </View>

          {/* Items */}
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.interactive.accent} />
            </View>
          ) : items.length === 0 ? (
            <Text style={styles.emptyText}>No wish list items yet.</Text>
          ) : (
            <ScrollView style={styles.itemsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.itemsList}>
                {items.map((item) => {
                  const isSelected = selectedItemIds.has(item.id);
                  const canSelect = isSelected || selectedItemIds.size < 4;

                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [
                        styles.row,
                        pollMode && isSelected && styles.rowSelected,
                        pollMode && !canSelect && styles.rowDisabled,
                        pressed && pollMode && canSelect && { opacity: 0.75 },
                      ]}
                      onPress={pollMode ? () => toggleItemSelection(item.id) : undefined}
                      disabled={pollMode && !canSelect && !isSelected}
                    >
                      {pollMode ? (
                        /* Poll mode: checkbox + title only */
                        <View style={styles.selectionRow}>
                          <View style={[styles.selectionCircle, isSelected && styles.selectionCircleActive]}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={12} color={colors.surface.base} />
                            )}
                          </View>
                          <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                        </View>
                      ) : (
                        /* Normal mode: full card */
                        <>
                          <View style={styles.itemContent}>
                            <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                            {item.url ? (
                              <Text style={styles.itemUrl} numberOfLines={1}>
                                {extractDomain(item.url)}
                              </Text>
                            ) : null}
                            {item.notes ? (
                              <Text style={styles.itemNotes} numberOfLines={2}>{item.notes}</Text>
                            ) : null}
                            {item.isClaimed && (
                              <View style={[styles.claimedBadge, item.isClaimedByMe && styles.claimedBadgeOwn]}>
                                <Ionicons
                                  name={item.isClaimedByMe ? 'checkmark-circle-outline' : 'bag-handle-outline'}
                                  size={11}
                                  color={item.isClaimedByMe ? colors.interactive.accent : colors.text.secondary}
                                />
                                <Text style={[styles.claimedBadgeText, item.isClaimedByMe && styles.claimedBadgeTextOwn]}>
                                  {item.isClaimedByMe
                                    ? "You're buying this"
                                    : item.claimerName
                                      ? `${item.claimerName} is buying this`
                                      : 'Someone is buying this'}
                                </Text>
                              </View>
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
                              accessibilityLabel={item.isClaimedByMe ? 'Cancel claim' : "I'll buy this"}
                            >
                              <Ionicons
                                name={item.isClaimedByMe ? 'checkmark-circle-outline' : 'bag-handle-outline'}
                                size={14}
                                color={item.isClaimedByMe ? colors.surface.base : colors.text.secondary}
                              />
                              <Text style={[styles.claimBtnText, item.isClaimedByMe && styles.claimBtnTextActive]}>
                                {item.isClaimedByMe ? "I'll buy" : 'Claim'}
                              </Text>
                            </Pressable>
                          </View>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Poll mode confirm/cancel */}
          {pollMode && (
            <View style={styles.pollConfirmRow}>
              <Pressable
                style={({ pressed }) => [styles.cancelPollBtn, pressed && { opacity: 0.7 }]}
                onPress={exitPollMode}
                accessibilityLabel="Cancel poll creation"
              >
                <Text style={styles.cancelPollText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmPollBtn,
                  selectedItemIds.size < 2 && styles.confirmPollBtnDisabled,
                  pressed && selectedItemIds.size >= 2 && { opacity: 0.85 },
                ]}
                onPress={handleCreatePoll}
                disabled={selectedItemIds.size < 2}
                accessibilityLabel={`Create poll with ${selectedItemIds.size} gifts`}
              >
                <Ionicons
                  name="stats-chart-outline"
                  size={14}
                  color={selectedItemIds.size >= 2 ? colors.surface.base : colors.text.secondary}
                />
                <Text style={styles.confirmPollText}>
                  {selectedItemIds.size >= 2
                    ? `Create Poll (${selectedItemIds.size})`
                    : 'Select at least 2'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
