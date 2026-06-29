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
  ScrollView,
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
  // Mirror of sheetHeight read by the slide-in effect so a keyboard-driven height
  // change doesn't re-trigger (and replay) the open animation.
  const sheetHeightRef = useRef(SCREEN_HEIGHT);
  // Keyboard height (px) — caps the sheet's max height so it fits above the
  // keyboard; 0 when the keyboard is hidden.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const keyboardLift = useRef(new Animated.Value(0)).current; // raises the sheet onto the keyboard top
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
      translateY.setValue(sheetHeightRef.current);
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
      translateY.setValue(sheetHeightRef.current);
    }
  }, [visible, translateY]);

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

  // Keyboard handling. Android (softwareKeyboardLayoutMode="resize", Expo default)
  // already shrinks the modal window so the bottom-anchored sheet sits above the
  // keyboard — manually lifting there would double-count and leave a gap. iOS does
  // not resize, so we lift the sheet by the keyboard height ourselves. Either way
  // we cap the sheet's max height to the space above the keyboard so a tall sheet's
  // header never clips off the top.
  useEffect(() => {
    if (!visible) return;
    const isIOS = Platform.OS === 'ios';
    const showEvt = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';
    const dur = isIOS ? 250 : 150;
    const showSub = Keyboard.addListener(showEvt, (e) => {
      const kbHeight = e.endCoordinates?.height ?? 0;
      setKeyboardHeight(kbHeight);
      if (!isIOS) return; // Android already resized the window for us.
      Animated.timing(keyboardLift, {
        toValue: -kbHeight,
        duration: dur,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
      if (!isIOS) return;
      Animated.timing(keyboardLift, {
        toValue: 0,
        duration: dur,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, keyboardLift]);

  const composedTranslateY = useMemo(
    () => Animated.add(translateY, keyboardLift),
    [translateY, keyboardLift]
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
        sheetHeightRef.current = h;
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
        scroll: {
          // Shrinks within the sheet's maxHeight so the body scrolls instead of
          // clipping the commit button when content is tall (small screens).
          flexShrink: 1,
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
        style={[
          styles.sheet,
          keyboardHeight > 0 && {
            maxHeight: Math.max(
              MAX_SHEET_HEIGHT * 0.5,
              SCREEN_HEIGHT - keyboardHeight - insets.top
            ),
          },
          { transform: [{ translateY: composedTranslateY }] },
        ]}
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
            style={[
              styles.dragHandle,
              { transform: [{ scaleX: handleScale }, { scaleY: handleScale }] },
            ]}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <MoodPicker onCommit={dismiss} onClose={dismiss} visible={visible} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
