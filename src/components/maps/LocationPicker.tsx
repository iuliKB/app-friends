import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, SHADOWS } from '@/theme';
import { DARK_MAP_STYLE, formatAddress } from '@/lib/maps';

interface LocationPickerProps {
  visible: boolean;
  onConfirm: (coords: { latitude: number; longitude: number; label: string }) => void;
  onCancel: () => void;
}

interface SearchResult {
  latitude: number;
  longitude: number;
  label: string;
}

const DEFAULT_REGION: Region = {
  latitude: 43.6532, // Toronto — D-10 discretion
  longitude: -79.3832,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const PIN_LIFT_PX = 10;
const REVERSE_DEBOUNCE_MS = 250;

export function LocationPicker({ visible, onConfirm, onCancel }: LocationPickerProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const mapRef = useRef<MapView>(null);
  const centerRef = useRef({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const reverseSeqRef = useRef(0);
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinLift = useRef(new Animated.Value(0)).current;
  const isLiftedRef = useRef(false);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Reset state and animate to GPS each time the modal opens.
  useEffect(() => {
    if (!visible) return;
    centerRef.current = {
      latitude: DEFAULT_REGION.latitude,
      longitude: DEFAULT_REGION.longitude,
    };
    setCurrentAddress(null);
    setIsResolvingAddress(false);
    setSearchQuery('');
    setIsSearching(false);
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
    isLiftedRef.current = false;
    pinLift.setValue(0);

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setPermissionGranted(granted);
      if (!granted) return;
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const target = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        centerRef.current = { latitude: target.latitude, longitude: target.longitude };
        mapRef.current?.animateToRegion(target, 600);
        scheduleReverseGeocode(target.latitude, target.longitude);
      } catch {
        /* GPS may fail silently — user can still pan/search */
      }
    })();

    return () => {
      if (reverseTimerRef.current) {
        clearTimeout(reverseTimerRef.current);
        reverseTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function liftPin() {
    if (isLiftedRef.current) return;
    isLiftedRef.current = true;
    Animated.spring(pinLift, {
      toValue: -PIN_LIFT_PX,
      useNativeDriver: true,
      damping: 16,
      stiffness: 260,
    }).start();
  }

  function dropPin() {
    if (!isLiftedRef.current) return;
    isLiftedRef.current = false;
    Animated.spring(pinLift, {
      toValue: 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 240,
    }).start();
  }

  const scheduleReverseGeocode = useCallback((latitude: number, longitude: number) => {
    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    reverseTimerRef.current = setTimeout(async () => {
      const mySeq = ++reverseSeqRef.current;
      setIsResolvingAddress(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mySeq === reverseSeqRef.current) {
            setCurrentAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
          return;
        }
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (mySeq !== reverseSeqRef.current) return;
        const label = results[0]
          ? formatAddress(results[0], latitude, longitude)
          : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setCurrentAddress(label);
      } catch {
        if (mySeq === reverseSeqRef.current) {
          setCurrentAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
      } finally {
        if (mySeq === reverseSeqRef.current) setIsResolvingAddress(false);
      }
    }, REVERSE_DEBOUNCE_MS);
  }, []);

  function handleRegionChange() {
    liftPin();
  }

  function handleRegionChangeComplete(r: Region) {
    centerRef.current = { latitude: r.latitude, longitude: r.longitude };
    dropPin();
    scheduleReverseGeocode(r.latitude, r.longitude);
  }

  function handleConfirm() {
    const { latitude, longitude } = centerRef.current;
    const label = currentAddress ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    onConfirm({ latitude, longitude, label });
  }

  async function handleRecenter() {
    if (!permissionGranted) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setPermissionGranted(true);
    }
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const target = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(target, 500);
    } catch {
      /* ignore */
    }
  }

  async function handleSearchSubmit() {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    Keyboard.dismiss();
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const matches = await Location.geocodeAsync(q);
      if (matches.length === 0) {
        setSearchResults([]);
        setSearchError('No matches');
        return;
      }
      const top = matches.slice(0, 5);
      // Reverse-geocode each result for a readable address; tolerate failures.
      const enriched = await Promise.all(
        top.map(async (m) => {
          try {
            const r = await Location.reverseGeocodeAsync({
              latitude: m.latitude,
              longitude: m.longitude,
            });
            const label = r[0]
              ? formatAddress(r[0], m.latitude, m.longitude)
              : `${m.latitude.toFixed(5)}, ${m.longitude.toFixed(5)}`;
            return { latitude: m.latitude, longitude: m.longitude, label } as SearchResult;
          } catch {
            return {
              latitude: m.latitude,
              longitude: m.longitude,
              label: `${m.latitude.toFixed(5)}, ${m.longitude.toFixed(5)}`,
            } as SearchResult;
          }
        }),
      );
      // De-duplicate by label so iOS' multi-candidate variants collapse.
      const seen = new Set<string>();
      const deduped = enriched.filter((r) => {
        if (seen.has(r.label)) return false;
        seen.add(r.label);
        return true;
      });
      setSearchResults(deduped);
    } catch {
      setSearchError("Couldn't search. Check your connection.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectResult(r: SearchResult) {
    setSearchResults([]);
    setSearchQuery(r.label);
    setHasSearched(false);
    setCurrentAddress(r.label);
    centerRef.current = { latitude: r.latitude, longitude: r.longitude };
    mapRef.current?.animateToRegion(
      {
        latitude: r.latitude,
        longitude: r.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  }

  function handleClearSearch() {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
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
          backgroundColor: colors.surface.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitle: {
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.lg,
          color: colors.text.primary,
        },
        searchWrapper: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.sm,
          backgroundColor: colors.surface.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        searchBar: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          height: 44,
          paddingHorizontal: SPACING.md,
          borderRadius: RADII.full,
          backgroundColor: colors.surface.base,
          borderWidth: 1,
          borderColor: colors.border,
        },
        searchInput: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 0,
        },
        searchResultsDropdown: {
          position: 'absolute',
          top: 44 + SPACING.md + SPACING.sm,
          left: SPACING.lg,
          right: SPACING.lg,
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: colors.border,
          ...SHADOWS.card,
          maxHeight: 260,
          zIndex: 20,
        },
        searchResultRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        searchResultLabel: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        searchEmpty: {
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        },
        searchEmptyText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
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
        pinShadow: {
          position: 'absolute',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          top: '50%',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          left: '50%',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginLeft: -5,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: -2,
          width: 10,
          height: 4,
          borderRadius: RADII.full,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(0,0,0,0.35)',
        },
        recenterFab: {
          position: 'absolute',
          right: SPACING.lg,
          width: 44,
          height: 44,
          borderRadius: RADII.full,
          backgroundColor: colors.surface.card,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          ...SHADOWS.card,
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
        addressBlock: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          minHeight: 44,
          marginBottom: SPACING.sm,
        },
        addressIcon: {
          width: 32,
          height: 32,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(185,255,59,0.18)',
        },
        addressTextWrap: {
          flex: 1,
        },
        addressPrimary: {
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.md,
          color: colors.text.primary,
        },
        addressSecondary: {
          fontFamily: FONT_FAMILY.body.regular,
          fontSize: FONT_SIZE.sm,
          color: colors.text.secondary,
          marginTop: 2,
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
    [colors, isDark],
  );

  const headerStyle = useMemo(
    () => [styles.header, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.md }],
    [styles.header, insets.top],
  );

  const confirmBarStyle = useMemo(
    () => [styles.confirmBar, { paddingBottom: insets.bottom + SPACING.lg }],
    [styles.confirmBar, insets.bottom],
  );

  const showResultsDropdown =
    isSearching || hasSearched || searchResults.length > 0 || Boolean(searchError);

  const { latitude: centerLat, longitude: centerLng } = centerRef.current;

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

        {/* Search input */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              placeholder="Search a place or address"
              placeholderTextColor={colors.text.secondary}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="words"
              accessibilityLabel="Search for a place"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={handleClearSearch}
                hitSlop={8}
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Search results dropdown */}
        {showResultsDropdown ? (
          <View style={styles.searchResultsDropdown}>
            {isSearching ? (
              <View style={styles.searchEmpty}>
                <ActivityIndicator size="small" color={colors.text.secondary} />
                <Text style={styles.searchEmptyText}>Searching…</Text>
              </View>
            ) : searchError ? (
              <View style={styles.searchEmpty}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.searchEmptyText}>{searchError}</Text>
              </View>
            ) : (
              <FlatList<SearchResult>
                data={searchResults}
                keyExtractor={(item, idx) => `${item.latitude},${item.longitude}-${idx}`}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultRow}
                    onPress={() => handleSelectResult(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${item.label}`}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={colors.interactive.accent}
                    />
                    <Text style={styles.searchResultLabel} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        ) : null}

        {/* Map + center pin overlay */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            {...(Platform.OS === 'android'
              ? { customMapStyle: DARK_MAP_STYLE }
              : { userInterfaceStyle: 'dark' })}
            initialRegion={DEFAULT_REGION}
            showsUserLocation={permissionGranted}
            showsMyLocationButton={false}
            onRegionChange={handleRegionChange}
            onRegionChangeComplete={handleRegionChangeComplete}
          />

          {/* Drop-shadow under the pin (stays put while pin lifts) */}
          <View style={styles.pinShadow} pointerEvents="none" />

          {/* Animated center pin */}
          <Animated.View
            style={[styles.pinContainer, { transform: [{ translateY: pinLift }] }]}
            pointerEvents="none"
            accessibilityLabel="Drag map to adjust pin location"
          >
            <Ionicons name="location" size={36} color={colors.interactive.accent} />
          </Animated.View>

          {/* My-location FAB */}
          <TouchableOpacity
            style={[styles.recenterFab, { bottom: SPACING.lg }]}
            onPress={handleRecenter}
            accessibilityRole="button"
            accessibilityLabel="Center on my location"
            activeOpacity={0.85}
          >
            <Ionicons name="locate" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Confirm bar with live address */}
        <View style={confirmBarStyle}>
          <View style={styles.addressBlock}>
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={18} color={colors.interactive.accent} />
            </View>
            <View style={styles.addressTextWrap}>
              {isResolvingAddress && !currentAddress ? (
                <Text style={styles.addressPrimary}>Finding address…</Text>
              ) : (
                <Text style={styles.addressPrimary} numberOfLines={2}>
                  {currentAddress ?? 'Drag the map to pick a spot'}
                </Text>
              )}
              <Text style={styles.addressSecondary} numberOfLines={1}>
                {centerLat.toFixed(5)}, {centerLng.toFixed(5)}
                {isResolvingAddress && currentAddress ? ' · updating…' : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            accessibilityLabel="Confirm selected location"
          >
            <Text style={styles.confirmButtonText}>{'Confirm location'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
