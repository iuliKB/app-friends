import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';

interface EmptyStateProps {
  icon: string;
  iconType?: 'emoji' | 'ionicons';
  heading: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({
  icon,
  iconType = 'emoji',
  heading,
  body,
  ctaLabel,
  onCta,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {iconType === 'ionicons' ? (
        <Ionicons name={icon as any} size={48} color={COLORS.border} />
      ) : (
        <Text style={styles.emoji}>{icon}</Text>
      )}
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.body}>{body}</Text>
      {ctaLabel && onCta && (
        <View style={styles.ctaWrapper}>
          <PrimaryButton title={ctaLabel} onPress={onCta} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  emoji: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 48, // no exact token — emoji display size
    textAlign: 'center',
  },
  heading: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  body: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  ctaWrapper: {
    marginTop: SPACING.xl,
    width: '100%',
  },
});
