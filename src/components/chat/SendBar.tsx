import React, { useRef, useState } from 'react';
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
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';

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
}

const ACTIONS: { id: AttachmentAction; icon: string; label: string; sub: string }[] = [
  { id: 'poll', icon: '📊', label: 'Poll', sub: 'Ask the group a question' },
  { id: 'split', icon: '💸', label: 'Split Expenses', sub: 'Track who owes what' },
  { id: 'todo', icon: '✅', label: 'To-Do List', sub: 'Assign tasks to the group' },
];

export function SendBar({ onSend, onAttachmentAction, replyContext, onClearReply }: SendBarProps) {
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

  function closeMenu() {
    Animated.timing(translateY, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  }

  function handleAction(action: AttachmentAction) {
    closeMenu();
    onAttachmentAction?.(action);
  }

  return (
    <>
      {replyContext && (
        <View
          {...panResponder.panHandlers}
          style={styles.replyBar}
        >
          <View style={styles.replyBarContent}>
            <Ionicons name="return-up-back" size={16} color={COLORS.interactive.accent} />
            <View style={styles.replyBarText}>
              <Text style={styles.replyBarLabel} numberOfLines={1}>
                {`↩ Replying to ${replyContext.senderName}`}
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
            <Ionicons name="close" size={20} color={COLORS.text.secondary} />
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
          <Ionicons name="add-circle" size={28} color={COLORS.interactive.accent} />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={COLORS.text.secondary}
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
            color={canSend ? COLORS.interactive.accent : COLORS.text.secondary}
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
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSub}>{action.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.text.secondary} />
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface.card,
  },
  attachBtn: {
    paddingHorizontal: SPACING.xs,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.primary,
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
    backgroundColor: COLORS.surface.card,
    borderTopLeftRadius: RADII.lg,
    borderTopRightRadius: RADII.lg,
    paddingBottom: SPACING.xxl,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.border,
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
    borderTopColor: COLORS.border,
  },
  actionIcon: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  actionSub: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    // eslint-disable-next-line campfire/no-hardcoded-styles
    height: 48,
    backgroundColor: COLORS.surface.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.interactive.accent,
  },
  replyBarPreview: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  replyBarDismiss: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minWidth: 44,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
