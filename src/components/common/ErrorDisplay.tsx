import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';

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
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    screenContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.xxl,
    },
    screenMessage: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: SPACING.lg,
    },
    retryButton: {
      marginTop: SPACING.xl,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADII.md,
      backgroundColor: colors.interactive.accent,
    },
    retryText: {
      color: colors.surface.base,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
    },
    inlineMessage: {
      color: colors.interactive.destructive,
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
    },
  }), [colors]);

  useEffect(() => {
    if (technicalDetails) {
      console.error('[ErrorDisplay]', technicalDetails);
    }
  }, [technicalDetails]);

  if (mode === 'screen') {
    return (
      <View style={styles.screenContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.interactive.destructive} />
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
