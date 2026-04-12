// Phase 8 v1.4 — SplitModeControl (IOU-01, IOU-02).
// Two-segment Even / Custom split mode selector with haptic feedback on change.
// Follows SegmentedControl.tsx pattern from src/components/status/SegmentedControl.tsx.

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';

interface SplitModeControlProps {
  mode: 'even' | 'custom';
  onChange: (mode: 'even' | 'custom') => void;
}

const SEGMENTS: { label: string; value: 'even' | 'custom' }[] = [
  { label: 'Even', value: 'even' },
  { label: 'Custom', value: 'custom' },
];

export function SplitModeControl({ mode, onChange }: SplitModeControlProps) {
  function handlePress(value: 'even' | 'custom') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onChange(value);
  }

  return (
    <View style={styles.container}>
      {SEGMENTS.map((seg) => {
        const isActive = mode === seg.value;
        return (
          <TouchableOpacity
            key={seg.value}
            style={[styles.segment, isActive && styles.activeSegment]}
            onPress={() => handlePress(seg.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${seg.label} split`}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>{seg.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.md,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADII.md,
  },
  activeSegment: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: '#ffffff14',
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
  },
  activeLabel: {
    color: COLORS.text.primary,
  },
});
