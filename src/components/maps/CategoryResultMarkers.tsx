import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Marker, Callout, CalloutSubview } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, RADII, FONT_SIZE, FONT_FAMILY, SHADOWS } from '@/theme';
import { placeTypeIcon, type PlaceMarker } from '@/lib/placeDisplay';

interface CategoryResultMarkersProps {
  results: PlaceMarker[];
  /** Label for the in-callout action button (e.g. "Use this location"). */
  actionLabel: string;
  /** Fired when the user taps the callout action for a result. */
  onAction: (marker: PlaceMarker) => void;
}

/**
 * Renders category / Recent chip results as map pins (Google-Maps style) with a
 * callout showing the place name + an action button. Must be a direct child of
 * MapView. The action is wired through Callout press on Android and
 * CalloutSubview press on iOS (where Callout's own onPress doesn't fire).
 */
export function CategoryResultMarkers({
  results,
  actionLabel,
  onAction,
}: CategoryResultMarkersProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pin: {
          width: 30,
          height: 30,
          borderRadius: RADII.full,
          backgroundColor: colors.interactive.accent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.surface.card,
          ...SHADOWS.fab,
        },
        // Custom tooltip card (no native white bubble). The arrow tip below
        // points at the pin, mirroring ExploreMapView's pinTip technique.
        bubble: {
          alignItems: 'center',
          width: 232,
        },
        callout: {
          width: 232,
          padding: SPACING.md,
          gap: SPACING.xs,
          borderRadius: RADII.lg,
          // Tinted dark card matching the app theme (near-opaque so the
          // Android callout bitmap snapshot reads cleanly over the map).
          backgroundColor: colors.surface.card,
          borderWidth: 1,
          borderColor: colors.border,
          ...SHADOWS.card,
        },
        // Subtle accent tint wash over the card surface — same accent used by
        // LocationPicker's addressIcon.
        calloutTint: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: RADII.lg,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(185,255,59,0.08)',
        },
        calloutTip: {
          width: 0,
          height: 0,

          marginTop: -1,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 10,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: colors.surface.card,
        },
        calloutTitle: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.primary,
        },
        calloutSecondary: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        actionButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.xs,
          marginTop: SPACING.xs,
          height: 38,
          borderRadius: RADII.md,
          backgroundColor: colors.interactive.accent,
        },
        actionText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.surface.base,
        },
      }),
    [colors]
  );

  return (
    <>
      {results.map((m) => {
        const icon = placeTypeIcon(m.types);
        return (
          <Marker
            key={m.placeId}
            identifier={m.placeId}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.pin}>
              <Ionicons name={icon} size={16} color={colors.surface.base} />
            </View>

            <Callout tooltip onPress={Platform.OS === 'android' ? () => onAction(m) : undefined}>
              <View style={styles.bubble}>
                <View style={styles.callout}>
                  {/* Accent tint wash over the tinted card surface */}
                  <View style={styles.calloutTint} pointerEvents="none" />

                  {/* 1. Place name */}
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {m.primaryText}
                  </Text>
                  {/* 2. Address */}
                  {m.secondaryText ? (
                    <Text style={styles.calloutSecondary} numberOfLines={2}>
                      {m.secondaryText}
                    </Text>
                  ) : null}

                  {/* 3. Primary call-to-action */}
                  {Platform.OS === 'ios' ? (
                    <CalloutSubview style={styles.actionButton} onPress={() => onAction(m)}>
                      <Text style={styles.actionText}>{actionLabel}</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.surface.base} />
                    </CalloutSubview>
                  ) : (
                    <View style={styles.actionButton}>
                      <Text style={styles.actionText}>{actionLabel}</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.surface.base} />
                    </View>
                  )}
                </View>

                {/* Arrow tip pointing down at the pin */}
                <View style={styles.calloutTip} />
              </View>
            </Callout>
          </Marker>
        );
      })}
    </>
  );
}
