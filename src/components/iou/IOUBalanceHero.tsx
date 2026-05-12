// IOUBalanceHero — split donut ring for /squad/expenses.
// Replaces the in-screen "Balances" title (the native stack header already
// provides one) with a focal ring showing how the user's IOU activity is split
// between money owed to them (green arc) and money they owe (red arc).
//
// Uses TILE_ACCENTS.iouPositive / iouNegative so the screen stays chromatically
// consistent with the Activity bento IOUTile and the home IOUCard.

import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';
import { TILE_ACCENTS, ACCENT_FILL } from '@/components/squad/bento/tileAccents';
import { formatCentsDisplay } from '@/utils/currencyFormat';

const SIZE = 168;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Tiny gap (in degrees) between the two arcs so they read as distinct segments.
const SEGMENT_GAP_DEG = 4;
const SEGMENT_GAP_LEN = (SEGMENT_GAP_DEG / 360) * CIRCUMFERENCE;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface IOUBalanceHeroProps {
  owedToYouCents: number; // sum of positive per-friend net balances (they owe you)
  youOweCents: number; // sum of |negative per-friend net balances| (you owe them)
}

export function IOUBalanceHero({ owedToYouCents, youOweCents }: IOUBalanceHeroProps) {
  const { colors } = useTheme();

  const safeOwed = Math.max(0, owedToYouCents);
  const safeOwe = Math.max(0, youOweCents);
  const total = safeOwed + safeOwe;
  const netCents = safeOwed - safeOwe;

  const greenRatio = total === 0 ? 0 : safeOwed / total;
  const redRatio = total === 0 ? 0 : safeOwe / total;

  // Reserve room for two small gaps when both segments are present.
  const hasBothSegments = safeOwed > 0 && safeOwe > 0;
  const totalGapLen = hasBothSegments ? SEGMENT_GAP_LEN * 2 : 0;
  const drawableLen = Math.max(0, CIRCUMFERENCE - totalGapLen);
  const greenLen = greenRatio * drawableLen;
  const redLen = redRatio * drawableLen;
  // Red arc starts after green arc + one gap (in path units).
  const redStartOffset = -(greenLen + (hasBothSegments ? SEGMENT_GAP_LEN : 0));

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (cancelled) return;
        if (enabled) {
          progress.setValue(1);
        } else {
          progress.setValue(0);
          Animated.timing(progress, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
      })
      .catch(() => {
        Animated.timing(progress, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [greenLen, redLen, progress]);

  // Each arc uses a dasharray equal to (arc length, rest of circle) so only the
  // arc shows. Animate the dashoffset from arcLen (hidden) toward 0 (drawn from
  // start angle clockwise) for the green segment; the red segment's dashoffset
  // is shifted by greenLen + gap so it begins where green ends.
  const greenDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [greenLen, 0],
  });
  const redDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [redStartOffset + redLen, redStartOffset],
  });

  const settled = total === 0;
  const isPositive = netCents >= 0;
  const netAbs = formatCentsDisplay(Math.abs(netCents));
  const netDisplay = settled ? '$0' : isPositive ? `+${netAbs}` : `-${netAbs}`;
  const netColor = settled
    ? colors.text.primary
    : isPositive
      ? TILE_ACCENTS.iouPositive
      : TILE_ACCENTS.iouNegative;

  const caption = settled ? 'All settled up' : 'Net balance';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          alignItems: 'center',
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.lg,
        },
        ringWrap: {
          width: SIZE,
          height: SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        },
        centerStack: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
        },
        netAmount: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          fontSize: 34,
          fontFamily: FONT_FAMILY.display.semibold,
          letterSpacing: -1,
          color: netColor,

          lineHeight: 38,
        },
        netCaption: {
          marginTop: SPACING.xs,
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
        legendRow: {
          flexDirection: 'row',
          marginTop: SPACING.xl,
          paddingHorizontal: SPACING.lg,
          gap: SPACING.sm,
          alignSelf: 'stretch',
        },
        legendChip: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
          backgroundColor: colors.surface.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
        },
        legendIconBubble: {
          width: 28,

          height: 28,

          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: SPACING.sm,
        },
        legendText: {
          flex: 1,
        },
        legendLabel: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        },
        legendAmount: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: 2,
        },
      }),
    [colors, netColor]
  );

  const a11yLabel = settled
    ? 'All settled up'
    : `Net balance ${netDisplay}. You're owed ${formatCentsDisplay(safeOwed)}, you owe ${formatCentsDisplay(safeOwe)}.`;

  return (
    <View style={styles.wrapper} accessibilityLabel={a11yLabel}>
      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.surface.overlay}
            strokeWidth={STROKE}
            fill="transparent"
          />
          {safeOwed > 0 && (
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={TILE_ACCENTS.iouPositive}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={`${greenLen} ${CIRCUMFERENCE}`}
              strokeDashoffset={greenDashoffset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          )}
          {safeOwe > 0 && (
            <AnimatedCircle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={TILE_ACCENTS.iouNegative}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={`${redLen} ${CIRCUMFERENCE}`}
              strokeDashoffset={redDashoffset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          )}
        </Svg>
        <View style={styles.centerStack} pointerEvents="none">
          <Text style={styles.netAmount}>{netDisplay}</Text>
          <Text style={styles.netCaption}>{caption}</Text>
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendChip}>
          <View
            style={[
              styles.legendIconBubble,
              { backgroundColor: `${TILE_ACCENTS.iouPositive}${ACCENT_FILL}` },
            ]}
          >
            <Ionicons name="arrow-down" size={16} color={TILE_ACCENTS.iouPositive} />
          </View>
          <View style={styles.legendText}>
            <Text style={styles.legendLabel}>You get</Text>
            <Text style={[styles.legendAmount, { color: TILE_ACCENTS.iouPositive }]}>
              {formatCentsDisplay(safeOwed)}
            </Text>
          </View>
        </View>
        <View style={styles.legendChip}>
          <View
            style={[
              styles.legendIconBubble,
              { backgroundColor: `${TILE_ACCENTS.iouNegative}${ACCENT_FILL}` },
            ]}
          >
            <Ionicons name="arrow-up" size={16} color={TILE_ACCENTS.iouNegative} />
          </View>
          <View style={styles.legendText}>
            <Text style={styles.legendLabel}>You pay</Text>
            <Text style={[styles.legendAmount, { color: TILE_ACCENTS.iouNegative }]}>
              {formatCentsDisplay(safeOwe)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
