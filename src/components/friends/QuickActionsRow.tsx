// Phase 33 — Quick Actions row beneath the friend profile header (D-04 / D-09).
//
// Three ActionIconButtons in a horizontal centered row: Message · Photos · More.
// Per-button onPress is provided by the screen; this component is pure layout +
// per-button prop derivation (accessibility labels substitute the friend's first
// name).

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, SPACING } from '@/theme';
import { ActionIconButton } from './ActionIconButton';

interface QuickActionsRowProps {
  // Per-button callbacks — parent wires the real handlers (openChat, router.push, showActionSheet)
  onMessage: () => void;
  onPhotos: () => void;
  onMore: () => void;
  // First name for accessibility labels ('Message Alice' vs 'Message {first_name}')
  friendFirstName: string;
  // Message disabled while openChat is in flight
  messageDisabled?: boolean;
}

export function QuickActionsRow({
  onMessage,
  onPhotos,
  onMore,
  friendFirstName,
  messageDisabled = false,
}: QuickActionsRowProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: SPACING.xl,
          marginTop: SPACING.xl,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.row}>
      <ActionIconButton
        iconName="chatbubble-outline"
        label="Message"
        tone="accent"
        haptic="light"
        onPress={onMessage}
        disabled={messageDisabled}
        accessibilityLabel={`Message ${friendFirstName}`}
        accessibilityHint="Opens a direct message"
      />
      <ActionIconButton
        iconName="images-outline"
        label="Photos"
        haptic="light"
        onPress={onPhotos}
        accessibilityLabel="Shared photos"
        accessibilityHint="Opens photos you both appear in"
      />
      <ActionIconButton
        iconName="ellipsis-horizontal"
        label="More"
        haptic="selection"
        onPress={onMore}
        accessibilityLabel="More actions"
        accessibilityHint="Opens an action menu"
      />
    </View>
  );
}
