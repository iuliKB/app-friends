// Value-led iOS permission pre-prompt (D-02 copy).
// Render conditionally from a parent screen when the user has just completed
// a meaningful action and AsyncStorage 'campfire:push_prompt_eligible' === 'true'.
// "Sounds good" calls onAccept which should invoke registerForPushNotifications
// with skipEligibilityCheck: true. "Not now" must NOT call requestPermissionsAsync (D-03).
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';

interface PrePromptModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function PrePromptModal({ visible, onAccept, onDecline }: PrePromptModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.body}>
            Get a heads up when friends are free — we only push when something matters.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            onPress={onAccept}
            accessibilityRole="button"
          >
            <Text style={styles.primaryLabel}>Sounds good</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            onPress={onDecline}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryLabel}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: 'rgba(0,0,0,0.6)', // no exact token — modal scrim
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.lg,
    padding: SPACING.xl,
    alignItems: 'stretch',
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  body: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  primary: {
    backgroundColor: COLORS.interactive.accent,
    borderRadius: RADII.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  primaryLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
  },
  secondary: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
