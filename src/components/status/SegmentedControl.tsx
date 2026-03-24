import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import type { StatusValue } from '@/types/app';

interface SegmentProps {
  value: StatusValue | null;
  onValueChange: (v: StatusValue) => void;
  saving: boolean;
}

const SEGMENTS: { label: string; value: StatusValue; color: string }[] = [
  { label: 'Free', value: 'free', color: COLORS.status.free },
  { label: 'Busy', value: 'busy', color: COLORS.status.busy },
  { label: 'Maybe', value: 'maybe', color: COLORS.status.maybe },
];

export function SegmentedControl({ value, onValueChange, saving }: SegmentProps) {
  async function handlePress(segValue: StatusValue) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(segValue);
  }

  return (
    <View style={styles.container}>
      {SEGMENTS.map((seg) => {
        const isActive = value === seg.value;
        return (
          <TouchableOpacity
            key={seg.value}
            style={[styles.segment, isActive && { backgroundColor: seg.color }]}
            onPress={() => handlePress(seg.value)}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving && isActive ? (
              <ActivityIndicator size="small" color={COLORS.surface.base} />
            ) : (
              <Text style={[styles.label, isActive && styles.activeLabel]}>{seg.label}</Text>
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
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.md,
    padding: SPACING.xs,
    height: 44,
    marginHorizontal: SPACING.lg,
  },
  segment: {
    flex: 1,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  activeLabel: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
  },
});
