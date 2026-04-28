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
  replyContext?: ReplyContext | null;   // Phase 14: reply bar (D-13, D-15)
  onClearReply?: () => void;           // Phase 14: × button + swipe dismiss (D-14)
  onPhotoPress?: () => void;
}

type ActionIconName = React.ComponentProps<typeof Ionicons>['name'];

const ACTIONS: { id: AttachmentAction; icon: ActionIconName; label: string; sub: string }[] = [
  { id: 'poll', icon: 'bar-chart-outline', label: 'Poll', sub: 'Ask the group a question' },
  { id: 'split', icon: 'cash-outline', label: 'Split Expenses', sub: 'Track who owes what' },
  { id: 'todo', icon: 'checkbox-outline', label: 'To-Do List', sub: 'Assign tasks to the group' },
];

export function SendBar({ onSend, onAttachmentAction, replyContext, onClearReply, onPhotoPress }: SendBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: {
      height: 58,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface.card,
    },
    attachBtn: {
      paddingHorizontal: SPACING.xs,
    },
    input: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
      paddingHorizontal: SPACING.sm,
      backgroundColor: 'transparent',
    },
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
      paddingBottom: SPACING.xxl,
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
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionIconWrapper: {
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
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
      marginTop: 2,
    },
    replyBar: {
      flexDirection: 'row',
      alignItems: 'center',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 48,
      backgroundColor: colors.surface.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: SPACING.lg,
    },
    replyBarContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    replyBarText: {
      flex: 1,
    },
    replyBarLabel: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.primary,
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
  }), [colors]);

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
    onSend(body);
    onClearReply?.();   // Phase 14: clear reply bar after send
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
        <View
          {...panResponder.panHandlers}
          style={styles.replyBar}
        >
          <View style={styles.replyBarContent}>
            <Ionicons name="return-up-back" size={16} color={colors.text.secondary} />
            <View style={styles.replyBarText}>
              <Text style={styles.replyBarLabel} numberOfLines={1}>
                {`Replying to ${replyContext.senderName}`}
              </Text>
              <Text style={styles.replyBarPreview} numberOfLines={1}>
                {replyContext.previewText}
              </Text>
            </View>
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
        <TouchableOpacity
          onPress={openMenu}
          activeOpacity={0.7}
          accessibilityLabel="Attachment options"
          style={styles.attachBtn}
        >
          <Ionicons name="add-circle" size={28} color={colors.interactive.accent} />
        </TouchableOpacity>

        {/* Photo icon — D-01: inline between + and TextInput; always visible */}
        <TouchableOpacity
          onPress={onPhotoPress}
          activeOpacity={0.7}
          accessibilityLabel="Attach photo"
          style={styles.attachBtn}
        >
          <Ionicons name="image-outline" size={28} color={colors.text.secondary} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.text.secondary}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          multiline={false}
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
          accessibilityLabel="Send message"
        >
          <Ionicons
            name="send"
            size={24}
            color={canSend ? colors.interactive.accent : colors.text.secondary}
          />
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
                <Ionicons name={action.icon} size={24} color={colors.text.primary} />
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
