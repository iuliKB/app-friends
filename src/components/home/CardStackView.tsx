// Phase 03 v1.3.5 — CardStackView (CARD-01, CARD-04, CARD-05).
// Deck container: manages currentIndex state, filters ALIVE/FADING
// friends (CARD-04), renders 2-card stack depth effect (D-06), and displays the
// counter label above the deck (CARD-05, D-12).
//
// FriendSwipeCard (Plan 02) owns all gesture physics — this component only decides
// which friend to hand to it and maintains deck-level state.

import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { computeHeartbeatState } from '@/lib/heartbeat';
import { supabase } from '@/lib/supabase';
import { FriendSwipeCard } from './FriendSwipeCard';
import type { FriendWithStatus } from '@/hooks/useFriends';

// --- Stack depth config (D-06 — UI-SPEC Component Inventory: StackDepthEffect) ---

const STACK_CONFIGS = [
  // eslint-disable-next-line campfire/no-hardcoded-styles
  { translateY: 0, scale: 1.0, zIndex: 30, opacity: 1.0 }, // front card
  // eslint-disable-next-line campfire/no-hardcoded-styles
  { translateY: 8, scale: 0.95, zIndex: 20, opacity: 0.6 }, // depth card 1
  // eslint-disable-next-line campfire/no-hardcoded-styles
  { translateY: 16, scale: 0.9, zIndex: 10, opacity: 0.35 }, // depth card 2
] as const;

// --- Props ---

export interface CardStackViewProps {
  friends: FriendWithStatus[];
}

// --- CardStackView ---

export function CardStackView({ friends }: CardStackViewProps) {
  // Container width from onLayout — never from Dimensions.get (matches RadarView pattern)
  const [containerWidth, setContainerWidth] = useState(0);
  // eslint-disable-next-line campfire/no-hardcoded-styles
  const cardWidth = containerWidth > 0 ? containerWidth * 0.8 : 0;

  // Deck: ALIVE + FADING only — DEAD friends never appear (CARD-04, D-13).
  // Computed at render time; HeartbeatTick in HomeScreen triggers re-renders to keep fresh.
  const deck = friends.filter(
    (f) => computeHeartbeatState(f.status_expires_at, f.last_active_at) !== 'dead'
  );

  // Deck state
  const [currentIndex, setCurrentIndex] = useState(0);

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

  // --- Counter text (CARD-05, D-12, UI-SPEC Copywriting Contract) ---
  const aliveFriendCount = deck.filter(
    (f) => computeHeartbeatState(f.status_expires_at, f.last_active_at) === 'alive'
  ).length;
  const counterText = aliveFriendCount > 0 ? `${aliveFriendCount} more free` : 'Just you right now';

  // --- Skip handler: advance index with auto-loop (D-11) ---
  function handleSkip() {
    setCurrentIndex((prev) => {
      if (deck.length === 0) return 0;
      return (prev + 1) % deck.length; // modulo wrap — auto-loop at end
    });
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

  return (
    <View style={styles.container} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      {/* Counter above deck (CARD-05, D-12) */}
      <Text style={styles.counter}>{counterText}</Text>

      {/* Stack area — wait for layout measurement */}
      {cardWidth > 0 && (
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
                    key={friend.friend_id}
                    style={{ zIndex: config.zIndex, position: 'absolute', top: 0 }}
                  >
                    <FriendSwipeCard
                      friend={friend}
                      onSkip={handleSkip}
                      onNudge={() => void handleNudge(friend.friend_id)}
                      width={cardWidth}
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

// --- Styles (design tokens throughout; hardcoded exceptions eslint-disabled) ---

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  counter: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
  },
  stackContainer: {
    // Height accommodates front card (~160px) + deepest depth offset (16px) + buffer
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 200,
    // width set dynamically via inline style from onLayout
    position: 'relative',
  },
  depthCard: {
    position: 'absolute',
    top: 0,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 160, // matches front card content height
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyHeading: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  emptyBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.secondary,
  },
});
