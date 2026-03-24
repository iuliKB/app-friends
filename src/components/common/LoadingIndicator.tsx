import React from 'react';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS } from '@/theme';

interface LoadingIndicatorProps {
  color?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export function LoadingIndicator({
  color = COLORS.text.secondary,
  size = 'large',
  style,
}: LoadingIndicatorProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator color={color} size={size} />
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
