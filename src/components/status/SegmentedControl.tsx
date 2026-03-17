import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
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
              <ActivityIndicator size="small" color={COLORS.dominant} />
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
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 4,
    height: 44,
    marginHorizontal: 16,
  },
  segment: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  activeLabel: {
    fontWeight: '600',
    color: COLORS.dominant,
  },
});
