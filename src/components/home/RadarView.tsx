// Phase 02 v1.3.5 — RadarView layout container (RADAR-01, RADAR-04, RADAR-06).
// Places up to 6 RadarBubble instances using a 3×2 grid-cell scatter algorithm
// with positions derived from onLayout (never Dimensions.get). Friends 7+ appear
// in a horizontal overflow FlatList below the container.

import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';
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

// --- Scatter algorithm (pure, outside component) ---
// Implements the 3×2 grid-cell scatter from UI-SPEC with 8px safety margin.
// Called on mount and whenever containerWidth or radarFriends list changes.

function computeScatterPositions(
  friends: FriendWithStatus[],
  containerWidth: number,
  radarHeight: number
): BubblePosition[] {
  const cellWidth = containerWidth / 3;
  const cellHeight = radarHeight / 2;

  return friends.map((friend, index) => {
    const heartbeat = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);
    const status = heartbeat === 'dead' ? 'dead' : friend.status;
    const bubbleSize = BubbleSizeMap[status] ?? 36;
    const bubbleRadius = bubbleSize / 2;

    const cellCol = index % 3;
    const cellRow = Math.floor(index / 3);
    const cellOriginX = cellCol * cellWidth;
    const cellOriginY = cellRow * cellHeight;

    // Random placement within cell with 8px safety margin
    const minX = cellOriginX + bubbleRadius + 8;
    const maxX = cellOriginX + cellWidth - bubbleRadius - 8;
    const minY = cellOriginY + bubbleRadius + 8;
    const maxY = cellOriginY + cellHeight - bubbleRadius - 8;

    // Clamp to guard against very small cells (shouldn't happen with 3 columns)
    const centerX = minX < maxX
      ? minX + Math.random() * (maxX - minX)
      : cellOriginX + cellWidth / 2;
    const centerY = minY < maxY
      ? minY + Math.random() * (maxY - minY)
      : cellOriginY + cellHeight / 2;

    const upperHalf = centerY < radarHeight / 2;

    return {
      left: centerX - bubbleRadius,
      top: centerY - bubbleRadius,
      depthScale: upperHalf ? 0.92 : 1.0,
      depthOpacity: upperHalf ? 0.85 : 1.0,
    };
  });
}

// --- RadarView ---

export function RadarView({ friends }: RadarViewProps) {
  const RADAR_HEIGHT = 320;

  // Split: up to 6 in the radar grid, rest in overflow row
  const radarFriends = friends.slice(0, 6);
  const overflowFriends = friends.slice(6);

  // Container width from onLayout — never from Dimensions.get (RADAR-06)
  const [containerWidth, setContainerWidth] = useState(0);

  // Scatter positions for each radar bubble
  const [positions, setPositions] = useState<BubblePosition[]>([]);

  // Recompute positions whenever container width or friends list changes.
  // radarFriends in deps: content can change (status updates), not just length.
  useEffect(() => {
    if (containerWidth === 0) return;
    const computed = computeScatterPositions(radarFriends, containerWidth, RADAR_HEIGHT);
    setPositions(computed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, radarFriends]);

  return (
    <View style={styles.wrapper}>
      {/* Radar container */}
      <View
        style={styles.radarContainer}
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

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  radarContainer: {
    height: 320,
    backgroundColor: COLORS.surface.base,
    borderRadius: RADII.lg,
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
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  emptyBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.secondary,
  },
  overflowRow: {
    marginTop: SPACING.sm,
  },
  overflowContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
});
