// Phase 1.1 v1.3.5 — OwnStatusCard full-width status card for HomeScreen (Plan 01).
// Replaces OwnStatusPill in the header with a prominent card in the ScrollView.
// Shows current status with large bold text, heartbeat dot, context + window subtitle,
// and edit affordance. Pulse always active when status is set.

import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, ANIMATION } from '@/theme';
import { useStatusStore } from '@/stores/useStatusStore';
import { computeHeartbeatState } from '@/lib/heartbeat';

interface OwnStatusCardProps {
  onPress: () => void;
}

function formatUntil(expiresAt: string): string {
  const d = new Date(expiresAt);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `until ${h12}${period}` : `until ${h12}:${String(m).padStart(2, '0')}${period}`;
}

const MOOD_DISPLAY: Record<string, string> = { free: "I'm Free", maybe: 'Maybe', busy: 'Busy' };

export function OwnStatusCard({ onPress }: OwnStatusCardProps) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    card: {
      ...colors.cardElevation,
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: RADII.full,
    },
    dotInline: {
      marginRight: SPACING.sm,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: FONT_SIZE.xxl,
      fontFamily: FONT_FAMILY.display.bold,
      color: colors.text.primary,
    },
    titleInactive: {
      color: colors.text.secondary,
    },
    subtitle: {
      fontSize: FONT_SIZE.sm,
      color: colors.text.secondary,
      marginTop: SPACING.xs,
    },
    editIcon: {
      marginLeft: SPACING.md,
    },
  }), [colors]);

  // 1. Status reading (same pattern as OwnStatusPill)
  const currentStatus = useStatusStore((s) => s.currentStatus);
  const heartbeatState = computeHeartbeatState(
    currentStatus?.status_expires_at ?? null,
    currentStatus?.last_active_at ?? null
  );
  const hasActiveStatus = currentStatus !== null && heartbeatState !== 'dead';

  // Scale spring press feedback (HOME-04)
  const cardScaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(cardScaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
      isInteraction: false,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(cardScaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
      isInteraction: false,
    }).start();
  }

  // 2. Pulse animation — always pulses when status is active
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!hasActiveStatus) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.6,
          duration: 800,
          useNativeDriver: true,
          isInteraction: false, // D-04: never block FlatList rendering
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hasActiveStatus, pulseAnim]);

  // 3. Dot color — matches status when active, gray when inactive
  const statusDotColor: Record<string, string> = {
    free: colors.status.free,
    maybe: colors.status.maybe,
    busy: colors.status.busy,
  };

  const dotColor =
    hasActiveStatus && currentStatus
      ? (statusDotColor[currentStatus.status] ?? colors.text.secondary)
      : colors.text.secondary;

  // 4. Text content
  let titleText: string;
  let subtitleText: string | null;

  if (hasActiveStatus && currentStatus) {
    titleText = MOOD_DISPLAY[currentStatus.status] ?? currentStatus.status;
    const parts: string[] = [];
    if (currentStatus.context_tag) parts.push(currentStatus.context_tag);
    if (currentStatus.status_expires_at) parts.push(formatUntil(currentStatus.status_expires_at));
    subtitleText = parts.length > 0 ? parts.join(' · ') : null;
  } else {
    titleText = 'Inactive';
    subtitleText = 'Tap to set your status';
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1.0}
      accessibilityRole="button"
      accessibilityLabel={hasActiveStatus ? 'Edit your status' : 'Set your status'}
      style={styles.card}
    >
      <Animated.View style={{ transform: [{ scale: cardScaleAnim }] }}>
        <View style={styles.bottomRow}>
          <Animated.View
            style={[styles.dot, styles.dotInline, { backgroundColor: dotColor, transform: [{ scale: pulseAnim }] }]}
          />
          <View style={styles.textContainer}>
            <Text style={[styles.title, !hasActiveStatus && styles.titleInactive]} numberOfLines={1}>
              {titleText}
            </Text>
            {subtitleText !== null && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitleText}
              </Text>
            )}
          </View>
          <Ionicons name="pencil" size={18} color={colors.text.secondary} style={styles.editIcon} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
