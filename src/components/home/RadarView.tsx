// Phase 02 v1.3.5 — RadarView layout container (RADAR-01, RADAR-04, RADAR-06).
// Places up to 6 RadarBubble instances using a 3×2 grid-cell scatter algorithm
// with positions derived from onLayout (never Dimensions.get). Friends 7+ appear
// in a horizontal overflow FlatList below the container.

import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { RadarBubble, BubbleSizeMap } from '@/components/home/RadarBubble';
import { OverflowChip } from '@/components/home/OverflowChip';
import { computeHeartbeatState } from '@/lib/heartbeat';
import type { FriendWithStatus } from '@/hooks/useFriends';

// --- Types ---

interface RadarViewProps {
  friends: FriendWithStatus[];
}

interface BubblePosition {
  left: number;
  top: number;
  depthScale: number;
  depthOpacity: number;
}

// --- Deterministic hash for stable jitter ---
// Simple string hash → [0,1) float. Same friend_id always produces the same offset,
// so bubbles don't shift on heartbeat ticks or re-renders.

function hashToFloat(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return ((h & 0x7fffffff) % 10000) / 10000; // [0, 1)
}

// --- Scatter algorithm (pure, outside component) ---
// Implements the 3×2 grid-cell scatter from UI-SPEC with 8px safety margin.
// Called on mount and whenever containerWidth or radarFriends list changes.

function computeScatterPositions(
  friends: FriendWithStatus[],
  containerWidth: number,
  radarHeight: number
): BubblePosition[] {
  const rows = friends.length <= 3 ? 1 : 2;
  const cols = Math.min(friends.length, 3);
  const cellWidth = containerWidth / cols;
  const cellHeight = radarHeight / rows;
  const margin = 4; // tight margin for compact feel

  return friends.map((friend, index) => {
    const heartbeat = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);
    const status = heartbeat === 'dead' ? 'dead' : friend.status;
    const bubbleSize = BubbleSizeMap[status] ?? 36;
    const bubbleRadius = bubbleSize / 2;

    const cellCol = index % cols;
    const cellRow = Math.floor(index / cols);
    const cellOriginX = cellCol * cellWidth;
    const cellOriginY = cellRow * cellHeight;

    // Deterministic jitter from friend_id (stable across re-renders)
    const jitterX =
      (hashToFloat(friend.friend_id, 1) - 0.5) * (cellWidth - bubbleSize - margin * 2) * 0.4;
    const jitterY =
      (hashToFloat(friend.friend_id, 2) - 0.5) * (cellHeight - bubbleSize - margin * 2) * 0.4;

    const centerX = cellOriginX + cellWidth / 2 + jitterX;
    const centerY = cellOriginY + cellHeight / 2 + jitterY;

    const upperHalf = rows > 1 && centerY < radarHeight / 2;

    return {
      left: Math.max(
        margin,
        Math.min(centerX - bubbleRadius, containerWidth - bubbleSize - margin)
      ),
      top: Math.max(margin, Math.min(centerY - bubbleRadius, radarHeight - bubbleSize - margin)),
      depthScale: upperHalf ? 0.92 : 1.0,
      depthOpacity: upperHalf ? 0.85 : 1.0,
    };
  });
}

// --- RadarView ---

export function RadarView({ friends }: RadarViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    wrapper: {
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.md,
    },
    radarContainer: {
      // height set dynamically via inline style
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
      overflow: 'hidden',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
    overflowRow: {
      marginTop: SPACING.sm,
    },
    overflowContent: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
  }), [colors]);

  // Adaptive height: compact for few friends, taller for 4-6
  const radarRows = friends.length <= 3 ? 1 : 2;
  const RADAR_HEIGHT = radarRows === 1 ? 160 : 260;

  // Split: up to 6 in the radar grid, rest in overflow row
  // useMemo prevents new array references on every render (avoids infinite useEffect loop)
  const radarFriends = useMemo(() => friends.slice(0, 6), [friends]);
  const overflowFriends = useMemo(() => friends.slice(6), [friends]);

  // Container width from onLayout — never from Dimensions.get (RADAR-06)
  const [containerWidth, setContainerWidth] = useState(0);

  // Scatter positions for each radar bubble
  const [positions, setPositions] = useState<BubblePosition[]>([]);

  // Stable key: only re-scatter when the set of friends changes, not on every render.
  // Keyed on friend IDs so status-only updates don't trigger a re-scatter (D-03: randomize per mount).
  const radarKey = useMemo(() => radarFriends.map((f) => f.friend_id).join(','), [radarFriends]);

  useEffect(() => {
    if (containerWidth === 0) return;
    const computed = computeScatterPositions(radarFriends, containerWidth, RADAR_HEIGHT);
    setPositions(computed);
  }, [containerWidth, radarKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.wrapper}>
      {/* Radar container */}
      <View
        style={[styles.radarContainer, { height: RADAR_HEIGHT }]}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {radarFriends.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyHeading}>No friends yet</Text>
            <Text style={styles.emptyBody}>Add friends to see them here.</Text>
          </View>
        )}

        {radarFriends.map((friend, index) => {
          const pos = positions[index];
          if (!pos) return null;
          return (
            <View
              key={friend.friend_id}
              style={{ position: 'absolute', left: pos.left, top: pos.top }}
            >
              <RadarBubble
                friend={friend}
                depthScale={pos.depthScale}
                depthOpacity={pos.depthOpacity}
              />
            </View>
          );
        })}
      </View>

      {/* Overflow row — only when friends > 6 */}
      {overflowFriends.length > 0 && (
        <FlatList
          data={overflowFriends}
          keyExtractor={(item) => item.friend_id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.overflowContent}
          style={styles.overflowRow}
          accessibilityLabel={`${overflowFriends.length} more friends`}
          renderItem={({ item }) => <OverflowChip friend={item} />}
        />
      )}
    </View>
  );
}

