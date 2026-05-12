import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Dimensions,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, SPACING, RADII, ANIMATION } from '@/theme';
import { MoodPicker } from './MoodPicker';

interface StatusPickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const ANIM_DURATION = ANIMATION.duration.fast; // unified open + dismiss
const DISMISS_DY = 80;
const DISMISS_VY = 0.5;
const HANDLE_TOUCH_HEIGHT = 44; // a11y minimum touch target

export function StatusPickerSheet({ visible, onClose }: StatusPickerSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheetHeight, setSheetHeight] = useState<number>(SCREEN_HEIGHT);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current; // shifts sheet up when keyboard opens
  const handleScale = useRef(new Animated.Value(1)).current; // C3
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) reduceMotionRef.current = enabled;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotionRef.current = enabled;
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      Haptics.selectionAsync().catch(() => {});
      translateY.setValue(sheetHeight);
      if (reduceMotionRef.current) {
        translateY.setValue(0);
      } else {
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }).start();
      }
    } else {
      translateY.setValue(sheetHeight);
    }
  }, [visible, sheetHeight, translateY]);

  const dismiss = useCallback(() => {
    if (reduceMotionRef.current) {
      translateY.setValue(sheetHeight);
      onClose();
      return;
    }
    Animated.timing(translateY, {
      toValue: sheetHeight,
      duration: ANIM_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [sheetHeight, translateY, onClose]);

  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => handler.remove();
  }, [visible, dismiss]);

  // Keyboard shift — moves the sheet up by the keyboard height so the focused
  // input stays visible. Composed with translateY so dismiss + slide stay smooth.
  useEffect(() => {
    if (!visible) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const dur = Platform.OS === 'ios' ? 250 : 150;
    const showSub = Keyboard.addListener(showEvt, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: -(e.endCoordinates?.height ?? 0),
        duration: dur,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: dur,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, keyboardOffset]);

  const composedTranslateY = useMemo(
    () => Animated.add(translateY, keyboardOffset),
    [translateY, keyboardOffset]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
        onPanResponderGrant: () => {
          // C3: tactile drag-handle scale on grab
          Animated.spring(handleScale, {
            toValue: 1.4,
            damping: ANIMATION.easing.spring.damping,
            stiffness: 220,
            mass: 0.6,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderMove: (_, gs) => {
          if (gs.dy > 0) translateY.setValue(gs.dy);
        },
        onPanResponderRelease: (_, gs) => {
          Animated.spring(handleScale, {
            toValue: 1,
            damping: ANIMATION.easing.spring.damping,
            stiffness: 220,
            mass: 0.6,
            useNativeDriver: true,
          }).start();
          if (gs.dy > DISMISS_DY || gs.vy > DISMISS_VY) {
            dismiss();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              damping: ANIMATION.easing.spring.damping,
              stiffness: ANIMATION.easing.spring.stiffness,
              mass: 1,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(handleScale, {
            toValue: 1,
            damping: ANIMATION.easing.spring.damping,
            stiffness: 220,
            mass: 0.6,
            useNativeDriver: true,
          }).start();
        },
      }),
    [translateY, dismiss, handleScale]
  );

  const backdropOpacity = useMemo(
    () =>
      translateY.interpolate({
        inputRange: [0, Math.max(sheetHeight, 1)],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
    [translateY, sheetHeight]
  );

  const onSheetLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && Math.abs(h - sheetHeight) > 1) {
        setSheetHeight(h);
      }
    },
    [sheetHeight]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: { backgroundColor: colors.overlay },
        sheet: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: MAX_SHEET_HEIGHT,
          backgroundColor: colors.surface.card,
          borderTopLeftRadius: RADII.xl,
          borderTopRightRadius: RADII.xl,
          paddingTop: SPACING.sm,
          paddingBottom: Math.max(insets.bottom, SPACING.md) + SPACING.sm,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 16,
        },
        dragHandleArea: {
          height: HANDLE_TOUCH_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        },
        dragHandle: {
          width: 40,
          height: 4,
          borderRadius: RADII.xs,
          backgroundColor: colors.border,
        },
      }),
    [colors, insets.bottom]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <TouchableWithoutFeedback onPress={dismiss}>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity: backdropOpacity }]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        onLayout={onSheetLayout}
        style={[styles.sheet, { transform: [{ translateY: composedTranslateY }] }]}
        accessibilityViewIsModal
        accessibilityLabel="Set your status"
        onAccessibilityEscape={dismiss}
      >
        <View
          {...panResponder.panHandlers}
          style={styles.dragHandleArea}
          accessible
          accessibilityLabel="Drag handle"
          accessibilityHint="Swipe down to close the status picker"
        >
          <Animated.View
            style={[styles.dragHandle, { transform: [{ scaleX: handleScale }, { scaleY: handleScale }] }]}
          />
        </View>

        <MoodPicker onCommit={dismiss} onClose={dismiss} visible={visible} />
      </Animated.View>
    </Modal>
  );
}
