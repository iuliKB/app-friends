import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';

interface SquadTabSwitcherProps {
  activeTab: 'friends' | 'goals';
  onTabChange: (tab: 'friends' | 'goals') => void;
}

const TABS: { label: string; value: 'friends' | 'goals' }[] = [
  { label: 'Friends', value: 'friends' },
  { label: 'Goals', value: 'goals' },
];

export function SquadTabSwitcher({ activeTab, onTabChange }: SquadTabSwitcherProps) {
  async function handlePress(tab: 'friends' | 'goals') {
    if (activeTab === tab) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tab);
  }

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <TouchableOpacity
            key={tab.value}
            style={styles.tab}
            onPress={() => handlePress(tab.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>
            {activeTab === tab.value && <View style={styles.underline} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  label: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  activeLabel: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.interactive.accent,
    borderRadius: RADII.xs,
  },
});
