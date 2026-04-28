// Phase 11 v1.4 — WishListItem (D-04, D-08, D-09)
// Reusable row for a single wish list item: title + optional URL + optional notes + claim toggle.
// readOnly=true: no claim button (used in own profile view — D-05)
// readOnly=false (default): shows Claim / Unclaim / Claimed button based on claim state (D-08, D-09)
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';

interface WishListItemProps {
  title: string;
  url: string | null;
  notes: string | null;
  isClaimed: boolean;        // true if any friend has claimed this item
  isClaimedByMe: boolean;    // true if current user claimed it
  onToggleClaim?: () => void;
  readOnly?: boolean;        // true when viewing own wish list (profile edit)
}

export function WishListItem({
  title,
  url,
  notes,
  isClaimed,
  isClaimedByMe,
  onToggleClaim,
  readOnly = false,
}: WishListItemProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: colors.surface.base,
      gap: SPACING.md,
    },
    textGroup: {
      flex: 1,
    },
    title: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    url: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.interactive.accent,
      marginTop: SPACING.xs,
    },
    notes: {
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      marginTop: SPACING.xs,
    },
    claimButton: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADII.md,
      backgroundColor: colors.surface.card,
      alignSelf: 'flex-start',
      marginTop: SPACING.xs,
    },
    claimButtonActive: {
      backgroundColor: colors.interactive.accent,
    },
    claimText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
    },
    claimTextActive: {
      color: colors.surface.base,
    },
    claimTextClaimed: {
      color: colors.text.secondary,
    },
  }), [colors]);

  const claimLabel = isClaimedByMe ? 'Unclaim' : isClaimed ? 'Claimed' : 'Claim';

  return (
    <View style={styles.row}>
      <View style={styles.textGroup}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {url ? (
          <Text style={styles.url} numberOfLines={1}>
            {url}
          </Text>
        ) : null}
        {notes ? (
          <Text style={styles.notes} numberOfLines={2}>
            {notes}
          </Text>
        ) : null}
      </View>
      {!readOnly && onToggleClaim ? (
        <Pressable
          style={({ pressed }) => [
            styles.claimButton,
            isClaimedByMe && styles.claimButtonActive,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onToggleClaim}
          accessibilityLabel={claimLabel}
        >
          <Text
            style={[
              styles.claimText,
              isClaimedByMe && styles.claimTextActive,
              isClaimed && !isClaimedByMe && styles.claimTextClaimed,
            ]}
          >
            {claimLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
