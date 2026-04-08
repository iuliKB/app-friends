import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { useStatus } from '@/hooks/useStatus';
import { MOOD_PRESETS } from '@/components/status/moodPresets';
import { getWindowOptions } from '@/lib/windows';
import type { StatusValue, WindowId } from '@/types/app';

// Enable LayoutAnimation on Android (iOS has it on by default).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MOOD_ROWS: { value: StatusValue; label: string; color: string }[] = [
  { value: 'free', label: 'Free', color: COLORS.status.free },
  { value: 'maybe', label: 'Maybe', color: COLORS.status.maybe },
  { value: 'busy', label: 'Busy', color: COLORS.status.busy },
];

export function MoodPicker() {
  const { currentStatus, saving, setStatus } = useStatus();
  const [expandedMood, setExpandedMood] = useState<StatusValue | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // When currentStatus changes externally (e.g., committed from the other screen
  // via Zustand sync), collapse the picker. D-25 + OVR-02.
  useEffect(() => {
    setExpandedMood(null);
    setSelectedTag(null);
  }, [currentStatus?.status, currentStatus?.status_expires_at]);

  async function handleMoodPress(mood: StatusValue) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedMood === mood) {
      // D-24: tapping the currently-expanded row collapses without committing
      setExpandedMood(null);
      setSelectedTag(null);
      return;
    }
    // D-23 step 4: switching mood resets preset + window selection
    setExpandedMood(mood);
    setSelectedTag(null);
  }

  function handlePresetPress(presetId: string) {
    setSelectedTag((prev) => (prev === presetId ? null : presetId));
  }

  async function handleWindowPress(mood: StatusValue, windowId: WindowId) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await setStatus(mood, selectedTag, windowId);
    if (error) {
      Alert.alert('Error', "Couldn't update status. Try again.");
      return;
    }
    // Commit successful — Zustand sync will collapse the picker via the effect above
  }

  const windowOptions = expandedMood ? getWindowOptions(new Date()) : [];
  const presets = expandedMood ? MOOD_PRESETS[expandedMood] : [];

  return (
    <View style={styles.container}>
      {MOOD_ROWS.map((row) => {
        const isActive = currentStatus?.status === row.value;
        const isExpanded = expandedMood === row.value;
        return (
          <View key={row.value}>
            <Pressable
              onPress={() => handleMoodPress(row.value)}
              disabled={saving}
              style={({ pressed }) => [
                styles.moodRow,
                isActive && { backgroundColor: row.color },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive, expanded: isExpanded }}
              accessibilityLabel={`${row.label} status`}
            >
              {saving && isExpanded ? (
                <ActivityIndicator color={COLORS.surface.base} />
              ) : (
                <Text style={[styles.moodLabel, isActive && styles.moodLabelActive]}>
                  {row.label}
                </Text>
              )}
            </Pressable>

            {isExpanded && (
              <View style={styles.expandedPanel}>
                {/* Preset chips — optional (D-04) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {presets.map((preset) => {
                    const isSelected = selectedTag === preset.id;
                    return (
                      <Pressable
                        key={preset.id}
                        onPress={() => handlePresetPress(preset.id)}
                        disabled={saving}
                        style={[
                          styles.presetChip,
                          isSelected && { borderColor: row.color, backgroundColor: row.color },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text
                          style={[
                            styles.presetChipLabel,
                            isSelected && styles.presetChipLabelActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Window chips — commit-on-tap (D-23) */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {windowOptions.map((opt) => (
                    <Pressable
                      key={opt.id}
                      onPress={() => handleWindowPress(row.value, opt.id)}
                      disabled={saving}
                      style={[styles.windowChip, { borderColor: row.color }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Commit ${row.label} ${opt.label}`}
                    >
                      <Text style={styles.windowChipLabel}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  moodRow: {
    minHeight: 56,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  moodLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  moodLabelActive: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
  },
  expandedPanel: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  chipsRow: {
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  presetChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface.card,
  },
  presetChipLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  presetChipLabelActive: {
    color: COLORS.surface.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  windowChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 1,
    backgroundColor: COLORS.surface.card,
  },
  windowChipLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
});
