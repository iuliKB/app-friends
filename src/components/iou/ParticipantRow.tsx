// Phase 8 v1.4 — ParticipantRow (IOU-02, IOU-04).
// One row per expense participant: avatar, name, share amount, settled/unsettled badge.
// "Mark Settled" button shown only when isCreator && !isPayerRow && !isSettled.
// T-08-P02-01: UI guard is UX convenience; authoritative enforcement is RLS on iou_members.

import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { formatCentsDisplay } from '@/utils/currencyFormat';

interface ParticipantRowProps {
  displayName: string;
  avatarUrl: string | null;
  shareCents: number;
  isSettled: boolean;
  isPayerRow: boolean;
  isCreator: boolean;
  onSettle: () => void;
  settleLoading: boolean;
}

export function ParticipantRow({
  displayName,
  avatarUrl,
  shareCents,
  isSettled,
  isPayerRow,
  isCreator,
  onSettle,
  settleLoading,
}: ParticipantRowProps) {
  const showSettleButton = isCreator && !isPayerRow && !isSettled;

  return (
    <View style={styles.row}>
      <AvatarCircle
        size={36}
        imageUri={avatarUrl}
        displayName={displayName}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.share}>{formatCentsDisplay(shareCents)}</Text>
      </View>
      {showSettleButton ? (
        <TouchableOpacity
          style={styles.settleButton}
          onPress={onSettle}
          disabled={settleLoading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${displayName} settled`}
        >
          {settleLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.settleButtonLabel}>Mark Settled</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={[styles.badge, isSettled ? styles.settledBadge : styles.unsettledBadge]}>
          <Text style={[styles.badgeText, isSettled ? styles.settledText : styles.unsettledText]}>
            {isSettled ? 'Settled' : 'Unsettled'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface.card,
    marginBottom: SPACING.sm,
    borderRadius: RADII.md,
  },
  info: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  name: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  share: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  settleButton: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    minHeight: 44,
    backgroundColor: COLORS.interactive.accent,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleButtonLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#ffffff',
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.md,
  },
  settledBadge: {
    backgroundColor: COLORS.status.free,
  },
  unsettledBadge: {
    backgroundColor: COLORS.border,
  },
  badgeText: {
    fontSize: FONT_SIZE.md,
  },
  settledText: {
    fontWeight: FONT_WEIGHT.semibold,
    color: '#ffffff',
  },
  unsettledText: {
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
});
