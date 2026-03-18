import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

interface LinkDumpFieldProps {
  planId: string;
  initialValue: string | null;
}

interface TextSegment {
  text: string;
  isUrl: boolean;
}

function parseTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(URL_REGEX.source, 'gi');

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isUrl: false });
    }
    segments.push({ text: match[0], isUrl: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isUrl: false });
  }

  return segments;
}

export function LinkDumpField({ planId, initialValue }: LinkDumpFieldProps) {
  const [expanded, setExpanded] = useState(false);
  const [localText, setLocalText] = useState(initialValue ?? '');
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (localText === (initialValue ?? '')) return;
    setSaving(true);
    await supabase
      .from('plans')
      .update({ link_dump: localText || null })
      .eq('id', planId);
    setSaving(false);
  }

  const segments = localText ? parseTextSegments(localText) : [];

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
          <Text style={styles.headerTitle}>{'Links'}</Text>
        </View>
        {saving && <ActivityIndicator size="small" color={COLORS.textSecondary} />}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {segments.length > 0 && (
            <Text style={styles.displayText}>
              {segments.map((segment, index) =>
                segment.isUrl ? (
                  <Pressable key={index} onPress={() => Linking.openURL(segment.text)}>
                    <Text style={styles.urlText}>{segment.text}</Text>
                  </Pressable>
                ) : (
                  <Text key={index}>{segment.text}</Text>
                )
              )}
            </Text>
          )}
          <TextInput
            style={styles.textInput}
            multiline
            value={localText}
            onChangeText={setLocalText}
            onBlur={handleBlur}
            placeholder="Drop links here..."
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
  content: {
    gap: 8,
  },
  displayText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  urlText: {
    color: COLORS.accent,
    textDecorationLine: 'underline',
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
