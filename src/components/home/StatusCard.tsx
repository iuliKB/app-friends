// Presentational status card for the home screen.
// React Native translation of a CSS brief — see statusCardTokens.ts for the
// translation notes (radial blooms via SVG, sunset-shift via panning an
// over-sized LinearGradient, no global keyframes).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { useTheme, FONT_FAMILY } from '@/theme';
import {
  STATUS_CARD_TOKENS,
  STATUS_DATA,
  type StatusKey,
} from './statusCardTokens';

interface StatusCardProps {
  status: StatusKey;
  /** Override the demo context line. Empty string renders nothing. */
  context?: string;
  /** Override the demo expiry. Pass null to omit. */
  expiry?: string | null;
  /** When provided, the card becomes pressable (e.g. to open StatusPickerSheet). */
  onEditPress?: () => void;
}

const CARD_RADIUS = 16;
const SUNSET_DURATION_MS = 14000;
const PULSE_CYCLE_MS = 1600;
// Toggle the corner radial blooms. Flip to `true` to bring them back.
const SHOW_BLOOMS = false;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (mounted) setReduced(r);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (r) => setReduced(!!r),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

export function StatusCard({ status, context, expiry, onEditPress }: StatusCardProps) {
  const { isDark } = useTheme();
  const themeKey = isDark ? 'dark' : 'light';
  const t = STATUS_CARD_TOKENS[themeKey][status];
  const data = STATUS_DATA[status];
  const reduceMotion = useReducedMotion();

  const resolvedContext = context !== undefined ? context : data.context;
  const resolvedExpiry  = expiry  !== undefined ? expiry  : data.expiry;

  // --- Sunset-shift gradient pan ---
  // The gradient layer is 200% the card width and absolutely positioned.
  // We translate it horizontally between 0 and -cardWidth (i.e. 50% of itself)
  // for the equivalent of `background-position: 0% 50% → 100% 50%`.
  const [cardWidth, setCardWidth] = useState(0);
  const panAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!cardWidth || reduceMotion) {
      panAnim.setValue(0);
      return;
    }
    const half = SUNSET_DURATION_MS / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(panAnim, {
          toValue: -cardWidth,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(panAnim, {
          toValue: 0,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [cardWidth, reduceMotion, panAnim]);

  // --- Pulse ring + dot ---
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.7)).current;
  const dotScale = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      ringScale.setValue(1);
      ringOpacity.setValue(0);
      dotScale.setValue(1);
      dotOpacity.setValue(1);
      return;
    }
    const half = PULSE_CYCLE_MS / 2;
    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 2.6, duration: PULSE_CYCLE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
          Animated.timing(ringOpacity, { toValue: 0,   duration: PULSE_CYCLE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1,   duration: 0, useNativeDriver: true, isInteraction: false }),
          Animated.timing(ringOpacity, { toValue: 0.7, duration: 0, useNativeDriver: true, isInteraction: false }),
        ]),
      ]),
    );
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dotScale,   { toValue: 1.6,  duration: half, useNativeDriver: true, isInteraction: false }),
          Animated.timing(dotOpacity, { toValue: 0.55, duration: half, useNativeDriver: true, isInteraction: false }),
        ]),
        Animated.parallel([
          Animated.timing(dotScale,   { toValue: 1, duration: half, useNativeDriver: true, isInteraction: false }),
          Animated.timing(dotOpacity, { toValue: 1, duration: half, useNativeDriver: true, isInteraction: false }),
        ]),
      ]),
    );
    ringLoop.start();
    dotLoop.start();
    return () => { ringLoop.stop(); dotLoop.stop(); };
  }, [reduceMotion, ringScale, ringOpacity, dotScale, dotOpacity]);

  function handleLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w !== cardWidth) setCardWidth(w);
  }

  const styles = useMemo(() => StyleSheet.create({
    card: {
      borderRadius: CARD_RADIUS,
      borderWidth: 1,
      borderColor: t.border,
      overflow: 'hidden',
      paddingHorizontal: 16,
      paddingVertical: 18,
      backgroundColor: 'transparent',
    },
    gradientLayer: {
      position: 'absolute',
      top: 0, bottom: 0,
      left: 0,
      // Width is set inline from the measured cardWidth (× 2) — RN computes
      // percentage widths against the parent's *content box*, so `width: '200%'`
      // would fall short by 2 × paddingHorizontal and leave an empty strip
      // at the loop extremes.
    },
    gradientFill: { flex: 1 },
    bloomTopLeft: {
      position: 'absolute',
      top: -30,
      left: -30,
      width: 110,
      height: 110,
    },
    bloomBottomRight: {
      position: 'absolute',
      bottom: -30,
      right: -25,
      width: 100,
      height: 100,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    eyebrow: {
      fontFamily: FONT_FAMILY.display.semibold,
      fontSize: 10,
      letterSpacing: 1.2,        // 0.12em × 10px
      textTransform: 'uppercase',
      color: t.eyebrow,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.chip.border,
      backgroundColor: t.chip.bg,
    },
    chipDotWrap: {
      width: 6,
      height: 6,
      marginRight: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.chip.dot,
      ...(t.chip.pulseDotHaloColor
        ? {
            shadowColor: t.chip.pulseDotHaloColor,
            shadowOpacity: 1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          }
        : null),
    },
    chipRing: {
      position: 'absolute',
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.chip.dot,
    },
    chipLabel: {
      fontFamily: FONT_FAMILY.body.bold,
      fontSize: 10,
      letterSpacing: 0.5,
      color: t.chip.text,
    },
    title: {
      marginTop: 8,
      fontFamily: FONT_FAMILY.display.extrabold,
      fontSize: 32,
      lineHeight: 32,
      letterSpacing: -0.96,        // -0.03em × 32px
      color: t.title.color,
      ...(t.title.textShadow
        ? {
            textShadowColor: t.title.textShadow.color,
            textShadowOffset: { width: 0, height: t.title.textShadow.offsetY },
            textShadowRadius: t.title.textShadow.radius,
          }
        : null),
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 8,
    },
    bodyText: {
      flex: 1,
      fontFamily: FONT_FAMILY.body.regular,
      fontSize: 13,
      color: t.bodyText,
    },
    pencilWrap: { marginLeft: 12 },
  }), [t]);

  const subtitleParts: string[] = [];
  if (resolvedContext) subtitleParts.push(resolvedContext);
  if (resolvedExpiry) subtitleParts.push(resolvedExpiry);
  const subtitle = subtitleParts.join(' · ');

  const cardInner = (
    <View
      style={styles.card}
      onLayout={handleLayout}
      accessibilityRole={onEditPress ? 'button' : 'summary'}
      accessibilityLabel={
        onEditPress
          ? `Edit status. Currently ${data.title}${subtitle ? `, ${subtitle}` : ''}`
          : `Your status: ${data.title}${subtitle ? `, ${subtitle}` : ''}`
      }
    >
      {/* Animated diagonal gradient — panned horizontally for sunset-shift */}
      <Animated.View
        style={[
          styles.gradientLayer,
          { width: cardWidth * 2, transform: [{ translateX: panAnim }] },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={t.gradient.colors}
          locations={t.gradient.locations}
          start={t.gradient.start}
          end={t.gradient.end}
          style={styles.gradientFill}
        />
      </Animated.View>

      {SHOW_BLOOMS && (
        <>
          {/* Top-left bloom — small, barely visible accent */}
          <View pointerEvents="none" style={styles.bloomTopLeft}>
            <Svg width={110} height={110}>
              <Defs>
                <RadialGradient id={`bloomTL-${themeKey}-${status}`} cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                  <Stop offset="0%" stopColor={t.bloom.topLeft} stopOpacity={1} />
                  <Stop offset="100%" stopColor={t.bloom.topLeft} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width={110} height={110} fill={`url(#bloomTL-${themeKey}-${status})`} />
            </Svg>
          </View>

          {/* Bottom-right bloom */}
          <View pointerEvents="none" style={styles.bloomBottomRight}>
            <Svg width={100} height={100}>
              <Defs>
                <RadialGradient id={`bloomBR-${themeKey}-${status}`} cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                  <Stop offset="0%" stopColor={t.bloom.bottomRight} stopOpacity={1} />
                  <Stop offset="100%" stopColor={t.bloom.bottomRight} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width={100} height={100} fill={`url(#bloomBR-${themeKey}-${status})`} />
            </Svg>
          </View>
        </>
      )}

      {/* Content */}
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>YOUR STATUS</Text>
        <View style={styles.chip}>
          <View style={styles.chipDotWrap}>
            <Animated.View
              style={[
                styles.chipRing,
                { transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
              pointerEvents="none"
            />
            <Animated.View
              style={[
                styles.chipDot,
                { transform: [{ scale: dotScale }], opacity: dotOpacity },
              ]}
            />
          </View>
          <Text style={styles.chipLabel}>NOW</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>{data.title}</Text>

      <View style={styles.bottomRow}>
        <Text style={styles.bodyText} numberOfLines={1}>{subtitle}</Text>
        <View style={styles.pencilWrap}>
          <Ionicons name="pencil-outline" size={14} color={t.pencil} />
        </View>
      </View>
    </View>
  );

  if (onEditPress) {
    return (
      <TouchableOpacity onPress={onEditPress} activeOpacity={0.92}>
        {cardInner}
      </TouchableOpacity>
    );
  }
  return cardInner;
}
