import React, { useState, useMemo } from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';

export interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  helperText?: string;
  autoCapitalize?: 'none' | 'sentences';
  keyboardType?: KeyboardTypeOptions;
}

export function FormField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  secureTextEntry = false,
  helperText,
  autoCapitalize,
  keyboardType,
}: FormFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginBottom: 0,
    },
    label: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginBottom: SPACING.sm,
    },
    inputContainer: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingHorizontal: SPACING.lg,
    },
    inputFocused: {
      borderColor: colors.interactive.accent,
      borderWidth: 1.5,
    },
    inputError: {
      borderColor: colors.interactive.destructive,
    },
    input: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      paddingVertical: 14, // no exact token — intentional per Phase 8 decision
    },
    errorText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.interactive.destructive,
      marginTop: SPACING.xs,
    },
    helperText: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.xs,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {!!helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
}
