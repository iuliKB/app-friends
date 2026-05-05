// Phase 02 v1.3.5 — RadarBubble with embedded PulseRing (RADAR-01, RADAR-02, RADAR-03, RADAR-05).
// Renders a friend as a sized bubble with optional pulse ring (ALIVE only),
// status gradient (ALIVE non-FADING only), depth effect, and tap/long-press interactions.

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
  free: 80,
  maybe: 64,
  busy: 48,
  dead: 48,
};

// --- Gradient color map (center color → transparent) ---
// expo-linear-gradient is linear (not radial); start/end gives a center-to-corner feel.

const GRADIENT_COLORS: Record<string, readonly [string, string]> = {
  free: ['rgba(34,197,94,0.30)', 'transparent'],
  maybe: ['rgba(234,179,8,0.25)', 'transparent'],
  busy: ['rgba(239,68,68,0.20)', 'transparent'],
};

const MOOD_LABEL: Record<string, string> = {
  free: 'free',
  maybe: 'maybe',
  busy: 'busy',
};

// --- FADING pulse ring color constant ---
// eslint-disable-next-line campfire/no-hardcoded-styles
export const FADING_PULSE_COLOR = '#F59E0B'; // amber-500 — caution signal for FADING heartbeat state

// --- PulseRing sub-component ---
// Rendered for ALIVE and FADING friends (caller's responsibility to pick variant).
// Uses useNativeDriver: true with transform scale to stay on the native thread.

interface PulseRingProps {
  size: number;
  statusColor: string;
  variant?: 'alive' | 'fading'; // default: 'alive'
}

function PulseRing({ size, statusColor, variant = 'alive' }: PulseRingProps) {
  const scaleAnim = useRef(new Animated.Value(1.0)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;

  // eslint-disable-next-line campfire/no-hardcoded-styles
  const duration = variant === 'fading' ? 2000 : 1200;
  // eslint-disable-next-line campfire/no-hardcoded-styles
  const delay = variant === 'fading' ? 800 : 600;
  const scaleTarget = variant === 'fading' ? 1.5 : 1.7;

  useEffect(() => {
    scaleAnim.setValue(1.0);
    opacityAnim.setValue(0.7);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: scaleTarget,
            duration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
            isInteraction: false, // D-04: never block JS thread / FlatList rendering
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
            isInteraction: false,
          }),
        ]),
        Animated.delay(delay),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [scaleAnim, opacityAnim, duration, delay, scaleTarget]);

  return (
    <Animated.View
      style={[
        pulseRingStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: statusColor,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    />
  );
}

const pulseRingStyle = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
}).ring;

// --- RadarBubble ---

interface RadarBubbleProps {
  friend: FriendWithStatus;
  // Depth effect multipliers — computed by parent RadarView from Y position.
  // 1.0/1.0 = no effect (lower half). 0.92/0.85 = upper half (D-07).
  depthScale?: number; // default 1.0
  depthOpacity?: number; // default 1.0
}

export function RadarBubble({ friend, depthScale = 1.0, depthOpacity = 1.0 }: RadarBubbleProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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
  }), []);

  const STATUS_COLORS: Record<string, string> = useMemo(() => ({
    free: colors.status.free,
    maybe: colors.status.maybe,
    busy: colors.status.busy,
  }), [colors]);

  const router = useRouter();

  // 1. Compute heartbeat state each render
  const heartbeatState = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);

  // 2. Bubble size
  const targetSize = heartbeatState === 'dead' ? 48 : (BubbleSizeMap[friend.status] ?? 36);

  // 3. Outer opacity
  let baseOpacity: number;
  if (heartbeatState === 'dead') {
    baseOpacity = 0.5;
  } else if (heartbeatState === 'fading') {
    baseOpacity = 0.6; // FADING: opacity 0.6
  } else {
    baseOpacity = 1.0;
  }
  const finalOpacity = baseOpacity * depthOpacity;

  // 4. Scale from depth
  const finalScale = depthScale;

  // 5. Status resize animation (D-05).
  //    useNativeDriver: false is required — width/height are layout props that can't
  //    be driven natively. This is acceptable: the animation only fires on status changes
  //    (rare), not during gestures or scrolling.
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

  // 6. Derived flags
  const isAlive = heartbeatState === 'alive';
  const showGradient = isAlive; // Gradient only for ALIVE (not FADING)
  const statusColor = STATUS_COLORS[friend.status] ?? colors.text.secondary;
  const gradientColors = GRADIENT_COLORS[friend.status] ?? ['transparent', 'transparent'];
  const moodLabel = MOOD_LABEL[friend.status] ?? friend.status;

  // 7. Tap handler — DM navigation
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

  // 8. Long-press handler — action sheet
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

  // 9. hitSlop — ensure minimum 44px effective touch area for small bubbles
  const hitSlop = targetSize < 44 ? { top: 4, bottom: 4, left: 4, right: 4 } : undefined;

  // 10. Accessibility label
  const accessibilityLabel =
    heartbeatState === 'fading'
      ? `${friend.display_name}, ${moodLabel}, fading. Tap to message, hold for more.`
      : `${friend.display_name}, ${moodLabel}. Tap to message, hold for more.`;

  // 11. Name label color
  const nameLabelColor = heartbeatState === 'fading' ? colors.text.secondary : colors.text.primary;

  return (
    <Animated.View
      style={[styles.outerWrapper, { opacity: finalOpacity, transform: [{ scale: finalScale }] }]}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Animated.View style={[styles.bubbleContainer, { width: sizeAnim, height: sizeAnim }]}>
          {isAlive && <PulseRing size={targetSize} statusColor={statusColor} variant="alive" />}
          {heartbeatState === 'fading' && (
            <PulseRing size={targetSize} statusColor={FADING_PULSE_COLOR} variant="fading" />
          )}
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
      </Pressable>
      <Text
        style={[styles.nameLabel, { maxWidth: targetSize + 16, color: nameLabelColor }]}
        numberOfLines={1}
      >
        {friend.display_name}
      </Text>
    </Animated.View>
  );
}
