import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';

type RsvpValue = 'going' | 'maybe' | 'out';

interface RSVPButtonsProps {
  currentRsvp: 'invited' | 'going' | 'maybe' | 'out';
  onRsvp: (rsvp: RsvpValue) => Promise<void>;
  disabled?: boolean;
}

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
          <TouchableOpacity
            key={value}
            style={[
              styles.button,
              isActive ? { backgroundColor: activeColor } : styles.buttonInactive,
            ]}
            onPress={() => handlePress(value)}
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
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
