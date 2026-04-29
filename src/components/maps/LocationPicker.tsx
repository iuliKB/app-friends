import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { DARK_MAP_STYLE } from '@/lib/maps';
import type { Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, FONT_WEIGHT, RADII } from '@/theme';
import { formatAddress } from '@/lib/maps';

interface LocationPickerProps {
  visible: boolean;
  onConfirm: (coords: { latitude: number; longitude: number; label: string }) => void;
  onCancel: () => void;
}

const DEFAULT_REGION: Region = {
  latitude: 43.6532, // Toronto — D-10 discretion
  longitude: -79.3832,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function LocationPicker({ visible, onConfirm, onCancel }: LocationPickerProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [isGeocoding, setIsGeocoding] = useState(false);
  // addressLabel preview deferred — geocode only on confirm (T-20-10)

  // On modal open: request permission and center on GPS position
  useEffect(() => {
    if (!visible) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return; // map stays on DEFAULT_REGION
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, [visible]);

  async function handleConfirm() {
    setIsGeocoding(true);
    try {
      // T-20-10: Always check permission before reverseGeocodeAsync (prevents Android hang)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const label = `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`;
        onConfirm({ latitude: region.latitude, longitude: region.longitude, label });
        return;
      }
      const results = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude,
      });
      const label = results[0]
        ? formatAddress(results[0], region.latitude, region.longitude)
        : `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`;
      onConfirm({ latitude: region.latitude, longitude: region.longitude, label });
    } finally {
      setIsGeocoding(false);
    }
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface.card,
        },
        headerTitle: {
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.lg,
          color: colors.text.primary,
        },
        mapContainer: {
          flex: 1,
        },
        pinContainer: {
          position: 'absolute',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          top: '50%',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          left: '50%',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginLeft: -18,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: -36,
        },
        confirmBar: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface.card,
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          borderTopLeftRadius: RADII.xl,
          borderTopRightRadius: RADII.xl,
          ...colors.cardElevation,
        },
        addressRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          marginBottom: SPACING.sm,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          minHeight: 24,
        },
        addressLabel: {
          fontFamily: FONT_FAMILY.body.medium,
          fontSize: FONT_SIZE.md,
          color: colors.text.primary,
          flex: 1,
        },
        confirmButton: {
          height: 48,
          backgroundColor: colors.interactive.accent,
          borderRadius: RADII.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        confirmButtonText: {
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.lg,
          // D-UI: dark mode: #0E0F11, light mode: #FFFFFF
          color: isDark ? '#0E0F11' : '#FFFFFF',
        },
      }),
    [colors, isDark, insets],
  );

  // Dynamic header height: 52pt + top safe area
  const headerStyle = useMemo(
    () => [styles.header, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.md }],
    [styles.header, insets.top],
  );

  // Dynamic confirm bar padding bottom: 16 + bottom safe area
  const confirmBarStyle = useMemo(
    () => [styles.confirmBar, { paddingBottom: insets.bottom + SPACING.lg }],
    [styles.confirmBar, insets.bottom],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        {/* Header bar */}
        <View style={headerStyle}>
          <Text style={styles.headerTitle}>{'Choose location'}</Text>
          <TouchableOpacity
            onPress={onCancel}
            hitSlop={12}
            accessibilityLabel="Close location picker"
          >
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Map + fixed pin overlay */}
        <View style={styles.mapContainer}>
          <MapView
            style={StyleSheet.absoluteFillObject}
            provider={PROVIDER_GOOGLE}
            customMapStyle={DARK_MAP_STYLE}
            region={region}
            onRegionChangeComplete={(r, { isGesture }) => {
              if (isGesture) setRegion(r);
            }}
          />

          {/* Fixed pin at screen center — pointerEvents none so map drag-through works */}
          <View
            style={styles.pinContainer}
            pointerEvents="none"
            accessibilityLabel="Drag map to adjust pin location"
          >
            <Ionicons name="location" size={36} color={colors.interactive.accent} />
          </View>
        </View>

        {/* Confirm bar */}
        <View style={confirmBarStyle}>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={colors.interactive.accent} />
            {isGeocoding ? (
              <ActivityIndicator size="small" color={colors.interactive.accent} />
            ) : (
              <Text style={styles.addressLabel} numberOfLines={1}>
                {'Drag map to choose a location'}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.confirmButton, isGeocoding && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={isGeocoding}
            accessibilityLabel="Confirm selected location"
            accessibilityState={{ disabled: isGeocoding }}
          >
            <Text style={styles.confirmButtonText}>{'Confirm Location'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
