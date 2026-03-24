import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';

export interface ErrorDisplayProps {
  message: string;
  technicalDetails?: string;
  mode?: 'inline' | 'screen';
  onRetry?: () => void;
}

export function ErrorDisplay({
  message,
  technicalDetails,
  mode = 'inline',
  onRetry,
}: ErrorDisplayProps) {
  useEffect(() => {
    if (technicalDetails) {
      console.error('[ErrorDisplay]', technicalDetails);
    }
  }, [technicalDetails]);

  if (mode === 'screen') {
    return (
      <View style={styles.screenContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.interactive.destructive} />
        <Text style={styles.screenMessage}>{message}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return <Text style={styles.inlineMessage}>{message}</Text>;
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  screenMessage: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  retryButton: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: COLORS.interactive.accent,
  },
  retryText: {
    color: COLORS.surface.base,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },
  inlineMessage: {
    color: COLORS.interactive.destructive,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
  },
});
