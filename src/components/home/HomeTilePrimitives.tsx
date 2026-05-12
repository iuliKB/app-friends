/**
 * Home tile primitives — shared `TileShell` + `EyebrowPill` factored out of
 * `YourZoneSection.tsx` (Phase 29.1 Plan 08, Pitfall 7 mitigation).
 *
 * These are the neon-green Home aesthetic primitives — they MUST NOT import
 * from `src/components/squad/bento/*` (`BentoCard`, `tileSurface`,
 * `tileAccents`). The Home palette is single-accent (`colors.interactive.accent`)
 * and stays distinct from the per-tool cyan/violet accents used by Bento tiles.
 *
 * Consumed by:
 *   - `YourZoneSection.tsx` (existing Birthday + IOU + Streak tiles)
 *   - `HomeHabitsTile.tsx` (Phase 29.1 — Habits home widget)
 *   - `HomeTodosTile.tsx` (Phase 29.1 — To-Dos home widget)
 */
import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ANIMATION, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

// --- Spring press helper ---
// Shared press-feedback animator: 1.0 → 0.97 → 1.0 spring on every Pressable
// using `TileShell`. Mirrors `BentoCard` press scale but lives on the Home
// surface (no haptic — light haptic is reserved for Bento per UI-SPEC).
export function useSpringPress() {
  const scale = useRef(new Animated.Value(1)).current;
  return {
    scale,
    handlers: {
      onPressIn: () =>
        Animated.spring(scale, {
          toValue: 0.97,
          useNativeDriver: true,
          damping: ANIMATION.easing.spring.damping,
          stiffness: ANIMATION.easing.spring.stiffness,
          isInteraction: false,
        }).start(),
      onPressOut: () =>
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: ANIMATION.easing.spring.damping,
          stiffness: ANIMATION.easing.spring.stiffness,
          isInteraction: false,
        }).start(),
    },
  };
}

// --- Tile shell ---
// All Home tiles share the StatusCard hierarchy: a 10-12px uppercase eyebrow,
// a hero text block, an optional caption, and a chip slot in the top-right
// corner. Distinguished by content, not by colour — single neon-green accent
// throughout, mirroring StatusCard / EventCard.
export interface TileShellProps {
  eyebrow: string | React.ReactNode;
  chip?: React.ReactNode;
  hot?: boolean;
  onPress: () => void;
  a11yLabel: string;
  children: React.ReactNode;
}

export function TileShell({ eyebrow, chip, hot, onPress, a11yLabel, children }: TileShellProps) {
  const { colors, isDark } = useTheme();
  const { scale, handlers } = useSpringPress();

  // When "hot", lay a faint neon-green gradient over the card (top → fade) so
  // the active state reads like an ember without breaking the monochrome
  // palette. Cold tiles are clean charcoal cards.
  const glowColors: readonly [string, string] = isDark
    ? ['rgba(185,255,59,0.10)', 'rgba(185,255,59,0)']
    : ['rgba(77,124,0,0.06)', 'rgba(77,124,0,0)'];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tile: {
          flex: 1,
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: SPACING.md,
          overflow: 'hidden',
          ...colors.cardElevation,
        },
        glow: {
          ...StyleSheet.absoluteFillObject,
        },
        topRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        },
        eyebrow: {
          fontFamily: FONT_FAMILY.display.semibold,
          fontSize: FONT_SIZE.xs,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colors.text.secondary,
        },
        body: {
          flex: 1,
          justifyContent: 'flex-end',
        },
      }),
    [colors]
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        pressed ? { borderColor: colors.interactive.accent } : null,
      ]}
      onPress={onPress}
      {...handlers}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      {hot ? <LinearGradient colors={glowColors} style={styles.glow} pointerEvents="none" /> : null}
      <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
        <View style={styles.topRow}>
          {typeof eyebrow === 'string' ? <Text style={styles.eyebrow}>{eyebrow}</Text> : eyebrow}
          {chip ?? null}
        </View>
        <View style={styles.body}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

// --- Eyebrow pill ---
// Accent-tinted glass pill combining a small icon and the tile title. Mirrors
// EventCard's date badge: 18% accent bg + 45% accent border, full pill shape.
export function EyebrowPill({ icon, label }: { icon: IconName; label: string }) {
  const { colors, isDark } = useTheme();
  const bg = isDark ? 'rgba(185,255,59,0.18)' : 'rgba(77,124,0,0.10)';
  const border = isDark ? 'rgba(185,255,59,0.45)' : 'rgba(77,124,0,0.30)';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pill: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: SPACING.xs,
          paddingHorizontal: SPACING.sm,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 4,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: bg,
        },
        text: {
          fontFamily: FONT_FAMILY.body.bold,
          fontSize: FONT_SIZE.xs,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: colors.interactive.accent,
        },
      }),
    [colors, bg, border]
  );

  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={12} color={colors.interactive.accent} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}
