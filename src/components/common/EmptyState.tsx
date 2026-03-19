import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
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
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  ctaWrapper: {
    marginTop: 24,
    width: '100%',
  },
});
