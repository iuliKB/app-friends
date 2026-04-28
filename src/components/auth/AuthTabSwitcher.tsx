import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';

interface AuthTabSwitcherProps {
  activeTab: 'login' | 'signup';
  onTabChange: (tab: 'login' | 'signup') => void;
}

export function AuthTabSwitcher({ activeTab, onTabChange }: AuthTabSwitcherProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      padding: SPACING.xs,
      marginHorizontal: SPACING.lg,
    },
    tab: {
      flex: 1,
      height: 40, // no exact token — not flagged by rule
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADII.md,
    },
    activeTab: {
      backgroundColor: colors.border,
    },
    tabText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    activeTabText: {
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'login' && styles.activeTab]}
        onPress={() => onTabChange('login')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
        onPress={() => onTabChange('signup')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>
          Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
}
