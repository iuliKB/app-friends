// Phase 02 v1.3.5 — RadarBubble (sweep-triggered scan reaction).
// Renders a friend as a sized bubble that reacts when the radar sweep crosses
// its position: avatar bumps in scale/opacity, an outer pulse ring fades outward.
// Resting state is dimmed; the scan is what brings it to life. Status drives the
// reaction's intensity (free = strongest, busy = subtlest).

import React, { useEffect, useMemo, useRef } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, SPACING } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { computeHeartbeatState } from '@/lib/heartbeat';
import { showActionSheet } from '@/lib/action-sheet';
import { supabase } from '@/lib/supabase';
import type { FriendWithStatus } from '@/hooks/useFriends';

// --- Size map (exported for use in RadarView layout) ---

export const BubbleSizeMap: Record<string, number> = {
  free: 68,
  maybe: 54,
  busy: 42,
  dead: 42,
};

// --- Gradient color map (center color → transparent) ---

const GRADIENT_COLORS: Record<string, readonly [string, string]> = {
  free: ['rgba(34,197,94,0.42)', 'transparent'],
  maybe: ['rgba(234,179,8,0.32)', 'transparent'],
  busy: ['rgba(239,68,68,0.25)', 'transparent'],
};

const MOOD_LABEL: Record<string, string> = {
  free: 'free',
  maybe: 'maybe',
  busy: 'busy',
};

// Kept for backwards-compat / external test (tests/unit/fadingPulse.test.ts).

export const FADING_PULSE_COLOR = '#F59E0B';

// --- Scan reaction tuning per status ---
// free is strongest (energetic), maybe is medium, busy is subtle.

interface ScanIntensity {
  scaleBump: number; // peak avatar scale during scan
  ringScaleEnd: number; // outer pulse ring grows to this multiple
  ringOpacity: number; // outer pulse ring starting opacity
  duration: number; // total scan reaction time (ms)
}

const SCAN_INTENSITY: Record<string, ScanIntensity> = {
  free: { scaleBump: 1.14, ringScaleEnd: 1.75, ringOpacity: 0.85, duration: 850 },

  maybe: { scaleBump: 1.1, ringScaleEnd: 1.55, ringOpacity: 0.65, duration: 750 },

  busy: { scaleBump: 1.06, ringScaleEnd: 1.3, ringOpacity: 0.4, duration: 650 },
};

// --- Resting opacity by heartbeat state (dimmed until scanned) ---

const REST_OPACITY = {
  alive: 0.78,

  fading: 0.5,

  dead: 0.38,
} as const;

// --- Idle float tuning ---
// Gentle Y bob between sweeps so the radar feels alive. Deterministic phase per
// friend keeps bubbles desynchronized without random jitter.

// eslint-disable-next-line campfire/no-hardcoded-styles
const FLOAT_AMPLITUDE = 3; // peak ±px
// eslint-disable-next-line campfire/no-hardcoded-styles
const FLOAT_PERIOD_MS = 3800;

function hashFloat(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return ((h & 0x7fffffff) % 10000) / 10000;
}

// --- RadarBubble ---

interface RadarBubbleProps {
  friend: FriendWithStatus;
  // Depth effect multipliers — computed by parent RadarView from Y position.
  depthScale?: number;
  depthOpacity?: number;
  // Increments each time the sweep crosses this bubble's position (parent owns).
  // Resting bubble animates to scan reaction when this changes.
  scanTrigger?: number;
}

export function RadarBubble({
  friend,
  depthScale = 1.0,
  depthOpacity = 1.0,
  scanTrigger,
}: RadarBubbleProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        outerWrapper: {
          alignItems: 'center',
        },
        bubbleContainer: {
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        },
        nameLabel: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          textAlign: 'center',
          marginTop: SPACING.xs,
        },
      }),
    []
  );

  const STATUS_COLORS: Record<string, string> = useMemo(
    () => ({
      free: colors.status.free,
      maybe: colors.status.maybe,
      busy: colors.status.busy,
    }),
    [colors]
  );

  const router = useRouter();

  // 1. Heartbeat state
  const heartbeatState = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);
  const isDead = heartbeatState === 'dead';

  // 2. Bubble size
  const targetSize = isDead ? (BubbleSizeMap.dead ?? 42) : (BubbleSizeMap[friend.status] ?? 36);

  // 3. Resting opacity (depth multiplier applied at outer wrapper)
  const restOpacity = REST_OPACITY[heartbeatState] ?? REST_OPACITY.alive;

  // 4. Animated values for scan reaction
  const scanScale = useRef(new Animated.Value(1)).current;
  const scanOpacity = useRef(new Animated.Value(restOpacity)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const prevScanTriggerRef = useRef<number | undefined>(scanTrigger);

  // 4b. Idle float — gentle continuous Y bob, deterministic phase per friend
  const floatAnim = useRef(new Animated.Value(hashFloat(friend.friend_id, 7))).current;
  useEffect(() => {
    if (isDead) {
      floatAnim.setValue(0);
      return;
    }
    const phase = hashFloat(friend.friend_id, 7);
    floatAnim.setValue(phase);
    const loop = Animated.loop(
      Animated.timing(floatAnim, {
        toValue: phase + 1,
        duration: FLOAT_PERIOD_MS,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [isDead, friend.friend_id, floatAnim]);

  // Convert continuous floatAnim into ±FLOAT_AMPLITUDE Y oscillation (sin-shaped via 4 keyframes)
  const floatY = floatAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    outputRange: [0, -FLOAT_AMPLITUDE, 0, FLOAT_AMPLITUDE, 0, -FLOAT_AMPLITUDE, 0, FLOAT_AMPLITUDE, 0],
    extrapolate: 'extend',
  });

  // Re-sync resting opacity when heartbeat changes (alive → fading transition).
  useEffect(() => {
    scanOpacity.setValue(restOpacity);
  }, [restOpacity, scanOpacity]);

  // 5. Status resize animation (D-05) — kept from prior implementation
  const sizeAnim = useRef(new Animated.Value(targetSize)).current;
  const prevSizeRef = useRef(targetSize);
  useEffect(() => {
    if (prevSizeRef.current === targetSize) return;
    prevSizeRef.current = targetSize;
    Animated.timing(sizeAnim, {
      toValue: targetSize,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
      isInteraction: false,
    }).start();
  }, [targetSize, sizeAnim]);

  // 6. Scan trigger animation
  useEffect(() => {
    if (scanTrigger === undefined) return;
    if (prevScanTriggerRef.current === scanTrigger) return;
    prevScanTriggerRef.current = scanTrigger;
    if (isDead) return; // dead bubbles do not react to scan

    const intensity = SCAN_INTENSITY[friend.status] ?? SCAN_INTENSITY.maybe!;
    const upDur = Math.round(intensity.duration * 0.32);
    const downDur = intensity.duration - upDur;

    // Initialize ring to starting state before animation
    ringScale.setValue(1);
    ringOpacity.setValue(intensity.ringOpacity);

    Animated.parallel([
      // Avatar scale: bump up then settle
      Animated.sequence([
        Animated.timing(scanScale, {
          toValue: intensity.scaleBump,
          duration: upDur,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(scanScale, {
          toValue: 1,
          duration: downDur,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
      // Avatar brightness: pop to 1.0 then settle to rest
      Animated.sequence([
        Animated.timing(scanOpacity, {
          toValue: 1,
          duration: upDur,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(scanOpacity, {
          toValue: restOpacity,
          duration: downDur,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
      // Outer ring: expand and fade
      Animated.timing(ringScale, {
        toValue: intensity.ringScaleEnd,
        duration: intensity.duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: intensity.duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]).start();
  }, [
    scanTrigger,
    isDead,
    friend.status,
    restOpacity,
    scanScale,
    scanOpacity,
    ringScale,
    ringOpacity,
  ]);

  // 7. Visual config
  const isAlive = heartbeatState === 'alive';
  const showGradient = isAlive;
  const statusColor = STATUS_COLORS[friend.status] ?? colors.text.secondary;
  const gradientColors = GRADIENT_COLORS[friend.status] ?? ['transparent', 'transparent'];
  const moodLabel = MOOD_LABEL[friend.status] ?? friend.status;

  // 8. Tap → DM
  async function handlePress() {
    const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
      other_user_id: friend.friend_id,
    });
    if (error || !data) {
      Alert.alert('Error', "Couldn't open chat. Try again.");
      return;
    }
    router.push(
      `/chat/room?dm_channel_id=${data}&friend_name=${encodeURIComponent(friend.display_name)}` as never
    );
  }

  // 9. Long-press → action sheet
  function handleLongPress() {
    const firstName = friend.display_name.split(' ')[0] ?? friend.display_name;
    showActionSheet(friend.display_name, [
      {
        label: 'View profile',
        onPress: () => router.push(`/friends/${friend.friend_id}` as never),
      },
      {
        label: `Plan with ${firstName}...`,
        onPress: () => router.push(`/plan-create?preselect_friend_id=${friend.friend_id}` as never),
      },
    ]);
  }

  // 10. Touch slop for small bubbles
  const hitSlop = targetSize < 44 ? { top: 4, bottom: 4, left: 4, right: 4 } : undefined;

  // 11. Accessibility label
  const accessibilityLabel =
    heartbeatState === 'fading'
      ? `${friend.display_name}, ${moodLabel}, fading. Tap to message, hold for more.`
      : `${friend.display_name}, ${moodLabel}. Tap to message, hold for more.`;

  // 12. Name label color
  const nameLabelColor = heartbeatState === 'fading' ? colors.text.secondary : colors.text.primary;

  // 13. Outer wrapper applies depth (one-shot, set by parent)
  const outerOpacity = depthOpacity;
  const outerScale = depthScale;

  return (
    <Animated.View
      style={[
        styles.outerWrapper,
        {
          opacity: outerOpacity,
          transform: [{ translateY: floatY }, { scale: outerScale }],
        },
      ]}
    >
      {isDead ? (
        <View>
          {/* Outer: native-driven opacity. Inner: non-native width/height. */}
          <Animated.View style={{ opacity: scanOpacity }}>
            <Animated.View
              style={[styles.bubbleContainer, { width: sizeAnim, height: sizeAnim }]}
            >
              <AvatarCircle
                size={targetSize}
                imageUri={friend.avatar_url}
                displayName={friend.display_name}
              />
              {/* Greyscale simulation overlay */}
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: colors.surface.base,

                    opacity: 0.55,
                    borderRadius: targetSize / 2,
                  },
                ]}
                pointerEvents="none"
              />
            </Animated.View>
          </Animated.View>
        </View>
      ) : (
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={400}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          {/* Outer: native-driven opacity + scale (avoids native/non-native conflict
              with the inner view's animated width/height). */}
          <Animated.View
            style={{ opacity: scanOpacity, transform: [{ scale: scanScale }] }}
          >
            <Animated.View
              style={[styles.bubbleContainer, { width: sizeAnim, height: sizeAnim }]}
            >
              {/* Sweep-triggered outer pulse ring */}
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    borderWidth: 2,
                    borderColor: statusColor,
                    borderRadius: targetSize / 2,
                    opacity: ringOpacity,
                    transform: [{ scale: ringScale }],
                  },
                ]}
              />
              {showGradient && (
                <LinearGradient
                  colors={gradientColors as [string, string]}
                  start={{ x: 0.5, y: 0.5 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: targetSize / 2 }]}
                />
              )}
              <AvatarCircle
                size={targetSize}
                imageUri={friend.avatar_url}
                displayName={friend.display_name}
              />
            </Animated.View>
          </Animated.View>
        </Pressable>
      )}
      <Text
        style={[styles.nameLabel, { maxWidth: targetSize + 16, color: nameLabelColor }]}
        numberOfLines={1}
      >
        {friend.display_name}
      </Text>
    </Animated.View>
  );
}
