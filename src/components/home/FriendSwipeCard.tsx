// Phase 03 v1.3.5 — FriendSwipeCard (CARD-01, CARD-02, CARD-03).
// Single animated card unit: visual layout (D-01 to D-05), pan gesture handler
// (D-07, D-08, D-09, D-10), Nudge/Skip action buttons (D-14, D-15, D-16),
// and scroll conflict resolution.
//
// CardStackView mounts/unmounts this component as the front card changes.
// Each mount starts with fresh useSharedValue(0) state — no manual reset needed.

import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { computeHeartbeatState, formatDistanceToNow } from '@/lib/heartbeat';
import { supabase } from '@/lib/supabase';
import type { FriendWithStatus } from '@/hooks/useFriends';

// --- Screen metrics ---

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Physics constants — no token equivalents, eslint-disable required
// eslint-disable-next-line campfire/no-hardcoded-styles
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35; // ~137px on 390px screen
// eslint-disable-next-line campfire/no-hardcoded-styles
const UNDO_THRESHOLD_Y = 80; // px downward before undo triggers
// eslint-disable-next-line campfire/no-hardcoded-styles
const UNDO_VELOCITY_Y = 500; // min velocity for undo
// eslint-disable-next-line campfire/no-hardcoded-styles
const MAX_ROTATE_DEG = 15; // degrees max rotation at screen edge

// --- Gradient colors (left-to-right wash per D-04, 15-18% opacity) ---

const CARD_GRADIENT_COLORS: Record<string, readonly [string, string]> = {
  free: ['rgba(34,197,94,0.18)', 'transparent'],
  maybe: ['rgba(234,179,8,0.15)', 'transparent'],
  busy: ['rgba(239,68,68,0.15)', 'transparent'],
};

// --- Mood label map ---

const MOOD_LABEL: Record<string, string> = {
  free: 'free',
  maybe: 'maybe',
  busy: 'busy',
};

// --- Button size constant ---
// eslint-disable-next-line campfire/no-hardcoded-styles
const BUTTON_SIZE = 56; // action button circle diameter (not a spacing token)

// --- Props ---

export interface SwipeCardProps {
  friend: FriendWithStatus;
  onSkip: () => void; // called after fly-off animation completes
  onUndo: () => void; // called on downward swipe undo gesture
  // width controlled by parent (CardStackView passes 80% screen width per D-01)
  width: number;
}

// --- FriendSwipeCard ---

export function FriendSwipeCard({ friend, onSkip, onUndo, width }: SwipeCardProps) {
  const router = useRouter();
  const [nudgeLoading, setNudgeLoading] = useState(false);

  // Reanimated shared values — fresh on each mount (no reset needed)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  // Heartbeat state for opacity
  const heartbeatState = computeHeartbeatState(
    friend.status_expires_at,
    friend.last_active_at
  );

  const moodLabel = MOOD_LABEL[friend.status] ?? friend.status;
  const gradientColors = CARD_GRADIENT_COLORS[friend.status] ?? ['transparent', 'transparent'];

  // --- Animated style ---

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // --- Pan gesture (RNGH v2 API — NOT PanGestureHandler) ---

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10]) // claim gesture after 10px horizontal (RESEARCH pitfall 3)
    .failOffsetY([-15, 15]) // yield to ScrollView if vertical detected first
    .onUpdate((e) => {
      translateX.value = e.translationX;
      // eslint-disable-next-line campfire/no-hardcoded-styles
      translateY.value = e.translationY * 0.15; // slight vertical drag follow
      rotate.value = (e.translationX / SCREEN_WIDTH) * MAX_ROTATE_DEG;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 1 : -1;
        // eslint-disable-next-line campfire/no-hardcoded-styles
        translateX.value = withTiming(dir * SCREEN_WIDTH * 1.5, { duration: 280 }, () => {
          runOnJS(onSkip)(); // MUST use runOnJS — worklet→JS thread boundary
        });
      } else if (e.translationY > UNDO_THRESHOLD_Y && e.velocityY > UNDO_VELOCITY_Y) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
        runOnJS(onUndo)();
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  // --- Skip button tap (always exits right) ---

  function handleSkip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    translateX.value = withTiming(
      // eslint-disable-next-line campfire/no-hardcoded-styles
      SCREEN_WIDTH * 1.5,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      { duration: 280 },
      () => {
        runOnJS(onSkip)();
      }
    );
  }

  // --- Nudge button (DM navigation via get_or_create_dm_channel RPC) ---

  async function handleNudge() {
    setNudgeLoading(true);
    const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
      other_user_id: friend.friend_id,
    });
    setNudgeLoading(false);
    if (error || !data) {
      Alert.alert('Error', "Couldn't open chat. Try again.");
      return;
    }
    router.push(
      `/chat/room?dm_channel_id=${data}&friend_name=${encodeURIComponent(friend.display_name)}` as never
    );
  }

  // --- Accessibility ---

  const accessibilityLabel = `${friend.display_name}, ${moodLabel}${
    friend.context_tag ? ` · ${friend.context_tag}` : ''
  }. Active ${formatDistanceToNow(friend.last_active_at)}. Swipe to skip or tap Nudge to message.`;

  // --- Render ---

  // FADING: apply 60% opacity on outer wrapper (static, not useSharedValue — avoids
  // useNativeDriver conflict between static opacity and animated transforms)
  const fadingOpacity = heartbeatState === 'fading' ? 0.6 : 1.0;

  return (
    <View style={{ opacity: fadingOpacity }}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.card,
            { width },
            animatedStyle,
          ]}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="none"
        >
          {/* Status gradient wash (left-to-right per D-04) */}
          <LinearGradient
            colors={gradientColors as [string, string]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, { borderRadius: RADII.xl }]}
          />

          {/* Content row: avatar + info */}
          <View style={styles.contentRow}>
            <AvatarCircle
              size={64}
              imageUri={friend.avatar_url}
              displayName={friend.display_name}
            />
            <View style={styles.infoColumn}>
              <Text style={styles.nameText} numberOfLines={1}>
                {friend.display_name}
              </Text>
              <Text style={styles.moodText} numberOfLines={1}>
                {moodLabel}
                {friend.context_tag ? ` · ${friend.context_tag}` : ''}
              </Text>
              <Text style={styles.lastActiveText} numberOfLines={1}>
                {formatDistanceToNow(friend.last_active_at)}
              </Text>
            </View>
          </View>

          {/* Action buttons row */}
          <View style={styles.buttonRow}>
            {/* Skip button — surface.overlay circle */}
            <View style={styles.buttonWrapper}>
              <Pressable
                style={styles.skipButton}
                onPress={handleSkip}
                accessibilityLabel={`Skip ${friend.display_name}`}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={COLORS.text.secondary} />
              </Pressable>
              <Text style={styles.skipLabel}>Skip</Text>
            </View>

            {/* Nudge button — accent circle */}
            <View style={styles.buttonWrapper}>
              <Pressable
                style={[styles.nudgeButton, nudgeLoading && styles.nudgeButtonDisabled]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  void handleNudge();
                }}
                disabled={nudgeLoading}
                accessibilityLabel={`Nudge ${friend.display_name} — open DM`}
                accessibilityRole="button"
              >
                <Ionicons name="chatbubble" size={24} color={COLORS.text.primary} />
              </Pressable>
              <Text style={styles.nudgeLabel}>Nudge</Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.xl,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    shadowColor: COLORS.shadow,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    shadowRadius: 12, // design spec shadow — no token equivalent
    // eslint-disable-next-line campfire/no-hardcoded-styles
    shadowOpacity: 0.4, // design spec shadow — no token equivalent
    shadowOffset: { width: 0, height: 4 },
    // eslint-disable-next-line campfire/no-hardcoded-styles
    elevation: 8, // Android shadow — no token equivalent
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    padding: SPACING.lg,
    alignItems: 'center',
  },
  infoColumn: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  nameText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  moodText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  lastActiveText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  buttonWrapper: {
    alignItems: 'center',
  },
  skipButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: RADII.full,
    backgroundColor: COLORS.surface.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  nudgeButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: RADII.full,
    backgroundColor: COLORS.interactive.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeButtonDisabled: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    opacity: 0.5, // loading state — no opacity token
  },
  nudgeLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});
