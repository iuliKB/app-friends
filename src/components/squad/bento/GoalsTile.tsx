import React, { useMemo } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { BentoCard } from './BentoCard';
import { TILE_ACCENTS, ACCENT_FILL } from './tileAccents';

export function GoalsTile() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
        iconBubble: {
          width: 28,
          height: 28,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: TILE_ACCENTS.goals + ACCENT_FILL,
        },
        title: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        headline: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        sub: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        badge: {
          alignSelf: 'flex-start',
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs / 2,
          borderRadius: RADII.full,
          backgroundColor: TILE_ACCENTS.goals + ACCENT_FILL,
        },
        badgeText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.display.semibold,
          color: TILE_ACCENTS.goals,
        },
      }),
    [colors]
  );

  return (
    <BentoCard
      onPress={() =>
        Alert.alert(
          'Squad Challenges',
          "Coming soon — set shared goals like 'Hang out 3x this month' and track them together."
        )
      }
      containerStyle={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel="Squad Challenges. Coming soon."
    >
      <View style={styles.headerRow}>
        <View style={styles.iconBubble}>
          <Ionicons name="trophy-outline" size={16} color={TILE_ACCENTS.goals} />
        </View>
        <Text style={styles.title}>Challenges</Text>
      </View>

      <View>
        <Text style={styles.headline}>Start a goal</Text>
        <Text style={styles.sub}>Hang 3x · Try a new spot · Keep the streak</Text>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>Soon</Text>
      </View>
    </BentoCard>
  );
}
