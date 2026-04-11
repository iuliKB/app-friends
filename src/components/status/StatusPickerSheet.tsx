import React, { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Modal,
  PanResponder,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS, SPACING, RADII } from '@/theme';
import { useStatusStore } from '@/stores/useStatusStore';
import { MoodPicker } from './MoodPicker';

interface StatusPickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function StatusPickerSheet({ visible, onClose }: StatusPickerSheetProps) {
  const translateY = useRef(new Animated.Value(600)).current;

  // Slide animation — replicates FriendActionSheet motion model exactly.
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

  // Android back button dismiss.
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => handler.remove();
  }, [visible, onClose]);

  // Auto-dismiss when a status is committed via MoodPicker (belt-and-braces for Zustand tick).
  const currentStatus = useStatusStore((s) => s.currentStatus);
  const prevStatusRef = useRef(currentStatus);

  // Reset ref when sheet opens so we only react to changes made while visible.
  useEffect(() => {
    if (visible) {
      prevStatusRef.current = currentStatus;
    }
  }, [visible, currentStatus]);

  useEffect(() => {
    if (!visible) return;
    if (prevStatusRef.current !== currentStatus && currentStatus !== null) {
      onClose();
    }
    prevStatusRef.current = currentStatus;
  }, [visible, currentStatus, onClose]);

  // PanResponder — swipe-down gesture dismiss.
  // Attached to the drag handle only so the MoodPicker's ScrollView keeps its own scroll.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: 600,
            duration: 200,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Drag handle — panResponder attached here only */}
        <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
          <View style={styles.dragHandle} />
        </View>
        <MoodPicker onCommit={onClose} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface.card,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  dragHandleArea: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
  },
});
