import React, { useMemo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
}: SearchBarProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.full,
          borderWidth: 1,
          borderColor: colors.border,
          height: 44,
          paddingHorizontal: SPACING.md,
          gap: SPACING.sm,
          marginHorizontal: SPACING.lg,
          marginTop: SPACING.sm,
          marginBottom: SPACING.md,
        },
        input: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 0,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={18} color={colors.text.secondary} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
