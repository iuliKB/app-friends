import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
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
    content: {
      gap: SPACING.sm,
    },
    displayText: {
      fontSize: FONT_SIZE.lg,
      color: colors.text.primary,
      marginBottom: SPACING.xs,
    },
    urlText: {
      color: colors.interactive.accent,
      textDecorationLine: 'underline',
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
      .update({ link_dump: localText || null })
      .eq('id', planId);
    setSaving(false);
    if (error) {
      Alert.alert('Error', "Couldn't save links. Try again.");
      setLocalText(initialValue ?? '');
    }
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
            color={colors.text.secondary}
          />
          <Text style={styles.headerTitle}>{'Links'}</Text>
        </View>
        {saving && <ActivityIndicator size="small" color={colors.text.secondary} />}
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
            placeholderTextColor={colors.text.secondary}
            textAlignVertical="top"
          />
        </View>
      )}
    </View>
  );
}
