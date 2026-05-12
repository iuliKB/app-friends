import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';

export type ChatTab = 'all' | 'unread' | 'groups';

interface ChatTabBarProps {
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
}

const TABS: { key: ChatTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'groups', label: 'Groups' },
];

export function ChatTabBar({ activeTab, onTabChange }: ChatTabBarProps) {
  const { colors } = useTheme();

  const [tabLayouts, setTabLayouts] = useState<Array<{ x: number; width: number } | null>>(
    TABS.map(() => null),
  );
  const indicatorLeft = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const index = TABS.findIndex((t) => t.key === activeTab);
    const layout = tabLayouts[index];
    if (!layout) return;
    Animated.parallel([
      Animated.spring(indicatorLeft, {
        toValue: layout.x,
        damping: 20,
        stiffness: 220,
        useNativeDriver: false,
      }),
      Animated.spring(indicatorWidth, {
        toValue: layout.width,
        damping: 20,
        stiffness: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeTab, tabLayouts, indicatorLeft, indicatorWidth]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: SPACING.md,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      marginBottom: -1,
    },
    label: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    labelActive: {
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.primary,
    },
    indicator: {
      position: 'absolute',
      bottom: 0,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 2,
      backgroundColor: colors.interactive.accent,
      borderRadius: 1,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabChange(tab.key)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setTabLayouts((prev) => {
                const next = [...prev];
                next[index] = { x, width };
                return next;
              });
            }}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <Animated.View
        style={[styles.indicator, { left: indicatorLeft, width: indicatorWidth }]}
      />
    </View>
  );
}
