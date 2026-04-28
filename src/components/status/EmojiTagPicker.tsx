import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY } from '@/theme';
import type { EmojiTag, StatusValue } from '@/types/app';

interface EmojiTagPickerProps {
  selectedTag: EmojiTag;
  onTagChange: (emoji: EmojiTag) => void;
  currentStatus: StatusValue | null;
  saving: boolean;
  savingTag: EmojiTag;
}

const EMOJI_PRESETS: EmojiTag[] = ['☕️', '🎮', '🏋️', '🍕', '🎵', '🎉', '🎬', '😴'];

function getStatusActiveBackground(status: StatusValue | null): string {
  switch (status) {
    case 'free':
      return 'rgba(34,197,94,0.2)'; // no exact token
    case 'busy':
      return 'rgba(239,68,68,0.2)'; // no exact token
    case 'maybe':
      return 'rgba(234,179,8,0.2)'; // no exact token
    default:
      return 'rgba(234,179,8,0.2)'; // no exact token
  }
}

export function EmojiTagPicker({
  selectedTag,
  onTagChange,
  currentStatus,
  saving,
  savingTag,
}: EmojiTagPickerProps) {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    sectionLabel: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginBottom: SPACING.sm,
      paddingHorizontal: SPACING.lg,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.xl,
    },
    button: {
      width: 44,
      height: 44,
      borderRadius: 22, // no exact token — circular with equal width/height
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emoji: {
      fontSize: FONT_SIZE.xxl,
    },
  }), [colors]);

  function getStatusBorderColor(status: StatusValue | null): string {
    switch (status) {
      case 'free':
        return colors.status.free;
      case 'busy':
        return colors.status.busy;
      case 'maybe':
        return colors.status.maybe;
      default:
        return colors.status.maybe;
    }
  }

  const activeBg = getStatusActiveBackground(currentStatus);
  const activeBorder = getStatusBorderColor(currentStatus);

  return (
    <View>
      <Text style={styles.sectionLabel}>Mood</Text>
      <View style={styles.row}>
        {EMOJI_PRESETS.map((emoji) => {
          const isActive = selectedTag === emoji;
          const isSaving = savingTag === emoji;

          return (
            <TouchableOpacity
              key={emoji}
              style={[
                styles.button,
                isActive && {
                  backgroundColor: activeBg,
                  borderColor: activeBorder,
                },
              ]}
              onPress={() => onTagChange(emoji)}
              disabled={saving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.text.secondary} />
              ) : (
                <Text style={styles.emoji}>{emoji}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
