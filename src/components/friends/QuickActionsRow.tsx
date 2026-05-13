// Phase 33 — Quick Actions row beneath the friend profile header (D-04 / D-09).
//
// Four ActionIconButtons in a horizontal centered row: Message · Mute · Photos · More.
// Per-button onPress is provided by the screen; this component is pure layout +
// per-button prop derivation (icon flips on Mute state, accessibility labels
// substitute the friend's first name).

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, SPACING } from '@/theme';
import { ActionIconButton } from './ActionIconButton';

interface QuickActionsRowProps {
  // Per-button callbacks — parent wires the real handlers (openChat, mute toggle, router.push, showActionSheet)
  onMessage: () => void;
  onToggleMute: () => void;
  onPhotos: () => void;
  onMore: () => void;
  // Dynamic Mute state — flips icon + label + accessibility copy
  isMuted: boolean;
  // First name for accessibility labels ('Message Alice' vs 'Message {first_name}')
  friendFirstName: string;
  // Disabled until DM channel resolved (Mute may be lazy-disabled until ready)
  muteDisabled?: boolean;
  // Message disabled while openChat is in flight
  messageDisabled?: boolean;
}

export function QuickActionsRow({
  onMessage,
  onToggleMute,
  onPhotos,
  onMore,
  isMuted,
  friendFirstName,
  muteDisabled = false,
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
        iconName={isMuted ? 'notifications-off-outline' : 'notifications-outline'}
        label={isMuted ? 'Unmute' : 'Mute'}
        haptic="selection"
        onPress={onToggleMute}
        disabled={muteDisabled}
        accessibilityLabel={isMuted ? `Unmute ${friendFirstName}` : `Mute ${friendFirstName}`}
        accessibilityHint={isMuted ? 'Resumes notifications from this chat' : 'Stops notifications from this chat'}
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
