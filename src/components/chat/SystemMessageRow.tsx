// Phase 29.1 Plan 07 — SystemMessageRow component.
//
// Centered, italic system-message renderer. Used for the chat thread's
// "✓ {name} completed {task}" / "✓ {name} finished {list}" rows posted by
// `complete_chat_todo` RPC (migration 0024) — see UI-SPEC §System message.
//
// Rendering contract (Pitfall 9 + 10):
//   • centered single line, FONT_SIZE.xs, body.regular, italic, text.secondary
//   • plain text, no leading glyph (the literal "✓ " completion prefix is stripped)
//   • no avatar, no bubble background, no long-press menu (the dispatcher in
//     MessageBubble bails on isSystem before any long-press handling)
//   • a11y: accessibilityRole="text", accessibilityLabel=`System: ${body}`
//
// Net-new minimal component; no in-repo analog (PATTERNS.md §SystemMessageRow).

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_FAMILY, FONT_SIZE, SPACING } from '@/theme';

interface SystemMessageRowProps {
  body: string;
}

export function SystemMessageRow({ body }: SystemMessageRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: '100%',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.sm,
        },
        inner: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
        },
        text: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          fontStyle: 'italic',
        },
      }),
    [colors]
  );

  // Completion bodies are stored with a literal "✓ " prefix by
  // `complete_chat_todo` (migrations 0024/0026); group events have none
  // (migration 0029). System rows render as plain centered italic text with no
  // leading glyph, so strip the literal prefix when present.
  const displayBody = body.replace(/^✓\s+/, '');

  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel={`System: ${body}`}>
      <View style={styles.inner}>
        <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
          {displayBody}
        </Text>
      </View>
    </View>
  );
}
