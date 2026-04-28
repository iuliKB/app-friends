import React from 'react';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface LoadingIndicatorProps {
  color?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export function LoadingIndicator({
  color,
  size = 'large',
  style,
}: LoadingIndicatorProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.text.secondary;

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator color={resolvedColor} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
