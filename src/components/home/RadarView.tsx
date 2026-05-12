// Phase 02 v1.3.5 — RadarView with rotating sweep + scan-triggered bubble reactions.
// A thin line "sweep" rotates around "You" once per SWEEP_DURATION_MS. As it crosses
// each friend's angle, that friend's RadarBubble runs a scan reaction (status-flavored
// pulse + glow). Friends 7+ overflow into a horizontal chip row below.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Line, Stop } from 'react-native-svg';
import { useTheme, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { RadarBubble, BubbleSizeMap } from '@/components/home/RadarBubble';
import { OverflowChip } from '@/components/home/OverflowChip';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { computeHeartbeatState } from '@/lib/heartbeat';
import type { FriendWithStatus } from '@/hooks/useFriends';

// --- Types ---

interface RadarViewProps {
  friends: FriendWithStatus[];
  loading?: boolean;
}

// --- Sweep tuning ---

const SWEEP_DURATION_MS = 7500;

// --- Skeleton blob layout (HOME-01) ---

const SKELETON_BLOBS = [
  { size: 80, left: '12%' as const, top: 30 },
  { size: 64, left: '50%' as const, top: 75 },
  { size: 48, left: '68%' as const, top: 18 },
] as const;

interface BubblePosition {
  left: number;
  top: number;
  depthScale: number;
  depthOpacity: number;
}

// --- Deterministic hash for stable jitter ---

function hashToFloat(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return ((h & 0x7fffffff) % 10000) / 10000;
}

// --- Scatter algorithm ---

function computeScatterPositions(
  friends: FriendWithStatus[],
  containerWidth: number,
  radarHeight: number
): BubblePosition[] {
  const rows = friends.length <= 3 ? 1 : 2;
  const cols = Math.min(friends.length, 3);
  const cellWidth = containerWidth / cols;
  const cellHeight = radarHeight / rows;
  const margin = 4;

  return friends.map((friend, index) => {
    const heartbeat = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);
    const status = heartbeat === 'dead' ? 'dead' : friend.status;
    const bubbleSize = BubbleSizeMap[status] ?? 36;
    const bubbleRadius = bubbleSize / 2;

    const cellCol = index % cols;
    const cellRow = Math.floor(index / cols);
    const cellOriginX = cellCol * cellWidth;
    const cellOriginY = cellRow * cellHeight;

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

// --- Ring config: fractions of max radius, with paired opacities (inner brightest) ---

const RING_FRACTIONS = [0.2, 0.4, 0.6, 0.8, 1.0] as const;
const RING_OPACITIES = [0.34, 0.26, 0.2, 0.14, 0.09] as const;

export function RadarView({ friends, loading }: RadarViewProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          marginHorizontal: SPACING.lg,
        },
        radarContainer: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          borderWidth: 1,

          borderColor: isDark ? 'rgba(185, 255, 59, 0.15)' : colors.border,
          position: 'relative',
          overflow: 'hidden',
        },
        youCenter: {
          position: 'absolute',

          width: 36,

          height: 36,

          borderRadius: 18,
          backgroundColor: colors.interactive.accent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.surface.base,
          shadowColor: colors.interactive.accent,

          shadowOpacity: 0.6,

          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
          zIndex: 10,
        },
        youLabel: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          fontSize: 10,
          fontFamily: FONT_FAMILY.body.bold,
          color: colors.surface.base,
        },
        overflowRow: {
          marginTop: SPACING.sm,
        },
        overflowContent: {
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.sm,
        },
      }),
    [colors, isDark]
  );

  // Adaptive height
  const radarRows = friends.length <= 3 ? 1 : 2;
  const RADAR_HEIGHT = radarRows === 1 ? 160 : 260;

  const radarFriends = useMemo(() => friends.slice(0, 6), [friends]);
  const overflowFriends = useMemo(() => friends.slice(6), [friends]);

  const [containerWidth, setContainerWidth] = useState(0);
  const [positions, setPositions] = useState<BubblePosition[]>([]);
  const [scanTriggers, setScanTriggers] = useState<Record<string, number>>({});

  const radarKey = useMemo(() => radarFriends.map((f) => f.friend_id).join(','), [radarFriends]);

  useEffect(() => {
    if (containerWidth === 0) return;
    const computed = computeScatterPositions(radarFriends, containerWidth, RADAR_HEIGHT);
    setPositions(computed);
  }, [containerWidth, radarKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Sweep rotation (native driver) ---
  const sweepRotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    sweepRotation.setValue(0);
    const loop = Animated.loop(
      Animated.timing(sweepRotation, {
        toValue: 1,
        duration: SWEEP_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [sweepRotation]);

  const sweepRotateInterpolation = sweepRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // --- Scan trigger scheduling ---
  // For each non-dead friend, fire a setTimeout at the time-offset matching the
  // sweep line crossing the friend's angle. Reschedule each cycle.
  useEffect(() => {
    if (containerWidth === 0 || positions.length === 0 || radarFriends.length === 0) return;

    const cx = containerWidth / 2;
    const cy = RADAR_HEIGHT / 2;

    type Schedule = { friendId: string; offsetMs: number };
    const schedules: Schedule[] = [];
    for (let i = 0; i < radarFriends.length; i++) {
      const friend = radarFriends[i];
      const pos = positions[i];
      if (!friend || !pos) continue;
      const heartbeat = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);
      if (heartbeat === 'dead') continue;
      const size = BubbleSizeMap[friend.status] ?? 36;
      const fcx = pos.left + size / 2;
      const fcy = pos.top + size / 2;
      // Angle from "You" to friend: 0deg = +X (right), increases clockwise (matches CSS rotate).
      const angleRad = Math.atan2(fcy - cy, fcx - cx);
      let angleDeg = (angleRad * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;
      // Trigger when the sweep line itself crosses the friend's angle.
      const offsetMs = (angleDeg / 360) * SWEEP_DURATION_MS;
      schedules.push({ friendId: friend.friend_id, offsetMs });
    }

    if (schedules.length === 0) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    function scheduleCycle() {
      for (const s of schedules) {
        const t = setTimeout(() => {
          setScanTriggers((prev) => ({
            ...prev,
            [s.friendId]: (prev[s.friendId] ?? 0) + 1,
          }));
        }, s.offsetMs);
        timeouts.push(t);
      }
    }

    scheduleCycle();
    const interval = setInterval(scheduleCycle, SWEEP_DURATION_MS);

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      clearInterval(interval);
    };
  }, [containerWidth, positions, radarKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Sweep line geometry (drawn pointing along +X, then rotated by parent) ---
  // Half-diagonal — sweep line and outermost ring reach the card corners.
  const sweepRadius = Math.sqrt((containerWidth / 2) ** 2 + (RADAR_HEIGHT / 2) ** 2);
  const cx = containerWidth / 2;
  const cy = RADAR_HEIGHT / 2;
  const lineEndX = cx + sweepRadius;
  const lineEndY = cy;

  const accentRgb = isDark ? '185, 255, 59' : '77, 124, 0';

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.radarContainer, { height: RADAR_HEIGHT }]}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {/* Soft radial-ish glow (lighter than before so the sweep can shine) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LinearGradient
            colors={[`rgba(${accentRgb}, 0.05)`, 'transparent']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Concentric radar rings — outermost reaches the card corners */}
        {containerWidth > 0 &&
          RING_FRACTIONS.map((frac, i) => {
            const r = sweepRadius * 2 * frac;
            const ringColor = `rgba(${accentRgb}, ${RING_OPACITIES[i]})`;
            return (
              <View
                key={`ring-${i}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  width: r,
                  height: r,
                  borderRadius: r / 2,
                  borderWidth: 1,
                  borderColor: ringColor,
                  left: containerWidth / 2 - r / 2,
                  top: RADAR_HEIGHT / 2 - r / 2,
                }}
              />
            );
          })}

        {/* Rotating sweep line */}
        {containerWidth > 0 && !loading && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { transform: [{ rotate: sweepRotateInterpolation }] }]}
          >
            <Svg width={containerWidth} height={RADAR_HEIGHT}>
              <Defs>
                <SvgLinearGradient
                  id="sweepLine"
                  x1={String(cx)}
                  y1={String(cy)}
                  x2={String(lineEndX)}
                  y2={String(lineEndY)}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor={`rgb(${accentRgb})`} stopOpacity="0.95" />
                  <Stop offset="1" stopColor={`rgb(${accentRgb})`} stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Line
                x1={String(cx)}
                y1={String(cy)}
                x2={String(lineEndX)}
                y2={String(lineEndY)}
                stroke="url(#sweepLine)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>
        )}

        {loading &&
          friends.length === 0 &&
          SKELETON_BLOBS.map((blob, i) => (
            <View
              key={i}
              style={{ position: 'absolute', left: blob.left as unknown as number, top: blob.top }}
            >
              <SkeletonPulse width={blob.size} height={blob.size} />
            </View>
          ))}

        {/* "You" center indicator */}
        {containerWidth > 0 && !loading && (
          <View
            pointerEvents="none"
            style={[
              styles.youCenter,

              { left: containerWidth / 2 - 18, top: RADAR_HEIGHT / 2 - 18 },
            ]}
          >
            <Text style={styles.youLabel}>You</Text>
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
                scanTrigger={scanTriggers[friend.friend_id]}
              />
            </View>
          );
        })}
      </View>

      {/* Overflow row */}
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
