// Phase 33 — Telegram-style collapsing header for the friend profile screen.
//
// Owns all Reanimated animated-style blocks for the header area. scrollY is
// received as a prop because the parent screen (Plan 06) also passes it to
// Stack.Screen headerTitle so the nav-title cross-fade can share the same
// SharedValue reference (UI-SPEC §Reanimated Implementation Notes line 643).
//
// Implements UI-SPEC §Header Collapse Animation Contract verbatim.
// Named layout constants are locked to UI-SPEC §Spacing Scale §Exceptions.

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { StatusPill } from '@/components/friends/StatusPill';
import { FriendProfileBlurredWash } from '@/components/friends/FriendProfileBlurredWash';
import type { StatusValue } from '@/types/app';

// Header layout constants — not SPACING tokens per UI-SPEC §Spacing Scale §Exceptions.
// Locked at exact values used by Telegram-style anchor [CTX:D-01].
const BIG_AVATAR_SIZE = 140;
const COLLAPSED_AVATAR_SIZE = 32;
const HEADER_HEIGHT = 280;
const COLLAPSE_END = 160;   // = HEADER_HEIGHT - 120; where avatar finishes collapsing
const WASH_FADE_END = 220;  // = HEADER_HEIGHT - 60; wash fades earlier so nav title stays clean
// eslint-disable-next-line campfire/no-hardcoded-styles
const COLLAPSED_SCALE = COLLAPSED_AVATAR_SIZE / BIG_AVATAR_SIZE; // 0.2286 per UI-SPEC line 259

interface FriendProfileHeaderProps {
  scrollY: SharedValue<number>;     // owned by parent screen so Stack.Screen headerTitle can read it
  displayName: string;
  username: string;
  avatarUrl: string | null;
  // Heartbeat-aware status fields — same shape useFriendProfile (Plan 02) returns
  status: StatusValue | null;
  contextTag: string | null;
  statusExpiresAt: string | null;
  lastActiveAt: string | null;
  // Tap on big avatar → opens ImageViewerModal (handled by parent screen)
  onAvatarPress?: () => void;
}

export function FriendProfileHeader({
  scrollY,
  displayName,
  username,
  avatarUrl,
  status,
  contextTag,
  statusExpiresAt,
  lastActiveAt,
  onAvatarPress,
}: FriendProfileHeaderProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  // Scroll-driven wash opacity as a DerivedValue so FriendProfileBlurredWash
  // receives a SharedValue<number> (useDerivedValue returns a SharedValue).
  const washOpacity = useDerivedValue(() => {
    if (reducedMotion) return 0;
    return interpolate(scrollY.value, [0, WASH_FADE_END], [1, 0], Extrapolation.CLAMP);
  }, [reducedMotion]);

  const avatarStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: 0, transform: [{ scale: COLLAPSED_SCALE }, { translateY: -100 }] };
    }
    return {
      opacity: interpolate(scrollY.value, [0, 120, COLLAPSE_END], [1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(scrollY.value, [0, COLLAPSE_END], [1, COLLAPSED_SCALE], Extrapolation.CLAMP) },
        { translateY: interpolate(scrollY.value, [0, COLLAPSE_END], [0, -100], Extrapolation.CLAMP) },
      ],
    };
  }, [reducedMotion]);

  const nameStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 0 };
    return {
      opacity: interpolate(scrollY.value, [0, 80, COLLAPSE_END], [1, 1, 0], Extrapolation.CLAMP),
    };
  }, [reducedMotion]);

  const statusPillStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 0 };
    return {
      opacity: interpolate(scrollY.value, [0, 112, COLLAPSE_END], [1, 1, 0], Extrapolation.CLAMP),
    };
  }, [reducedMotion]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerRoot: {
          height: HEADER_HEIGHT,
          position: 'relative',
          overflow: 'hidden',
        },
        column: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: SPACING.xxl,
          gap: SPACING.xs,
        },
        avatarSlot: {
          // marginTop handled by paddingTop on column + flex centering
        },
        displayName: {
          fontSize: FONT_SIZE.xxl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          textAlign: 'center',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          textShadowColor: 'rgba(0,0,0,0.30)', // UI-SPEC drop-shadow for legibility over blurred wash
          // eslint-disable-next-line campfire/no-hardcoded-styles
          textShadowOffset: { width: 0, height: 1 },
          // eslint-disable-next-line campfire/no-hardcoded-styles
          textShadowRadius: 2,
        },
        username: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
        },
        statusPillSlot: {
          marginTop: SPACING.xs,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.headerRoot}>
      {/* Layer 1: Blurred wash backdrop (full bleed, Z-bottom) */}
      <FriendProfileBlurredWash avatarUrl={avatarUrl} washOpacity={washOpacity} />

      {/* Layer 2: Centered column — avatar, name, username, pill */}
      <View style={styles.column}>
        <Animated.View style={[styles.avatarSlot, avatarStyle]}>
          <AvatarCircle
            size={BIG_AVATAR_SIZE}
            imageUri={avatarUrl}
            displayName={displayName}
            onPress={avatarUrl ? onAvatarPress : undefined}
          />
        </Animated.View>

        <Animated.Text
          style={[styles.displayName, nameStyle]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {displayName}
        </Animated.Text>

        <Animated.Text style={[styles.username, nameStyle]} numberOfLines={1}>
          @{username}
        </Animated.Text>

        {status !== null && (
          <Animated.View style={[styles.statusPillSlot, statusPillStyle]}>
            <StatusPill
              status={status}
              status_expires_at={statusExpiresAt}
              last_active_at={lastActiveAt}
              context_tag={contextTag}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}
