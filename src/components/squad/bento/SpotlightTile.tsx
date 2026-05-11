import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme, FONT_SIZE, FONT_FAMILY, RADII, SPACING } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { formatCentsDisplay } from '@/utils/currencyFormat';
import { BentoCard } from './BentoCard';
import { TILE_ACCENTS } from './tileAccents';
import type { SpotlightItem } from '@/hooks/useSpotlight';

interface SpotlightTileProps {
  item: SpotlightItem;
  loading?: boolean;
}

const ICON_BY_ACCENT: Record<SpotlightItem['accent'], keyof typeof Ionicons.glyphMap> = {
  gift: 'gift-outline',
  money: 'cash-outline',
  flame: 'flame-outline',
  neutral: 'sparkles-outline',
};

// Halo: a large soft-edged circle in the accent color, positioned top-right
// and clipped by BentoCard's overflow:hidden. Reads as a radial accent glow
// without needing react-native-svg or a real radial gradient.
const HALO_SIZE = 220;

export function SpotlightTile({ item, loading }: SpotlightTileProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const accentColor = useMemo(() => {
    switch (item.accent) {
      case 'money':
        return (item.signedAmountCents ?? 0) >= 0
          ? TILE_ACCENTS.iouPositive
          : TILE_ACCENTS.iouNegative;
      case 'gift':
        return TILE_ACCENTS.birthday;
      case 'flame':
        return TILE_ACCENTS.streak;
      case 'neutral':
      default:
        return TILE_ACCENTS.neutral;
    }
  }, [item.accent, item.signedAmountCents]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        halo: {
          position: 'absolute',
          width: HALO_SIZE,
          height: HALO_SIZE,
          borderRadius: HALO_SIZE / 2,
          top: -HALO_SIZE * 0.45,
          right: -HALO_SIZE * 0.3,
          backgroundColor: accentColor + '24',
        },
        haloInner: {
          position: 'absolute',
          width: HALO_SIZE * 0.55,
          height: HALO_SIZE * 0.55,
          borderRadius: (HALO_SIZE * 0.55) / 2,
          top: -HALO_SIZE * 0.2,
          right: -HALO_SIZE * 0.08,
          backgroundColor: accentColor + '33',
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
        },
        iconBubble: {
          width: 56,
          height: 56,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: accentColor + '26',
          borderWidth: 1,
          borderColor: accentColor + '40',
        },
        copy: {
          flex: 1,
          gap: SPACING.xs,
        },
        title: {
          fontSize: FONT_SIZE.xxxl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
          letterSpacing: -0.5,
          lineHeight: FONT_SIZE.xxxl * 1.15,
        },
        subtitle: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        ctaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          marginTop: SPACING.lg,
        },
        ctaLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: accentColor,
        },
        amount: {
          fontSize: FONT_SIZE.hero,
          fontFamily: FONT_FAMILY.display.semibold,
          color: accentColor,
          marginTop: SPACING.md,
          letterSpacing: -1,
        },
        skeletonBar: {
          height: 16,
          borderRadius: RADII.md,
          backgroundColor: colors.border,
        },
      }),
    [colors, accentColor]
  );

  if (loading) {
    return (
      <BentoCard variant="spotlight" accessibilityLabel="Loading featured activity">
        <View style={[styles.skeletonBar, { width: '60%' }]} />
        <View style={[styles.skeletonBar, { width: '40%', marginTop: SPACING.md }]} />
      </BentoCard>
    );
  }

  const showAmount = item.kind === 'iou' && typeof item.signedAmountCents === 'number';
  const showAvatar = item.kind === 'birthday' && item.displayName;

  return (
    <BentoCard
      variant="spotlight"
      onPress={() => router.push(item.href as never)}
      borderColor={accentColor + '33'}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.subtitle}. ${item.cta}.`}
    >
      <View style={styles.halo} pointerEvents="none" />
      <View style={styles.haloInner} pointerEvents="none" />

      <View style={styles.headerRow}>
        {showAvatar ? (
          <AvatarCircle
            size={56}
            imageUri={item.avatarUrl ?? null}
            displayName={item.displayName!}
          />
        ) : (
          <View style={styles.iconBubble}>
            <Ionicons name={ICON_BY_ACCENT[item.accent]} size={28} color={accentColor} />
          </View>
        )}
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
      </View>

      {showAmount && (
        <Text style={styles.amount}>
          {(item.signedAmountCents ?? 0) >= 0 ? '+' : '−'}
          {formatCentsDisplay(Math.abs(item.signedAmountCents ?? 0))}
        </Text>
      )}

      <View style={styles.ctaRow}>
        <Text style={styles.ctaLabel}>{item.cta}</Text>
        <Ionicons name="arrow-forward" size={16} color={accentColor} />
      </View>
    </BentoCard>
  );
}
