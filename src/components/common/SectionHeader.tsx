import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export function SectionHeader({ title, rightAction }: SectionHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: SPACING.xxl,
      paddingBottom: SPACING.lg,
    },
    title: {
      fontSize: FONT_SIZE.xl,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {rightAction}
    </View>
  );
}
