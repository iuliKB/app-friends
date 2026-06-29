import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
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
import { usePlaceAutocomplete } from '@/hooks/usePlaceAutocomplete';
import { useRecentPlaces, type RecentPlace } from '@/hooks/useRecentPlaces';
import { useRecentPlanLocations } from '@/hooks/useRecentPlanLocations';
import { useCategorySearch } from '@/hooks/useCategorySearch';
import { CategoryResultMarkers } from '@/components/maps/CategoryResultMarkers';
import {
  formatDistance,
  placeTypeIcon,
  PLACE_CATEGORIES,
  type PlaceMarker,
} from '@/lib/placeDisplay';
import type { PlaceSuggestion } from '@/lib/places';

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
  // Measured height of the confirm bar so the recenter FAB can sit above it
  // (the confirm bar is an absolute bottom:0 overlay that would otherwise hide it).
  const [confirmBarHeight, setConfirmBarHeight] = useState(0);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  // Reactive copy of the map center so the autocomplete bias actually tracks
  // where the user is looking (a ref alone never re-renders the hook).
  const [biasCenter, setBiasCenter] = useState<{ latitude: number; longitude: number }>({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });

  const { recents, addRecent } = useRecentPlaces();
  const planLocations = useRecentPlanLocations();

  // "Recent" chip markers: recent picks + distinct past plan spots (dedup by id).
  const recentMarkers = useMemo<PlaceMarker[]>(() => {
    const fromRecents: PlaceMarker[] = recents.map((r) => ({
      placeId: r.placeId,
      primaryText: r.primaryText,
      secondaryText: r.secondaryText,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
    const seen = new Set(fromRecents.map((m) => m.placeId));
    const merged = [...fromRecents];
    for (const p of planLocations) {
      if (seen.has(p.placeId)) continue;
      seen.add(p.placeId);
      merged.push(p);
    }
    return merged;
  }, [recents, planLocations]);

  const {
    activeCategory,
    results: categoryResults,
    loading: nearbyLoading,
    selectCategory,
    clear: clearCategory,
  } = useCategorySearch({ near: biasCenter, recentMarkers });

  // Place search (Google Places autocomplete), biased toward the current map center.
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    suggestions,
    loading: isSearching,
    error: searchError,
    select: selectPlace,
    reset: resetSearch,
  } = usePlaceAutocomplete({ near: biasCenter });

  // Reset state and animate to GPS each time the modal opens.
  useEffect(() => {
    if (!visible) return;
    centerRef.current = {
      latitude: DEFAULT_REGION.latitude,
      longitude: DEFAULT_REGION.longitude,
    };
    setBiasCenter({ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude });
    setCurrentAddress(null);
    setIsResolvingAddress(false);
    resetSearch();
    clearCategory();
    isLiftedRef.current = false;
    pinLift.setValue(0);

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setPermissionGranted(granted);
      if (!granted) return;
      try {
        // Snap to the cached last-known position first (near-instant) so the
        // map doesn't linger on the Toronto fallback while GPS resolves.
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          const lastTarget = {
            latitude: last.coords.latitude,
            longitude: last.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          centerRef.current = { latitude: lastTarget.latitude, longitude: lastTarget.longitude };
          setBiasCenter({ latitude: lastTarget.latitude, longitude: lastTarget.longitude });
          mapRef.current?.animateToRegion(lastTarget, 300);
        }

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
        setBiasCenter({ latitude: target.latitude, longitude: target.longitude });
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
    setBiasCenter({ latitude: r.latitude, longitude: r.longitude });
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

  function moveTo(latitude: number, longitude: number) {
    centerRef.current = { latitude, longitude };
    setBiasCenter({ latitude, longitude });
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500
    );
  }

  async function handleSelectSuggestion(suggestion: PlaceSuggestion) {
    Keyboard.dismiss();
    setSearchFocused(false);
    const loc = await selectPlace(suggestion.placeId);
    if (!loc) return;
    clearCategory();
    setSearchQuery(loc.label);
    setCurrentAddress(loc.address ?? loc.label);
    moveTo(loc.latitude, loc.longitude);
    addRecent({
      placeId: suggestion.placeId,
      primaryText: loc.label,
      secondaryText: loc.address ?? suggestion.secondaryText,
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
  }

  // Recents already hold coordinates — no Place Details call (no billing).
  function handleSelectRecent(recent: RecentPlace) {
    Keyboard.dismiss();
    setSearchFocused(false);
    resetSearch();
    clearCategory();
    setSearchQuery(recent.primaryText);
    setCurrentAddress(recent.secondaryText || recent.primaryText);
    moveTo(recent.latitude, recent.longitude);
    addRecent(recent);
  }

  // Chip tap → drop category/Recent markers on the map (no list, no new screen).
  function handleChipPress(categoryType: string) {
    Keyboard.dismiss();
    setSearchFocused(false);
    void selectCategory(categoryType);
  }

  // "Use this location" from a result callout — confirm with that place directly.
  function handleUseLocation(marker: PlaceMarker) {
    addRecent({
      placeId: marker.placeId,
      primaryText: marker.primaryText,
      secondaryText: marker.secondaryText,
      latitude: marker.latitude,
      longitude: marker.longitude,
    });
    onConfirm({
      latitude: marker.latitude,
      longitude: marker.longitude,
      label: marker.primaryText,
    });
  }

  // Fit the camera to category/Recent results whenever they change.
  useEffect(() => {
    if (categoryResults.length === 0) return;
    if (categoryResults.length === 1) {
      const only = categoryResults[0]!;
      moveTo(only.latitude, only.longitude);
      return;
    }
    mapRef.current?.fitToCoordinates(
      categoryResults.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
      { edgePadding: { top: 180, right: 60, bottom: 240, left: 60 }, animated: true }
    );
  }, [categoryResults]);

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

          paddingVertical: 0,
        },
        chipsScroll: {
          marginTop: SPACING.sm,
          flexGrow: 0,
        },
        chipsRow: {
          gap: SPACING.sm,
          paddingRight: SPACING.lg,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          height: 34,
          paddingHorizontal: SPACING.md,
          borderRadius: RADII.full,
          backgroundColor: colors.surface.base,
          borderWidth: 1,
          borderColor: colors.border,
        },
        chipActive: {
          backgroundColor: colors.interactive.accent,
          borderColor: colors.interactive.accent,
        },
        chipText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.primary,
        },
        chipTextActive: {
          color: colors.surface.base,
        },
        searchResultsDropdown: {
          position: 'absolute',
          // Below the search bar + the chip row (chip height 34 + its top margin).
          top: 44 + SPACING.md + SPACING.sm + 34 + SPACING.sm,
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
        searchResultTextWrap: {
          flex: 1,
        },
        searchResultLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        searchResultSecondary: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginTop: 1,
        },
        searchResultDistance: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          marginLeft: SPACING.sm,
        },
        recentsHeader: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          paddingHorizontal: SPACING.md,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.xs,
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

          top: '50%',

          left: '50%',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginLeft: -18,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: -36,
        },
        pinShadow: {
          position: 'absolute',

          top: '50%',

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
          // eslint-disable-next-line campfire/no-hardcoded-styles
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
    [colors, isDark]
  );

  const headerStyle = useMemo(
    () => [styles.header, { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.md }],
    [styles.header, insets.top]
  );

  const confirmBarStyle = useMemo(
    () => [styles.confirmBar, { paddingBottom: insets.bottom + SPACING.lg }],
    [styles.confirmBar, insets.bottom]
  );

  const typing = searchQuery.trim().length >= 2;
  const showRecents = !typing && searchFocused && recents.length > 0;
  const showNoResults = typing && !isSearching && !searchError && suggestions.length === 0;
  const showResultsDropdown =
    isSearching || suggestions.length > 0 || Boolean(searchError) || showRecents || showNoResults;

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
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
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
              <TouchableOpacity onPress={resetSearch} hitSlop={8} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Category chips — drop matching pins on the map (Google-Maps style) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            {PLACE_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.type;
              return (
                <TouchableOpacity
                  key={cat.type}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => handleChipPress(cat.type)}
                  accessibilityRole="button"
                  accessibilityLabel={cat.label}
                  activeOpacity={0.8}
                >
                  {active && nearbyLoading ? (
                    <ActivityIndicator size="small" color={colors.surface.base} />
                  ) : (
                    <Ionicons
                      name={cat.icon}
                      size={15}
                      color={active ? colors.surface.base : colors.text.primary}
                    />
                  )}
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
            ) : showNoResults ? (
              <View style={styles.searchEmpty}>
                <Ionicons name="search-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.searchEmptyText}>No results</Text>
              </View>
            ) : showRecents ? (
              <FlatList<RecentPlace>
                data={recents}
                keyExtractor={(item) => item.placeId}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={<Text style={styles.recentsHeader}>Recent</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultRow}
                    onPress={() => handleSelectRecent(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${item.primaryText}`}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.interactive.accent} />
                    <View style={styles.searchResultTextWrap}>
                      <Text style={styles.searchResultLabel} numberOfLines={1}>
                        {item.primaryText}
                      </Text>
                      {item.secondaryText ? (
                        <Text style={styles.searchResultSecondary} numberOfLines={1}>
                          {item.secondaryText}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <FlatList<PlaceSuggestion>
                data={suggestions}
                keyExtractor={(item) => item.placeId}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const distance = formatDistance(item.distanceMeters);
                  return (
                    <TouchableOpacity
                      style={styles.searchResultRow}
                      onPress={() => handleSelectSuggestion(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Choose ${item.primaryText}`}
                    >
                      <Ionicons
                        name={placeTypeIcon(item.types)}
                        size={18}
                        color={colors.interactive.accent}
                      />
                      <View style={styles.searchResultTextWrap}>
                        <Text style={styles.searchResultLabel} numberOfLines={1}>
                          {item.primaryText}
                        </Text>
                        {item.secondaryText ? (
                          <Text style={styles.searchResultSecondary} numberOfLines={1}>
                            {item.secondaryText}
                          </Text>
                        ) : null}
                      </View>
                      {distance ? (
                        <Text style={styles.searchResultDistance}>{distance}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
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
          >
            {/* Category / Recent chip results — pins with a "Use this location" callout */}
            <CategoryResultMarkers
              results={categoryResults}
              actionLabel="Use this location"
              onAction={handleUseLocation}
            />
          </MapView>

          {/* Center "drag to pick" pin — hidden while browsing chip results, which
              are chosen via their callout instead. */}
          {categoryResults.length === 0 ? (
            <>
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
            </>
          ) : null}
        </View>

        {/* Confirm bar with live address */}
        <View
          style={confirmBarStyle}
          onLayout={(e) => setConfirmBarHeight(e.nativeEvent.layout.height)}
        >
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

        {/* My-location FAB — rendered after (above) the confirm bar so it isn't
            hidden behind it, and lifted to sit just above the bar. */}
        <TouchableOpacity
          style={[styles.recenterFab, { bottom: confirmBarHeight + SPACING.md }]}
          onPress={handleRecenter}
          accessibilityRole="button"
          accessibilityLabel="Center on my location"
          activeOpacity={0.85}
        >
          <Ionicons name="locate" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
