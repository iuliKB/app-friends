import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { useStatus } from '@/hooks/useStatus';
import { formatWindowLabel } from '@/lib/windows';

const AUTO_DISMISS_MS = 8000;
const BANNER_HEIGHT = 72;

const MOOD_LABEL: Record<'free' | 'busy' | 'maybe', string> = {
  free: 'Free',
  busy: 'Busy',
  maybe: 'Maybe',
};

interface ReEngagementBannerProps {
  /** Plan 06 wires this to scroll the MoodPicker into focus on "Update" tap. */
  onUpdatePressed: () => void;
}

export function ReEngagementBanner({ onUpdatePressed }: ReEngagementBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    banner: {
      backgroundColor: colors.offline.bg,
      overflow: 'hidden',
      paddingHorizontal: SPACING.lg,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.md,
    },
    copy: {
      flex: 1,
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.offline.text,
    },
    actions: {
      flexDirection: 'row',
      gap: SPACING.xs,
    },
    button: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: RADII.sm,
      backgroundColor: colors.surface.base,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    buttonLabel: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
    },
  }), [colors]);

  const { currentStatus, heartbeatState, touch, setStatus } = useStatus();
  const [locallyDismissed, setLocallyDismissed] = useState(false);
  const visible = heartbeatState === 'fading' && !locallyDismissed && currentStatus !== null;
  const heightAnim = useRef(new Animated.Value(0)).current;

  // Animate height on visible changes (D-26, OfflineBanner pattern)
  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: visible ? BANNER_HEIGHT : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [visible, heightAnim]);

  // 8s auto-dismiss (HEART-05). No status change — dismissal is local only.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setLocallyDismissed(true), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  // Reset dismissal when heartbeat flips back to fading on a new foreground
  useEffect(() => {
    if (heartbeatState !== 'fading') setLocallyDismissed(false);
  }, [heartbeatState]);

  async function handleKeepIt() {
    await touch();
    setLocallyDismissed(true);
  }

  async function handleHeadsDown() {
    const { error } = await setStatus('busy', null, '3h');
    if (error) {
      Alert.alert('Error', "Couldn't update status. Try again.");
      return;
    }
    setLocallyDismissed(true);
  }

  function handleUpdate() {
    setLocallyDismissed(true);
    onUpdatePressed();
  }

  if (!currentStatus) {
    return <Animated.View style={[styles.banner, { height: heightAnim }]} />;
  }

  const moodLabel = MOOD_LABEL[currentStatus.status];
  const windowLabel = formatWindowLabel(currentStatus.status_expires_at);
  const copy = `Still ${moodLabel}? · active ${windowLabel}`;

  return (
    <Animated.View style={[styles.banner, { height: heightAnim }]}>
      <View style={styles.content}>
        <Text style={styles.copy} numberOfLines={1}>
          {copy}
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={handleKeepIt}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Keep current status"
          >
            <Text style={styles.buttonLabel}>Keep it</Text>
          </Pressable>
          <Pressable
            onPress={handleUpdate}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Update status"
          >
            <Text style={styles.buttonLabel}>Update</Text>
          </Pressable>
          <Pressable
            onPress={handleHeadsDown}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Switch to heads down, busy for 3 hours"
          >
            <Text style={styles.buttonLabel}>Heads down</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}
