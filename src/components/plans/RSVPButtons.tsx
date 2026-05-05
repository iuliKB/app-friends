import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, ANIMATION } from '@/theme';

type RsvpValue = 'going' | 'maybe' | 'out';

interface RSVPButtonsProps {
  currentRsvp: 'invited' | 'going' | 'maybe' | 'out' | null;
  onRsvp: (rsvp: RsvpValue) => Promise<void>;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function RSVPButtons({ currentRsvp, onRsvp, disabled = false }: RSVPButtonsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    button: {
      flex: 1,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 44,
      borderRadius: RADII.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonInactive: {
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.display.semibold,
    },
    labelActive: {
      color: colors.surface.base,
    },
    labelInactive: {
      color: colors.text.secondary,
    },
  }), [colors]);

  const RSVP_OPTIONS: { value: RsvpValue; label: string; activeColor: string }[] = useMemo(() => [
    { value: 'going', label: 'Going', activeColor: colors.status.free },
    { value: 'maybe', label: 'Maybe', activeColor: colors.status.maybe },
    { value: 'out', label: 'Out', activeColor: colors.status.busy },
  ], [colors]);

  const [savingRsvp, setSavingRsvp] = useState<RsvpValue | null>(null);

  const scaleAnims = useRef({
    going: new Animated.Value(1),
    maybe: new Animated.Value(1),
    out: new Animated.Value(1),
  }).current;

  function triggerBounce(value: RsvpValue) {
    if (savingRsvp !== null || disabled) return;
    const anim = scaleAnims[value];
    void Haptics.selectionAsync().catch(() => {});
    Animated.sequence([
      Animated.spring(anim, { toValue: 0.92, ...ANIMATION.easing.spring, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1.05, ...ANIMATION.easing.spring, useNativeDriver: true }),
      Animated.spring(anim, { toValue: 1.0, ...ANIMATION.easing.spring, useNativeDriver: true }),
    ]).start();
  }

  async function handlePress(value: RsvpValue) {
    if (savingRsvp !== null || disabled) return;
    setSavingRsvp(value);
    await onRsvp(value);
    setSavingRsvp(null);
  }

  return (
    <View style={styles.container}>
      {RSVP_OPTIONS.map(({ value, label, activeColor }) => {
        const isActive = currentRsvp === value;
        const isSaving = savingRsvp === value;

        return (
          <AnimatedTouchable
            key={value}
            style={[
              styles.button,
              isActive ? { backgroundColor: activeColor } : styles.buttonInactive,
              { transform: [{ scale: scaleAnims[value] }] },
            ]}
            onPress={() => {
              triggerBounce(value);
              void handlePress(value);
            }}
            disabled={disabled || savingRsvp !== null}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={isActive ? colors.surface.base : colors.text.secondary}
              />
            ) : (
              <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
                {label}
              </Text>
            )}
          </AnimatedTouchable>
        );
      })}
    </View>
  );
}
