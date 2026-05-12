// Phase 29.1 Plan 07 — ChatTodoPickerSheet (two-step modal).
//
// Replaces the "Coming Soon" alert at ChatRoomScreen.tsx:149 with the D-09
// two-step picker:
//   Step 1: choose "Single item" vs "List of items".
//   Step 2: form for the chosen flavor — title, optional due date (single
//           only), assignee (required), list-item composer (list only).
//
// Pattern: cloned from PollCreationSheet.tsx (Modal + Animated.timing on
// translateY + KeyboardAvoidingView). Internal `step: 1 | 2` state. Step 2
// has a back arrow that returns to step 1 without unmounting the Modal
// (avoids stacked-Modal keyboard breakage per UI-SPEC §Discretionary).
//
// Submit handler calls into `onSend` which the caller wires up to
// `useChatTodos.sendChatTodo` (which RPC-calls create_chat_todo_list).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { ChatScope } from '@/hooks/useChatTodos';

export interface ChatTodoPickerMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface ChatTodoPickerSendArgs {
  scope: ChatScope;
  assigneeId: string;
  title: string;
  isList: boolean;
  items: { title: string; due_date: string | null }[];
}

interface ChatTodoPickerSheetProps {
  visible: boolean;
  onDismiss: () => void;
  scope: ChatScope;
  members: ChatTodoPickerMember[];
  currentUserId: string;
  onSend: (
    args: ChatTodoPickerSendArgs
  ) => Promise<{ listId: string | null; error: string | null }>;
}

type Kind = 'single' | 'list';

function toLocalDateString(date: Date): string {
  // en-CA → YYYY-MM-DD in local tz (Pitfall 5 guard — same as dateLocal.ts).
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function ChatTodoPickerSheet({
  visible,
  onDismiss,
  scope,
  members,
  currentUserId,
  onSend,
}: ChatTodoPickerSheetProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(600)).current;

  // ── State ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<Kind | null>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [itemDraft, setItemDraft] = useState('');
  const [listItems, setListItems] = useState<{ title: string; due_date: string | null }[]>([]);
  const [pending, setPending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  function resetState() {
    setStep(1);
    setKind(null);
    setTitle('');
    setDueDate(null);
    setAssigneeId(null);
    setItemDraft('');
    setListItems([]);
    setPending(false);
    setErrorText(null);
    setAssigneePickerOpen(false);
    setShowDatePicker(false);
  }

  function handleDateChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  }

  function openAnim() {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }

  function closeAnim() {
    Animated.timing(translateY, {
      toValue: 600,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
      resetState();
    });
  }

  useEffect(() => {
    if (visible) {
      openAnim();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Step transitions ───────────────────────────────────────────────
  function chooseKind(k: Kind) {
    Haptics.selectionAsync().catch(() => {});
    setKind(k);
    setStep(2);
  }
  function backToStep1() {
    setStep(1);
    setKind(null);
    setErrorText(null);
  }

  // ── List-item composer ─────────────────────────────────────────────
  function addListItem() {
    const trimmed = itemDraft.trim();
    if (!trimmed) return;
    setListItems((prev) => [...prev, { title: trimmed, due_date: null }]);
    setItemDraft('');
  }
  function removeListItem(index: number) {
    setListItems((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Submit ─────────────────────────────────────────────────────────
  const trimmedTitle = title.trim();
  const canSendSingle = kind === 'single' && trimmedTitle.length > 0 && !!assigneeId;
  const canSendList =
    kind === 'list' && trimmedTitle.length > 0 && listItems.length >= 2 && !!assigneeId;
  const canSend = canSendSingle || canSendList;

  async function onSubmit() {
    if (!canSend || !assigneeId) return;
    setPending(true);
    setErrorText(null);
    const args: ChatTodoPickerSendArgs =
      kind === 'single'
        ? {
            scope,
            assigneeId,
            title: trimmedTitle,
            isList: false,
            items: [
              {
                title: trimmedTitle,
                due_date: dueDate ? toLocalDateString(dueDate) : null,
              },
            ],
          }
        : {
            scope,
            assigneeId,
            title: trimmedTitle,
            isList: true,
            items: listItems,
          };

    const { error } = await onSend(args);
    if (error) {
      setErrorText("Couldn't send. Tap to retry.");
      setPending(false);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    closeAnim();
  }

  // ── Styles ─────────────────────────────────────────────────────────
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          width: 40,
          height: 4,
          borderRadius: RADII.xs,
          backgroundColor: colors.border,
          alignSelf: 'center',
          marginTop: SPACING.sm,
          marginBottom: SPACING.md,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          marginBottom: SPACING.md,
        },
        backButton: {
          minWidth: 44,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: -SPACING.sm, // visually flush with sheet padding
        },
        headerTitle: {
          flex: 1,
          fontSize: FONT_SIZE.xl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        body: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginBottom: SPACING.md,
        },
        option: {
          padding: SPACING.lg,
          borderRadius: RADII.lg,
          backgroundColor: colors.surface.overlay,
          marginBottom: SPACING.md,
          gap: SPACING.xs,
        },
        optionPressed: { opacity: 0.7 },
        optionLabel: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        optionSubtitle: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        fieldLabel: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          marginBottom: SPACING.xs,
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
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          marginBottom: SPACING.md,
        },
        rowButton: {
          flex: 1,
          padding: SPACING.sm,
          borderRadius: RADII.md,
          backgroundColor: colors.surface.base,
          minHeight: 44,
          justifyContent: 'center',
        },
        rowLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        rowLabelMuted: { color: colors.text.secondary },
        addRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          marginBottom: SPACING.sm,
        },
        addRowInput: { flex: 1, marginBottom: 0 },
        addButton: {
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: RADII.full,
          backgroundColor: colors.interactive.accent + '22',
        },
        itemTile: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: SPACING.sm,
          backgroundColor: colors.surface.base,
          borderRadius: RADII.md,
          marginBottom: SPACING.xs,
          gap: SPACING.sm,
        },
        itemTileTitle: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        itemRemoveButton: {
          minWidth: 44,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
        },
        helper: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginBottom: SPACING.md,
        },
        primaryCta: {
          marginTop: SPACING.md,
          minHeight: 52,
          borderRadius: RADII.lg,
          backgroundColor: colors.interactive.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        primaryCtaDisabled: { backgroundColor: colors.surface.overlay },
        primaryCtaLabel: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.surface.base,
        },
        primaryCtaLabelDisabled: { color: colors.text.secondary },
        errorBanner: {
          marginTop: SPACING.sm,
          padding: SPACING.sm,
          borderRadius: RADII.md,
          backgroundColor: colors.interactive.destructive + '22',
          alignItems: 'center',
        },
        errorBannerLabel: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.interactive.destructive,
        },
        // Assignee picker sub-modal styles
        pickerBackdrop: {
          ...StyleSheet.absoluteFillObject,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        },
        pickerSheet: {
          backgroundColor: colors.surface.card,
          borderTopLeftRadius: RADII.lg,
          borderTopRightRadius: RADII.lg,
          paddingBottom: SPACING.xxl,
          paddingHorizontal: SPACING.lg,
        },
        memberRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          paddingVertical: SPACING.sm,
          minHeight: 56,
        },
        memberName: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        memberRowSelected: { opacity: 0.7 },
      }),
    [colors]
  );

  // ── Step 1 ────────────────────────────────────────────────────────
  const step1 = (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Send a to-do
        </Text>
      </View>
      <Text style={styles.body}>What kind?</Text>
      <Pressable
        onPress={() => chooseKind('single')}
        style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
        accessibilityRole="button"
        accessibilityLabel="Single item to-do"
      >
        <Text style={styles.optionLabel}>Single item</Text>
        <Text style={styles.optionSubtitle}>One task with a due date and assignee</Text>
      </Pressable>
      <Pressable
        onPress={() => chooseKind('list')}
        style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
        accessibilityRole="button"
        accessibilityLabel="List of items"
      >
        <Text style={styles.optionLabel}>List of items</Text>
        <Text style={styles.optionSubtitle}>A checklist for one person</Text>
      </Pressable>
    </>
  );

  // ── Step 2 ────────────────────────────────────────────────────────
  const selectedAssignee = members.find((m) => m.user_id === assigneeId) ?? null;
  const isSingle = kind === 'single';
  const headerLabel = isSingle ? 'New to-do' : 'New list';
  const titlePlaceholder = isSingle ? 'What needs doing?' : 'e.g. Trip prep, Pre-party';
  const titleLabel = isSingle ? 'Title' : 'List title';
  const ctaLabel = isSingle ? 'Send to-do' : 'Send list';

  const step2 = (
    <>
      <View style={styles.headerRow}>
        <Pressable
          onPress={backToStep1}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to step 1"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {headerLabel}
        </Text>
      </View>

      <Text style={styles.fieldLabel}>{titleLabel}</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={titlePlaceholder}
        placeholderTextColor={colors.text.secondary}
        maxLength={120}
        returnKeyType="next"
      />

      {isSingle && (
        <>
          <Text style={styles.fieldLabel}>Due date</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.rowButton}
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={dueDate ? 'Change due date' : 'Pick a due date'}
            >
              <Text style={[styles.rowLabel, !dueDate && styles.rowLabelMuted]}>
                {dueDate
                  ? dueDate.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'No due date'}
              </Text>
            </TouchableOpacity>
            {dueDate ? (
              <TouchableOpacity
                onPress={() => setDueDate(null)}
                accessibilityLabel="Clear due date"
                style={styles.itemRemoveButton}
              >
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                accessibilityLabel="Pick a due date"
                style={styles.itemRemoveButton}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.interactive.accent} />
              </TouchableOpacity>
            )}
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
              themeVariant="dark"
            />
          )}
        </>
      )}

      {!isSingle && (
        <>
          <Text style={styles.fieldLabel}>Items</Text>
          {listItems.map((it, idx) => (
            <View key={`${idx}-${it.title}`} style={styles.itemTile}>
              <Text style={styles.itemTileTitle} numberOfLines={1}>
                {it.title}
              </Text>
              <TouchableOpacity
                onPress={() => removeListItem(idx)}
                style={styles.itemRemoveButton}
                accessibilityLabel={`Remove ${it.title}`}
              >
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.addRowInput]}
              value={itemDraft}
              onChangeText={setItemDraft}
              placeholder="Add an item, then tap +"
              placeholderTextColor={colors.text.secondary}
              maxLength={120}
              returnKeyType="done"
              onSubmitEditing={addListItem}
            />
            <TouchableOpacity
              onPress={addListItem}
              accessibilityLabel="Add list item"
              style={styles.addButton}
              disabled={itemDraft.trim().length === 0}
            >
              <Ionicons name="add" size={22} color={colors.interactive.accent} />
            </TouchableOpacity>
          </View>
          {listItems.length < 2 && <Text style={styles.helper}>Tap + to add (min 2)</Text>}
        </>
      )}

      <Text style={styles.fieldLabel}>{isSingle ? 'Assign to' : 'Assign whole list to'}</Text>
      <Pressable
        onPress={() => setAssigneePickerOpen(true)}
        style={({ pressed }) => [
          styles.row,
          { marginBottom: SPACING.md },
          pressed && styles.optionPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          selectedAssignee
            ? `Assigned to ${selectedAssignee.display_name}. Tap to change.`
            : 'Pick assignee'
        }
      >
        <View style={styles.rowButton}>
          {selectedAssignee ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <AvatarCircle
                size={28}
                imageUri={selectedAssignee.avatar_url}
                displayName={selectedAssignee.display_name}
              />
              <Text style={styles.rowLabel}>{selectedAssignee.display_name}</Text>
            </View>
          ) : (
            <Text style={[styles.rowLabel, styles.rowLabelMuted]}>Pick someone</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </Pressable>

      <TouchableOpacity
        onPress={onSubmit}
        disabled={!canSend || pending}
        style={[styles.primaryCta, (!canSend || pending) && styles.primaryCtaDisabled]}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        {pending ? (
          <ActivityIndicator color={colors.surface.base} />
        ) : (
          <Text style={[styles.primaryCtaLabel, !canSend && styles.primaryCtaLabelDisabled]}>
            {ctaLabel}
          </Text>
        )}
      </TouchableOpacity>

      {errorText && (
        <TouchableOpacity onPress={onSubmit} style={styles.errorBanner}>
          <Text style={styles.errorBannerLabel}>{errorText}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  // ── Assignee picker sub-sheet ─────────────────────────────────────
  const assigneePicker = (
    <Modal
      visible={assigneePickerOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setAssigneePickerOpen(false)}
    >
      <TouchableWithoutFeedback onPress={() => setAssigneePickerOpen(false)}>
        <View style={styles.pickerBackdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.pickerSheet}>
              <View style={styles.dragHandle} />
              <Text style={styles.headerTitle}>Choose assignee</Text>
              {members.map((m) => {
                const isSelf = m.user_id === currentUserId;
                return (
                  <Pressable
                    key={m.user_id}
                    onPress={() => {
                      setAssigneeId(m.user_id);
                      setAssigneePickerOpen(false);
                    }}
                    style={({ pressed }) => [styles.memberRow, pressed && styles.memberRowSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={`Assign to ${m.display_name}${isSelf ? ' (you)' : ''}`}
                  >
                    <AvatarCircle size={36} imageUri={m.avatar_url} displayName={m.display_name} />
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.display_name}
                      {isSelf ? ' (you)' : ''}
                    </Text>
                    {assigneeId === m.user_id && (
                      <Ionicons name="checkmark" size={20} color={colors.interactive.accent} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeAnim}
      accessibilityViewIsModal
    >
      <TouchableWithoutFeedback onPress={closeAnim}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kavContainer}
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.dragHandle} />
          {step === 1 ? step1 : step2}
        </Animated.View>
      </KeyboardAvoidingView>
      {assigneePicker}
    </Modal>
  );
}
