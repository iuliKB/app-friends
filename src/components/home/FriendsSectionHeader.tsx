import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';
import { RadarSegmentedPill } from '@/components/home/RadarSegmentedPill';
import type { ViewPreference } from '@/hooks/useViewPreference';

interface FriendsSectionHeaderProps {
  freeCount: number;
  maybeCount: number;
  totalActiveCount: number;
  view: ViewPreference;
  onViewChange: (v: ViewPreference) => void;
  showToggle?: boolean;
}

export function FriendsSectionHeader({
  freeCount,
  maybeCount,
  totalActiveCount,
  view,
  onViewChange,
  showToggle = true,
}: FriendsSectionHeaderProps) {
  const { colors } = useTheme();

  const showMoodRow = freeCount > 0 || maybeCount > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.xxl,
          paddingBottom: SPACING.lg,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        left: {
          flexShrink: 1,
        },
        title: {
          fontSize: FONT_SIZE.xl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        moodRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          marginTop: SPACING.xs,
        },
        moodItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
        },

        dot: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        moodText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        moodCount: {
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.title} numberOfLines={1}>
            Who&rsquo;s around?
          </Text>

          {showMoodRow && (
            <View
              style={styles.moodRow}
              accessibilityLabel={`${freeCount} free, ${maybeCount} maybe`}
            >
              {freeCount > 0 && (
                <View style={styles.moodItem}>
                  <View style={[styles.dot, { backgroundColor: colors.status.free }]} />
                  <Text style={styles.moodText}>
                    <Text style={styles.moodCount}>{freeCount}</Text> free
                  </Text>
                </View>
              )}
              {maybeCount > 0 && (
                <View style={styles.moodItem}>
                  <View style={[styles.dot, { backgroundColor: colors.status.maybe }]} />
                  <Text style={styles.moodText}>
                    <Text style={styles.moodCount}>{maybeCount}</Text> maybe
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        {showToggle && <RadarSegmentedPill value={view} onValueChange={onViewChange} />}
      </View>
    </View>
  );
}
