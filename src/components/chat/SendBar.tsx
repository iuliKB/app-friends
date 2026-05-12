import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';

export type AttachmentAction = 'poll' | 'split' | 'todo';

export interface ReplyContext {
  messageId: string;
  senderName: string;
  previewText: string;
}

interface SendBarProps {
  onSend: (body: string) => void;
  onAttachmentAction?: (action: AttachmentAction) => void;
  replyContext?: ReplyContext | null;
  onClearReply?: () => void;
  onPhotoPress?: () => void;
}

type ActionIconName = React.ComponentProps<typeof Ionicons>['name'];

const ACTIONS: { id: AttachmentAction; icon: ActionIconName; label: string; sub: string }[] = [
  { id: 'poll', icon: 'bar-chart-outline', label: 'Poll', sub: 'Ask the group a question' },
  { id: 'split', icon: 'cash-outline', label: 'Split Expenses', sub: 'Track who owes what' },
  { id: 'todo', icon: 'checkbox-outline', label: 'To-Do List', sub: 'Assign tasks to the group' },
];

// Height of the circles and the pill's minimum height
const BAR_ELEMENT_SIZE = 52;

export function SendBar({ onSend, onAttachmentAction, replyContext, onClearReply, onPhotoPress }: SendBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => StyleSheet.create({
    // ── Main bar — floats on top of message surface, no border ────────────────
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.sm + insets.bottom,
      backgroundColor: colors.surface.base,
      gap: SPACING.sm,
    },

    // ── + button — large dark circle ──────────────────────────────────────────
    addBtn: {
      width: BAR_ELEMENT_SIZE,
      height: BAR_ELEMENT_SIZE,
      borderRadius: RADII.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.card,
    },

    // ── Input pill — photo icon lives inside on the right ─────────────────────
    inputPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.card,
      borderRadius: RADII.full,
      borderWidth: StyleSheet.hairlineWidth,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderColor: 'rgba(255,255,255,0.10)',
      paddingLeft: SPACING.lg,
      paddingRight: SPACING.xs,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: BAR_ELEMENT_SIZE,
    },
    input: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
      backgroundColor: 'transparent',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      maxHeight: 120,
      paddingTop: 0,
      paddingBottom: 0,
      paddingHorizontal: 0,
    },
    photoBtn: {
      width: 40,
      height: 40,
      borderRadius: RADII.full,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Send button — large filled accent circle ───────────────────────────────
    sendBtn: {
      width: BAR_ELEMENT_SIZE,
      height: BAR_ELEMENT_SIZE,
      borderRadius: RADII.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.interactive.accent,
    },
    sendBtnInactive: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      opacity: 0.35,
    },

    // ── Reply bar ─────────────────────────────────────────────────────────────
    replyBar: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      backgroundColor: colors.surface.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
    },
    replyAccentBar: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: RADII.full,
      backgroundColor: colors.interactive.accent,
    },
    replyBarContent: {
      flex: 1,
    },
    replyBarLabel: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.interactive.accent,
    },
    replyBarPreview: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    replyBarDismiss: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minWidth: 44,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },

    // ── Attachment bottom sheet ───────────────────────────────────────────────
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface.card,
      borderTopLeftRadius: RADII.lg,
      borderTopRightRadius: RADII.lg,
      paddingBottom: SPACING.xxl + insets.bottom,
    },
    dragHandle: {
      width: 40,
      height: 4,
      borderRadius: RADII.xs,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: SPACING.sm,
      marginBottom: SPACING.md,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      gap: SPACING.md,
    },
    actionRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    actionIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: RADII.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.overlay,
    },
    actionText: {
      flex: 1,
    },
    actionLabel: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
    },
    actionSub: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      marginTop: 2,
    },
  }), [colors, insets.bottom]);

  const [text, setText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const translateY = useRef(new Animated.Value(300)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 60 || gs.vy > 0.5) {
          onClearReply?.();
        }
      },
    })
  ).current;

  const canSend = text.trim().length > 0;

  function handleSend() {
    if (!canSend) return;
    const body = text.trim();
    setText('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(body);
    onClearReply?.();
  }

  function openMenu() {
    setMenuVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }

  function closeMenu(onClosed?: () => void) {
    Animated.timing(translateY, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
      onClosed?.();
    });
  }

  function handleAction(action: AttachmentAction) {
    closeMenu(() => onAttachmentAction?.(action));
  }

  return (
    <>
      {replyContext && (
        <View {...panResponder.panHandlers} style={styles.replyBar}>
          <View style={styles.replyAccentBar} />
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarLabel} numberOfLines={1}>
              {`Replying to ${replyContext.senderName}`}
            </Text>
            <Text style={styles.replyBarPreview} numberOfLines={1}>
              {replyContext.previewText}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClearReply}
            style={styles.replyBarDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Cancel reply"
          >
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        {/* Large + circle */}
        <TouchableOpacity
          onPress={openMenu}
          activeOpacity={0.7}
          accessibilityLabel="Attachment options"
          style={styles.addBtn}
        >
          <Ionicons name="add" size={26} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Input pill with photo icon inside */}
        <View style={styles.inputPill}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type here..."
            placeholderTextColor={colors.text.secondary}
            multiline
          />
          <TouchableOpacity
            onPress={onPhotoPress}
            activeOpacity={0.7}
            accessibilityLabel="Attach photo"
            style={styles.photoBtn}
          >
            <Ionicons name="image-outline" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Large filled send circle */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
          accessibilityLabel="Send message"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <View style={[styles.sendBtn, !canSend && styles.sendBtnInactive]}>
            <Ionicons name="send" size={20} color={colors.surface.base} />
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.dragHandle} />
          {ACTIONS.map((action, i) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionRow, i > 0 && styles.actionRowBorder]}
              onPress={() => handleAction(action.id)}
              activeOpacity={0.7}
              accessibilityLabel={action.label}
            >
              <View style={styles.actionIconWrapper}>
                <Ionicons name={action.icon} size={22} color={colors.text.primary} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Modal>
    </>
  );
}
