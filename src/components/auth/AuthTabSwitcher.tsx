import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/colors';

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
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.border,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
