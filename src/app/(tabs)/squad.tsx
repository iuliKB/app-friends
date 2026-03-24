import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';

export default function SquadScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed-outline" size={48} color={COLORS.text.secondary} />
      <Text style={styles.heading}>Squad Goals</Text>
      <Text style={styles.body}>Group challenges and streaks — coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
  },
  body: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.xxl,
  },
});
