// Phase 03 v1.3.5 — CardStackView (CARD-01, CARD-04, CARD-05).
// Deck container: manages currentIndex state, filters ALIVE/FADING
// friends (CARD-04), renders 2-card stack depth effect (D-06), and displays the
// counter label above the deck (CARD-05, D-12).
//
// FriendSwipeCard (Plan 02) owns all gesture physics — this component only decides
// which friend to hand to it and maintains deck-level state.

import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, SHADOWS } from '@/theme';
import { computeHeartbeatState } from '@/lib/heartbeat';
import { supabase } from '@/lib/supabase';
import { FriendSwipeCard } from './FriendSwipeCard';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import type { FriendWithStatus } from '@/hooks/useFriends';

// --- Stack depth config (D-06 — UI-SPEC Component Inventory: StackDepthEffect) ---

const STACK_CONFIGS = [
  { translateY: 0, scale: 1.0, zIndex: 50, opacity: 1.0 }, // front card

  { translateY: 8, scale: 0.97, zIndex: 40, opacity: 0.78 }, // depth 1

  { translateY: 18, scale: 0.94, zIndex: 30, opacity: 0.55 }, // depth 2

  { translateY: 28, scale: 0.91, zIndex: 20, opacity: 0.35 }, // depth 3

  { translateY: 38, scale: 0.88, zIndex: 10, opacity: 0.18 }, // depth 4
] as const;

// --- Props ---

export interface CardStackViewProps {
  friends: FriendWithStatus[];
  loading?: boolean;
}

// --- CardStackView ---

export function CardStackView({ friends, loading }: CardStackViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          paddingVertical: SPACING.lg,
        },
        stackContainer: {
          // Premium iOS landscape card + 4 depth cards behind it (38px deepest offset)

          height: 240,
          // width set dynamically via inline style from onLayout
          position: 'relative',
        },
        depthCard: {
          position: 'absolute',
          top: 0,

          height: 200, // matches front card content height
          backgroundColor: colors.surface.card,
          borderRadius: RADII.xl,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        emptyState: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: SPACING.xxl,
        },
        emptyHeading: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          marginBottom: SPACING.xs,
        },
        emptyBody: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        endCard: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.xl,
          ...SHADOWS.swipeCard,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,

          height: 200,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: SPACING.xl,
        },
        endIconWrapper: {
          width: 56,
          height: 56,
          borderRadius: RADII.full,
          backgroundColor: colors.surface.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: SPACING.md,
        },
        endHeading: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.bold,
          color: colors.text.primary,
          letterSpacing: -0.3,
          marginBottom: SPACING.xs,
          textAlign: 'center',
        },
        endBody: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginBottom: SPACING.lg,
          textAlign: 'center',
        },
        rewatchButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.sm,
          borderRadius: RADII.full,
          backgroundColor: colors.interactive.accent,
        },
        rewatchText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.bold,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          color: '#0A0A0A',
          letterSpacing: -0.2,
        },
      }),
    [colors]
  );

  // Container width from onLayout — never from Dimensions.get (matches RadarView pattern)
  const [containerWidth, setContainerWidth] = useState(0);
  // Deck index — must be declared before any early returns (Rules of Hooks)
  const [currentIndex, setCurrentIndex] = useState(0);
  // Monotonic counter that increments on every swipe — used in the front card's
  // key so the same friend (after wrap-around) re-mounts fresh instead of
  // keeping the swiped-off translateX value from the previous animation.
  const [advanceCount, setAdvanceCount] = useState(0);
  // True once the user has swiped past the last card. Renders the end screen
  // until they tap "Rewatch" — no auto-loop.
  const [endReached, setEndReached] = useState(false);

  const cardWidth = containerWidth > 0 ? containerWidth * 0.8 : 0;

  // Skeleton: show 2 placeholder cards when loading and no friends yet (HOME-01, D-03)
  if (loading && friends.length === 0 && cardWidth > 0) {
    return (
      <View
        style={styles.container}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <View style={[styles.stackContainer, { width: cardWidth }]}>
          <SkeletonPulse width={cardWidth} height={80} />
          <View style={{ marginTop: SPACING.sm }}>
            <SkeletonPulse width={cardWidth} height={80} />
          </View>
        </View>
      </View>
    );
  }

  // Deck: ALIVE + FADING only — DEAD friends never appear (CARD-04, D-13).
  // Computed at render time; HeartbeatTick in HomeScreen triggers re-renders to keep fresh.
  const deck = friends.filter(
    (f) => computeHeartbeatState(f.status_expires_at, f.last_active_at) !== 'dead'
  );

  // Empty deck — show friendly message instead of blank screen
  if (deck.length === 0) {
    return (
      <View
        style={styles.emptyState}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <Text style={styles.emptyHeading}>No active friends right now</Text>
        <Text style={styles.emptyBody}>Friends will appear here when they set their status.</Text>
      </View>
    );
  }

  // --- Skip handler: advance to next card; show end screen at last card ---
  function handleSkip() {
    setCurrentIndex((prev) => {
      if (deck.length === 0) return 0;
      if (prev >= deck.length - 1) {
        // Already on the last card — flag end and freeze the index there
        setEndReached(true);
        return prev;
      }
      return prev + 1;
    });
    // Bump on every swipe so the front-card key changes — forces fresh mount.
    setAdvanceCount((c) => c + 1);
  }

  // --- Rewatch: reset deck back to the first card ---
  function handleRewatch() {
    setEndReached(false);
    setCurrentIndex(0);
    setAdvanceCount((c) => c + 1);
  }

  // --- Nudge handler: send nudge ping via RPC, then advance card ---
  async function handleNudge(friendId: string) {
    const { error } = await supabase.rpc('send_nudge', {
      receiver_id: friendId,
    });
    if (error) {
      if (error.message.includes('rate limited')) {
        Alert.alert('Hold on', 'You already nudged them — wait a few minutes.');
      } else {
        Alert.alert('Error', "Couldn't send nudge. Try again.");
      }
      return;
    }
    // Advance to next card after successful nudge
    handleSkip();
  }

  // --- Stack rendering (D-06) ---
  // Render in reverse order (lowest zIndex first) so the front card lands on top.
  const cardsToRender = Math.min(STACK_CONFIGS.length, deck.length);

  // Total free friends in the deck — used to compute the per-card mutual-context
  // count ("+N mutuals also free") on the front card.
  const totalFreeInDeck = deck.filter(
    (f) =>
      f.status === 'free' && computeHeartbeatState(f.status_expires_at, f.last_active_at) !== 'dead'
  ).length;

  return (
    <View style={styles.container} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      {/* End-of-stack screen — replaces the stack until user taps Rewatch */}
      {cardWidth > 0 && endReached && (
        <View style={[styles.endCard, { width: cardWidth }]}>
          <View style={styles.endIconWrapper}>
            <Ionicons name="checkmark-done" size={28} color={colors.interactive.accent} />
          </View>
          <Text style={styles.endHeading}>You&apos;re all caught up</Text>
          <Text style={styles.endBody}>You&apos;ve seen everyone for now.</Text>
          <Pressable
            style={({ pressed }) => [styles.rewatchButton, pressed && { opacity: 0.85 }]}
            onPress={handleRewatch}
            accessibilityLabel="Rewatch the stack from the beginning"
            accessibilityRole="button"
          >
            {}
            <Ionicons name="refresh" size={18} color="#0A0A0A" />
            <Text style={styles.rewatchText}>Rewatch</Text>
          </Pressable>
        </View>
      )}

      {/* Stack area — wait for layout measurement */}
      {cardWidth > 0 && !endReached && (
        <View style={[styles.stackContainer, { width: cardWidth }]}>
          {STACK_CONFIGS.slice(0, cardsToRender)
            .slice() // avoid mutating const
            .reverse()
            .map((config, reversedPos) => {
              const stackPos = cardsToRender - 1 - reversedPos; // convert back to forward index
              const friendIndex = (currentIndex + stackPos) % deck.length;
              const friend = deck[friendIndex]!;

              if (stackPos === 0) {
                // Front card — animated FriendSwipeCard.
                // Keyed by friend_id (not index) so each new front card mounts fresh (RESEARCH Pitfall 5).
                // FriendSwipeCard has no style prop — wrap in View for zIndex.
                return (
                  <View
                    key={`${friend.friend_id}-${advanceCount}`}
                    style={{ zIndex: config.zIndex, position: 'absolute', top: 0 }}
                  >
                    <FriendSwipeCard
                      friend={friend}
                      onSkip={handleSkip}
                      onNudge={() => void handleNudge(friend.friend_id)}
                      width={cardWidth}
                      othersCount={Math.max(0, deck.length - 1)}
                      alsoFreeCount={Math.max(
                        0,
                        totalFreeInDeck - (friend.status === 'free' ? 1 : 0)
                      )}
                    />
                  </View>
                );
              }

              // Background depth cards — plain View, no gesture, no gradient
              return (
                <View
                  key={`depth-${stackPos}-${friend.friend_id}`}
                  style={[
                    styles.depthCard,
                    {
                      width: cardWidth,
                      zIndex: config.zIndex,
                      opacity: config.opacity,
                      transform: [{ translateY: config.translateY }, { scale: config.scale }],
                    },
                  ]}
                />
              );
            })}
        </View>
      )}
    </View>
  );
}
