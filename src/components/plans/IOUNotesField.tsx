import React, { useEffect, useState } from 'react';
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
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { supabase } from '@/lib/supabase';

interface IOUNotesFieldProps {
  planId: string;
  initialValue: string | null;
}

export function IOUNotesField({ planId, initialValue }: IOUNotesFieldProps) {
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
            color={COLORS.text.secondary}
          />
          <Text style={styles.headerTitle}>{'Notes'}</Text>
        </View>
        {saving && <ActivityIndicator size="small" color={COLORS.text.secondary} />}
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
            placeholderTextColor={COLORS.text.secondary}
            textAlignVertical="top"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
  },
  textInput: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
    backgroundColor: COLORS.surface.card,
    borderRadius: RADII.md,
    padding: SPACING.lg,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
