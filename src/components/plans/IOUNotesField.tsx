import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';

interface IOUNotesFieldProps {
  planId: string;
  initialValue: string | null;
}

export function IOUNotesField({ planId, initialValue }: IOUNotesFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACING.md,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: FONT_SIZE.xl,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      marginLeft: SPACING.sm,
    },
    textInput: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      padding: SPACING.lg,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 80,
      textAlignVertical: 'top',
    },
  }), [colors]);

  const [expanded, setExpanded] = useState(false);
  const [localText, setLocalText] = useState(initialValue ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalText(initialValue ?? '');
  }, [initialValue]);

  async function handleBlur() {
    if (localText === (initialValue ?? '')) return;
    setSaving(true);
    const { error } = await supabase
      .from('plans')
      .update({ general_notes: localText || null })
      .eq('id', planId);
    setSaving(false);
    if (error) {
      Alert.alert('Error', "Couldn't save notes. Try again.");
      setLocalText(initialValue ?? '');
    }
  }

  return (
    <View>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((prev) => !prev)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color={colors.text.secondary}
          />
          <Text style={styles.headerTitle}>{'Notes'}</Text>
        </View>
        {saving && <ActivityIndicator size="small" color={colors.text.secondary} />}
      </TouchableOpacity>

      {expanded && (
        <View>
          <TextInput
            style={styles.textInput}
            multiline
            value={localText}
            onChangeText={setLocalText}
            onBlur={handleBlur}
            placeholder="Add notes for this plan..."
            placeholderTextColor={colors.text.secondary}
            textAlignVertical="top"
          />
        </View>
      )}
    </View>
  );
}
