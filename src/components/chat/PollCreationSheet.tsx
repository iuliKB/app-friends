import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';

interface PollCreationSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSend: (question: string, options: string[]) => void;
}

export function PollCreationSheet({ visible, onDismiss, onSend }: PollCreationSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    kavContainer: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface.card,
      borderTopLeftRadius: RADII.lg,
      borderTopRightRadius: RADII.lg,
      paddingBottom: SPACING.xxl,
      paddingHorizontal: SPACING.lg,
    },
    dragHandle: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 40,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 4,
      borderRadius: RADII.xs,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginTop: SPACING.sm,
      marginBottom: SPACING.md,
    },
    header: {
      fontSize: FONT_SIZE.xl,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      marginBottom: SPACING.md,
    },
    input: {
      backgroundColor: colors.surface.base,
      borderRadius: RADII.md,
      padding: SPACING.sm,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
      marginBottom: SPACING.md,
    },
    optionRow: { flexDirection: 'row', alignItems: 'center' },
    optionInput: { flex: 1, marginRight: SPACING.xs },
    removeButton: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minWidth: 44,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 44,
      marginBottom: SPACING.sm,
    },
    addOptionLabel: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.interactive.accent,
      marginLeft: SPACING.xs,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: SPACING.xl,
    },
    discardButton: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 44,
      justifyContent: 'center',
    },
    discardLabel: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
    },
    sendButton: {
      backgroundColor: colors.interactive.accent,
      borderRadius: RADII.md,
      paddingHorizontal: SPACING.lg,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: { backgroundColor: colors.surface.overlay },
    sendLabel: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.surface.base,
    },
    sendLabelDisabled: { color: colors.text.secondary },
  }), [colors]);

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
            placeholderTextColor={colors.text.secondary}
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
                placeholderTextColor={colors.text.secondary}
                returnKeyType="next"
              />
              {idx >= 2 && (
                <TouchableOpacity
                  onPress={() => removeOption(opt.id)}
                  accessibilityLabel={`Remove option ${idx + 1}`}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.text.secondary} />
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
              <Ionicons name="add" size={20} color={colors.interactive.accent} />
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
