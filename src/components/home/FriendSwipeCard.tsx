// Premium iOS-inspired landscape swipe card — sized to match radar section.
// Tinder-style swipe logic: left=skip, right=nudge. DM via small icon button.

import React, { useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { openChat } from '@/lib/openChat';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, SHADOWS } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { computeHeartbeatState, formatDistanceToNow } from '@/lib/heartbeat';
import type { FriendWithStatus } from '@/hooks/useFriends';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

const MAX_ROTATE_DEG = 10;

const AVATAR_SIZE = 52;

const STATUS_DOT_SIZE = 16;

const DM_BUTTON_SIZE = 36;

const CARD_RADIUS = 20;

const STAMP_REVEAL_PX = 50;

const STATUS_COLORS: Record<string, string> = {
  free: '#22C55E',
  maybe: '#EAB308',
  busy: '#EF4444',
};

const STATUS_PILL_BG: Record<string, string> = {
  free: 'rgba(34, 197, 94, 0.14)',
  maybe: 'rgba(234, 179, 8, 0.14)',
  busy: 'rgba(239, 68, 68, 0.14)',
};

const STATUS_GRADIENT: Record<string, readonly [string, string]> = {
  free: ['rgba(34,197,94,0.10)', 'rgba(34,197,94,0)'],
  maybe: ['rgba(234,179,8,0.10)', 'rgba(234,179,8,0)'],
  busy: ['rgba(239,68,68,0.10)', 'rgba(239,68,68,0)'],
};

const MOOD_LABEL: Record<string, string> = {
  free: 'Free',
  maybe: 'Maybe',
  busy: 'Busy',
};

export interface SwipeCardProps {
  friend: FriendWithStatus;
  onSkip: () => void;
  onNudge: () => void;
  width: number;
  /** Other friends behind this one — shown as a stack count chip. */
  othersCount?: number;
  /** How many other friends are currently free — drives the mutual-context eyebrow. */
  alsoFreeCount?: number;
}

// Local "until 6pm" / "until 5:30pm" formatter for status_expires_at.
function formatUntil(expiresAt: string): string {
  const d = new Date(expiresAt);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `until ${h12}${period}` : `until ${h12}:${String(m).padStart(2, '0')}${period}`;
}

export function FriendSwipeCard({
  friend,
  onSkip,
  onNudge,
  width,
  othersCount = 0,
  alsoFreeCount = 0,
}: SwipeCardProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface.card,
          borderRadius: CARD_RADIUS,
          ...SHADOWS.swipeCard,
          overflow: 'hidden',
          padding: SPACING.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
        topRow: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        avatarWrapper: {
          position: 'relative',
          marginRight: SPACING.md,
        },
        statusDot: {
          position: 'absolute',
          right: -2,
          bottom: -2,
          width: STATUS_DOT_SIZE,
          height: STATUS_DOT_SIZE,
          borderRadius: RADII.full,
          borderWidth: 3,
          borderColor: colors.surface.card,
        },
        identityColumn: {
          flex: 1,
          minWidth: 0,
        },
        nameText: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          letterSpacing: -0.4,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginBottom: 2,
        },
        metaLine: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        username: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        pillRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          marginTop: SPACING.xs,
        },
        untilText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          flexShrink: 1,
        },
        dmButton: {
          width: DM_BUTTON_SIZE,
          height: DM_BUTTON_SIZE,
          borderRadius: RADII.full,
          backgroundColor: colors.interactive.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        vibeRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACING.xs,
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
          marginVertical: SPACING.sm,
        },
        eyebrow: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.display.semibold,
          textTransform: 'uppercase',
          letterSpacing: 1.4,
          marginBottom: SPACING.xs,
        },
        contextText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          lineHeight: 22,
          letterSpacing: -0.2,
        },
        contextEmpty: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          fontStyle: 'italic',
        },
        bottomRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: SPACING.sm,
        },
        statusPill: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
          borderRadius: RADII.full,
        },
        pillDot: {
          width: 6,
          height: 6,
          borderRadius: RADII.full,
          marginRight: SPACING.xs,
        },
        statusPillText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },
        planChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
          borderRadius: RADII.full,
          borderWidth: StyleSheet.hairlineWidth,
        },
        planChipText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.display.semibold,
          letterSpacing: 0.3,
        },
        stackChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
        },
        stackChipText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
          letterSpacing: 0.3,
        },
        stamp: {
          position: 'absolute',
          top: SPACING.md,
        },
        stampNudge: {
          right: SPACING.md,
          transform: [{ rotate: '8deg' }],
        },
        stampSkip: {
          left: SPACING.md,
          transform: [{ rotate: '-8deg' }],
        },
        stampText: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.bold,
          letterSpacing: 1.5,
        },
      }),
    [colors, isDark]
  );

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const heartbeatState = computeHeartbeatState(friend.status_expires_at, friend.last_active_at);

  const moodLabel = MOOD_LABEL[friend.status] ?? friend.status;
  const statusColor = STATUS_COLORS[friend.status] ?? colors.text.secondary;
  const statusPillBg = STATUS_PILL_BG[friend.status] ?? 'rgba(255,255,255,0.08)';
  const statusGradient = STATUS_GRADIENT[friend.status] ?? ['transparent', 'transparent'];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const nudgeTintStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? Math.min(translateX.value / SWIPE_THRESHOLD, 0.28) : 0,
  }));

  const skipTintStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? Math.min(-translateX.value / SWIPE_THRESHOLD, 0.22) : 0,
  }));

  const nudgeStampStyle = useAnimatedStyle(() => ({
    opacity:
      translateX.value > 0
        ? Math.min((translateX.value - STAMP_REVEAL_PX) / (SWIPE_THRESHOLD - STAMP_REVEAL_PX), 1)
        : 0,
  }));

  const skipStampStyle = useAnimatedStyle(() => ({
    opacity:
      translateX.value < 0
        ? Math.min((-translateX.value - STAMP_REVEAL_PX) / (SWIPE_THRESHOLD - STAMP_REVEAL_PX), 1)
        : 0,
  }));

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.15;
      rotate.value = (e.translationX / SCREEN_WIDTH) * MAX_ROTATE_DEG;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir = e.translationX > 0 ? 1 : -1;
        const callback = e.translationX > 0 ? onNudge : onSkip;
        translateX.value = withTiming(dir * SCREEN_WIDTH * 1.5, { duration: 280 }, () => {
          runOnJS(callback)();
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  function handlePlan() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/plan-create?preselect_friend_id=${friend.friend_id}` as never);
  }

  async function handleDm() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await openChat(router, {
      kind: 'dmFriend',
      friendId: friend.friend_id,
      friendName: friend.display_name,
    });
  }

  const accessibilityLabel = `${friend.display_name}, ${moodLabel}${
    friend.context_tag ? ` · ${friend.context_tag}` : ''
  }. Active ${formatDistanceToNow(friend.last_active_at)}. Swipe left to skip, swipe right to nudge, tap message to DM.`;

  const fadingOpacity = heartbeatState === 'fading' ? 0.6 : 1.0;

  return (
    <View style={{ opacity: fadingOpacity }}>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.card, { width }, animatedStyle]}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="none"
        >
          {/* Subtle status-tinted gradient — premium iOS texture */}
          <LinearGradient
            colors={statusGradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: CARD_RADIUS }]}
          />

          {/* Right-drag green tint */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,

              { borderRadius: CARD_RADIUS, backgroundColor: '#22C55E' },
              nudgeTintStyle,
            ]}
            pointerEvents="none"
          />

          {/* Left-drag red tint */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,

              { borderRadius: CARD_RADIUS, backgroundColor: '#EF4444' },
              skipTintStyle,
            ]}
            pointerEvents="none"
          />

          {/* Top row: avatar + identity */}
          <View style={styles.topRow}>
            <View style={styles.avatarWrapper}>
              <AvatarCircle
                size={AVATAR_SIZE}
                imageUri={friend.avatar_url}
                displayName={friend.display_name}
              />
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            </View>
            <View style={styles.identityColumn}>
              <Text style={styles.nameText} numberOfLines={1}>
                {friend.display_name}
              </Text>
              {friend.username ? (
                <Text style={styles.username} numberOfLines={1}>
                  @{friend.username}
                </Text>
              ) : null}
              <View style={styles.pillRow}>
                <View style={[styles.statusPill, { backgroundColor: statusPillBg }]}>
                  <View style={[styles.pillDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusPillText, { color: statusColor }]}>{moodLabel}</Text>
                </View>
                <Text style={styles.untilText} numberOfLines={1}>
                  {friend.status_expires_at
                    ? formatUntil(friend.status_expires_at)
                    : formatDistanceToNow(friend.last_active_at)}
                </Text>
              </View>
            </View>
          </View>

          {/* Hairline divider */}
          <View style={styles.divider} />

          {/* Vibe row: eyebrow on the left + DM button on the right */}
          <View style={styles.vibeRow}>
            <Text style={[styles.eyebrow, { color: statusColor, marginBottom: 0 }]}>Vibe</Text>
            <Pressable
              style={({ pressed }) => [styles.dmButton, pressed && { opacity: 0.85 }]}
              onPress={handleDm}
              hitSlop={8}
              accessibilityLabel={`Send ${friend.display_name} a direct message`}
              accessibilityRole="button"
            >
              {}
              <Ionicons name="chatbubble-ellipses" size={18} color="#0A0A0A" />
            </Pressable>
          </View>

          {/* Context — the vibe is the lead now */}
          {friend.context_tag ? (
            <Text style={styles.contextText} numberOfLines={2}>
              {friend.context_tag}
            </Text>
          ) : (
            <Text style={styles.contextEmpty} numberOfLines={2}>
              Hit them up — see what they&apos;re down for
            </Text>
          )}

          {/* Bottom strip: Plan CTA (when free + mutuals also free) | stack chip */}
          <View style={styles.bottomRow}>
            {friend.status === 'free' && alsoFreeCount > 0 ? (
              <Pressable
                onPress={handlePlan}
                style={({ pressed }) => [
                  styles.planChip,
                  { borderColor: statusColor, backgroundColor: statusPillBg },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityLabel={`+${alsoFreeCount} also free — plan with ${friend.display_name}`}
                accessibilityRole="button"
              >
                <Ionicons name="people-outline" size={14} color={statusColor} />
                <Text style={[styles.planChipText, { color: statusColor }]}>
                  +{alsoFreeCount} also free · Plan
                </Text>
                <Ionicons name="arrow-forward" size={12} color={statusColor} />
              </Pressable>
            ) : (
              <View />
            )}
            {othersCount > 0 ? (
              <View style={styles.stackChip}>
                <Ionicons name="albums-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.stackChipText}>
                  +{othersCount} {othersCount === 1 ? 'other' : 'others'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Swipe stamps */}
          <Animated.View
            style={[styles.stamp, styles.stampNudge, nudgeStampStyle]}
            pointerEvents="none"
          >
            {}
            <Text style={[styles.stampText, { color: '#22C55E' }]}>NUDGE</Text>
          </Animated.View>
          <Animated.View
            style={[styles.stamp, styles.stampSkip, skipStampStyle]}
            pointerEvents="none"
          >
            {}
            <Text style={[styles.stampText, { color: '#EF4444' }]}>SKIP</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
