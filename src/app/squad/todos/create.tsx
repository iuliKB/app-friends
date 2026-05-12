// Phase 29.1 Plan 06 — To-Do create screen.
// Route: /squad/todos/create
//
// Form (D-12 shape):
//   1. Title input (required, max 120 chars)
//   2. Due-date row (optional, native DateTimePicker; Clear when set)
//   3. Notes input (optional, multiline 4 lines)
//   4. Priority 3-segment control (Low / Medium / High; default Medium)
//
// Submit calls `supabase.rpc('create_todo', { p_title, p_due_date, p_notes,
// p_priority })`. Success haptic + router.back() on confirm.

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { supabase } from '@/lib/supabase';
import type { TodoPriority } from '@/types/todos';

const MAX_TITLE_LEN = 120;

// Format a Date to local YYYY-MM-DD (drops the UTC-slice off-by-one — Pitfall 5).
function toLocalDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDueDateDisplay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TodoCreateScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [submitting, setSubmitting] = useState(false);

  function handleDateChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  }

  function handlePriorityChange(next: TodoPriority) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPriority(next);
  }

  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length > 0 && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    // Cast through any: database.ts not regenerated since migration 0024
    // (same pattern as Plan 03 hooks and Plan 05 screens).
    const { error } = await (supabase as any).rpc('create_todo', {
      p_title: trimmedTitle,
      p_due_date: dueDate ? toLocalDateString(dueDate) : null,
      p_notes: notes.trim() || null,
      p_priority: priority,
    });
    setSubmitting(false);
    if (error) {
      console.warn('create_todo failed', error);
      Alert.alert("Couldn't create to-do", error.message ?? 'Try again.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  }, [canSubmit, trimmedTitle, dueDate, notes, priority, router]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.surface.base },
        content: {
          padding: SPACING.lg,
          paddingBottom: SPACING.xxl,
          gap: SPACING.xl,
        },
        sectionLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          marginBottom: SPACING.sm,
        },
        textInput: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.md,
          padding: SPACING.lg,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
          borderWidth: 1,
          borderColor: colors.border,
        },
        notesInput: {
          minHeight: 96,
          textAlignVertical: 'top',
        },
        dueRow: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.md,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          borderWidth: 1,
          borderColor: colors.border,
          gap: SPACING.md,
          minHeight: 52,
        },
        dueRowText: {
          flex: 1,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
        },
        dueRowTextEmpty: {
          color: colors.text.secondary,
        },
        clearButton: {
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
        },
        clearText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.interactive.accent,
        },
        priorityRow: {
          flexDirection: 'row',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.md,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          padding: 4,
          borderWidth: 1,
          borderColor: colors.border,
        },
        prioritySegment: {
          flex: 1,
          paddingVertical: SPACING.sm,
          alignItems: 'center',
          borderRadius: RADII.md,
        },
        priorityActive: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: '#ffffff14',
        },
        priorityLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
        },
        priorityLabelActive: {
          color: colors.text.primary,
        },
      }),
    [colors]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <View>
        <Text style={styles.sectionLabel}>To-do</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={(t) => setTitle(t.slice(0, MAX_TITLE_LEN))}
          placeholder="What do you need to do?"
          placeholderTextColor={colors.text.secondary}
          maxLength={MAX_TITLE_LEN}
          accessibilityLabel="To-do title"
        />
      </View>

      {/* Due date */}
      <View>
        <Text style={styles.sectionLabel}>Due date</Text>
        <TouchableOpacity
          style={styles.dueRow}
          onPress={() => setShowDatePicker((v) => !v)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={dueDate ? `Due ${formatDueDateDisplay(dueDate)}` : 'Set due date'}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.text.secondary} />
          <Text style={[styles.dueRowText, !dueDate && styles.dueRowTextEmpty]}>
            {dueDate ? formatDueDateDisplay(dueDate) : 'No due date'}
          </Text>
          {dueDate ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setDueDate(null);
                setShowDatePicker(false);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear due date"
            >
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : (
            <Ionicons
              name={showDatePicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.text.secondary}
            />
          )}
        </TouchableOpacity>
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
      </View>

      {/* Notes */}
      <View>
        <Text style={styles.sectionLabel}>Notes</Text>
        <TextInput
          style={[styles.textInput, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes (optional)"
          placeholderTextColor={colors.text.secondary}
          multiline
          numberOfLines={4}
          accessibilityLabel="Notes"
        />
      </View>

      {/* Priority */}
      <View>
        <Text style={styles.sectionLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {(['low', 'medium', 'high'] as const).map((p) => {
            const active = priority === p;
            const label = p === 'low' ? 'Low' : p === 'medium' ? 'Medium' : 'High';
            return (
              <TouchableOpacity
                key={p}
                style={[styles.prioritySegment, active && styles.priorityActive]}
                onPress={() => handlePriorityChange(p)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Priority ${label}`}
              >
                <Text style={[styles.priorityLabel, active && styles.priorityLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Submit */}
      <PrimaryButton
        title="Add to-do"
        onPress={handleSubmit}
        loading={submitting}
        disabled={!canSubmit}
      />
    </ScrollView>
  );
}
