import React, { useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme, SPACING, RADII, FONT_FAMILY, FONT_SIZE } from '@/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';

interface OnboardingHintSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export function OnboardingHintSheet({ visible, onDismiss }: OnboardingHintSheetProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(600); // instant reset on close
    }
  }, [visible, translateY]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.overlay,
        },
        sheet: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface.card,
          borderTopLeftRadius: RADII.xl,
          borderTopRightRadius: RADII.xl,
        },
        handleArea: {
          paddingVertical: SPACING.sm,
          alignItems: 'center',
        },
        handle: {
          width: 40,
          height: 4,
          borderRadius: RADII.xs,
          backgroundColor: colors.border,
        },
        body: {
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.xxl,
          alignItems: 'center',
        },
        emoji: {
          fontSize: 32,
          textAlign: 'center',
          marginBottom: SPACING.sm,
        },
        heading: {
          fontSize: FONT_SIZE.xxl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          textAlign: 'center',
          marginBottom: SPACING.lg,
        },
        guidanceLine: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
          marginBottom: SPACING.sm,
        },
        ctaContainer: {
          marginTop: SPACING.xl,
          width: '100%',
        },
      }),
    [colors],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      {/* Semi-transparent backdrop — NOT tappable (D-11: no tap-to-dismiss) */}
      <View style={styles.backdrop} />

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle — visual only, no gesture */}
        <View style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <View style={styles.body}>
          <Text style={styles.emoji}>🔥</Text>
          <Text style={styles.heading}>Welcome to Campfire!</Text>
          <Text style={styles.guidanceLine}>
            Tap your status above to let friends know if you're free.
          </Text>
          <Text style={styles.guidanceLine}>Head to Squad to add friends.</Text>
          <View style={styles.ctaContainer}>
            <PrimaryButton title="Get Started" onPress={onDismiss} />
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
