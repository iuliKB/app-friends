import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';

interface PollCreationSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSend: (question: string, options: string[]) => void;
}

export function PollCreationSheet({ visible, onDismiss, onSend }: PollCreationSheetProps) {
  const [question, setQuestion] = useState('');
  // Each option carries a stable id so React can key removable rows without index drift
  const [options, setOptions] = useState([
    { id: 1, text: '' },
    { id: 2, text: '' },
  ]);
  const nextId = useRef(3);
  const translateY = useRef(new Animated.Value(300)).current;

  const canSendPoll = question.trim().length > 0 && options.every((o) => o.text.trim().length > 0);

  function open() {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }

  function close() {
    Animated.timing(translateY, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
      setQuestion('');
      setOptions([
        { id: 1, text: '' },
        { id: 2, text: '' },
      ]);
      nextId.current = 3;
    });
  }

  useEffect(() => {
    if (visible) {
      open();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleSend() {
    if (!canSendPoll) return;
    onSend(
      question.trim(),
      options.map((o) => o.text.trim())
    );
    close();
  }

  function addOption() {
    const id = nextId.current++;
    setOptions((prev) => [...prev, { id, text: '' }]);
  }

  function removeOption(id: number) {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <TouchableWithoutFeedback onPress={close}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kavContainer}
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.dragHandle} />
          {/* Header: "New Poll" */}
          <Text style={styles.header}>New Poll</Text>
          {/* Question input */}
          <TextInput
            style={styles.input}
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask the group…"
            placeholderTextColor={COLORS.text.secondary}
            returnKeyType="next"
          />
          {/* Option rows */}
          {options.map((opt, idx) => (
            <View key={opt.id} style={styles.optionRow}>
              <TextInput
                style={[styles.input, styles.optionInput]}
                value={opt.text}
                onChangeText={(text) =>
                  setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, text } : o)))
                }
                placeholder={`Option ${idx + 1}`}
                placeholderTextColor={COLORS.text.secondary}
                returnKeyType="next"
              />
              {idx >= 2 && (
                <TouchableOpacity
                  onPress={() => removeOption(opt.id)}
                  accessibilityLabel={`Remove option ${idx + 1}`}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {/* + Add option — hidden when 4 options */}
          {options.length < 4 && (
            <TouchableOpacity
              onPress={addOption}
              style={styles.addOptionRow}
              accessibilityLabel="Add another option"
            >
              <Ionicons name="add" size={20} color={COLORS.interactive.accent} />
              <Text style={styles.addOptionLabel}>+ Add option</Text>
            </TouchableOpacity>
          )}
          {/* Button row */}
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={close} style={styles.discardButton}>
              <Text style={styles.discardLabel}>Discard Poll</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSendPoll}
              style={[styles.sendButton, !canSendPoll && styles.sendButtonDisabled]}
              accessibilityLabel={
                canSendPoll ? 'Send Poll' : 'Send Poll, disabled — fill in question and all options'
              }
            >
              <Text style={[styles.sendLabel, !canSendPoll && styles.sendLabelDisabled]}>
                Send Poll
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kavContainer: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface.card,
    borderTopLeftRadius: RADII.lg,
    borderTopRightRadius: RADII.lg,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
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
  header: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface.base,
    borderRadius: RADII.md,
    padding: SPACING.sm,
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  optionRow: { flexDirection: 'row', alignItems: 'center' },
  optionInput: { flex: 1, marginRight: SPACING.xs },
  removeButton: {
    minWidth: 44,

    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',

    minHeight: 44,
    marginBottom: SPACING.sm,
  },
  addOptionLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.interactive.accent,
    marginLeft: SPACING.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  discardButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  discardLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
  },
  sendButton: {
    backgroundColor: COLORS.interactive.accent,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.lg,

    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: COLORS.surface.overlay },
  sendLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
  },
  sendLabelDisabled: { color: COLORS.text.secondary },
});
