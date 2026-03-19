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
import { COLORS } from '@/constants/colors';
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
      .update({ iou_notes: localText || null })
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
            color={COLORS.textSecondary}
          />
          <Text style={styles.headerTitle}>{'IOU Notes'}</Text>
        </View>
        {saving && <ActivityIndicator size="small" color={COLORS.textSecondary} />}
      </TouchableOpacity>

      {expanded && (
        <View>
          <TextInput
            style={styles.textInput}
            multiline
            value={localText}
            onChangeText={setLocalText}
            onBlur={handleBlur}
            placeholder="Who owes who?"
            placeholderTextColor={COLORS.textSecondary}
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
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  textInput: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
