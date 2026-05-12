// Phase 29.1 Plan 06 — TodoQuickAdd component.
// Inline single-line quick-add. Currently unused by the To-Dos screen (the
// home-feed creation path is the FAB → /squad/todos/create); kept for
// historical continuity with Phase 29.1 Plan 06 artifacts. May be reused if
// inline composition is reintroduced later.
//
// Behavior:
//   • Single-line TextInput, placeholder "Quick add to-do"
//   • Submit on onSubmitEditing (Enter) or on tap of trailing `+` button
//   • After submit: clear input, call onAdd(title); show inline spinner while pending
//   • Title required (>0 chars after trim) before submit fires

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';

interface TodoQuickAddProps {
  onAdd: (title: string) => Promise<unknown>;
}

export function TodoQuickAdd({ onAdd }: TodoQuickAddProps) {
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: colors.border,
          marginHorizontal: SPACING.lg,
          marginBottom: SPACING.md,
          paddingHorizontal: SPACING.md,
          minHeight: 52,
        },
        input: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 12,
        },
        submitButton: {
          width: 32,
          height: 32,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.interactive.accent,
          marginLeft: SPACING.sm,
        },
        submitButtonDisabled: {
          backgroundColor: colors.surface.overlay,
        },
      }),
    [colors]
  );

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="Quick add to-do"
        placeholderTextColor={colors.text.secondary}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        editable={!submitting}
        accessibilityLabel="Quick add to-do"
      />
      <Pressable
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Add to-do"
      >
        {submitting ? (
          <ActivityIndicator size="small" color={colors.surface.base} />
        ) : (
          <Ionicons
            name="add"
            size={20}
            color={canSubmit ? colors.surface.base : colors.text.secondary}
          />
        )}
      </Pressable>
    </View>
  );
}
