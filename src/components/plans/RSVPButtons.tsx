import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/colors';

type RsvpValue = 'going' | 'maybe' | 'out';

interface RSVPButtonsProps {
  currentRsvp: 'invited' | 'going' | 'maybe' | 'out';
  onRsvp: (rsvp: RsvpValue) => Promise<void>;
  disabled?: boolean;
}

const RSVP_OPTIONS: { value: RsvpValue; label: string; activeColor: string }[] = [
  { value: 'going', label: 'Going', activeColor: COLORS.status.free },
  { value: 'maybe', label: 'Maybe', activeColor: COLORS.status.maybe },
  { value: 'out', label: 'Out', activeColor: COLORS.status.busy },
];

export function RSVPButtons({ currentRsvp, onRsvp, disabled = false }: RSVPButtonsProps) {
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
                color={isActive ? COLORS.dominant : COLORS.textSecondary}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInactive: {
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: COLORS.dominant,
  },
  labelInactive: {
    color: COLORS.textSecondary,
  },
});
