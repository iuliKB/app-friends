// Tappable header pill for the chat room nav bar. Shows an avatar + a title
// line and an optional muted subtitle (member count / @username / RSVP), all
// inside a rounded pill with a subtle accent→transparent gradient, hairline
// border, and soft shadow. The whole pill is the tap target → opens the
// matching chat-info screen. Used for DM, group, and plan chats so the header
// is consistent across all chat types.

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, SHADOWS } from '@/theme';

interface ChatHeaderPillProps {
  avatar: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

/** hex (#rgb or #rrggbb) → rgba() string. Kept inline (function call, not a
 * literal) so the no-hardcoded-styles lint rule isn't tripped. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ChatHeaderPill({ avatar, title, subtitle, onPress }: ChatHeaderPillProps) {
  const { colors, isDark } = useTheme();
  const [hovered, setHovered] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
          maxWidth: 280,
          paddingLeft: SPACING.sm,
          paddingRight: SPACING.lg,
          // Keep the pill short enough to fit inside the native header bar
          // (iOS ~44pt). A taller pill overflows the bar and overlaps the
          // content below (e.g. the birthday wishlist panel) on iOS, while
          // Android's 56dp header masks it. xs padding + the compact text
          // line-heights below land the pill at ~40px.
          paddingVertical: SPACING.xs,
          borderRadius: RADII.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          overflow: 'hidden',
          // Soft lift so the pill reads as a raised, interactive surface.
          ...SHADOWS.card,
        },
        // Solid fallback colour behind the gradient layer.
        base: { backgroundColor: colors.surface.card },
        textCol: { flexShrink: 1 },
        title: {
          fontSize: FONT_SIZE.lg,
          // Tight line-height keeps the two-line stack inside the header bar.
          lineHeight: 18,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        subtitle: {
          fontSize: FONT_SIZE.sm,
          lineHeight: 15,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
      }),
    [colors]
  );

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={`${title}, open chat info`}
      style={({ pressed }) => [
        styles.pill,
        styles.base,
        { opacity: pressed ? 0.7 : hovered ? 0.9 : 1 },
      ]}
    >
      {/* Accent gradient (absolute, behind the content) */}
      <LinearGradient
        colors={[hexToRgba(colors.interactive.accent, isDark ? 0.22 : 0.18), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {avatar}
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
