import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';

interface AuthTabSwitcherProps {
  activeTab: 'login' | 'signup';
  onTabChange: (tab: 'login' | 'signup') => void;
}

export function AuthTabSwitcher({ activeTab, onTabChange }: AuthTabSwitcherProps) {
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface.card,
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
    backgroundColor: COLORS.border,
  },
  tabText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  activeTabText: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
});
