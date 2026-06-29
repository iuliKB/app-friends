import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING, RADII, FONT_SIZE, FONT_FAMILY, SHADOWS, ANIMATION } from '@/theme';
import { DARK_MAP_STYLE } from '@/lib/maps';
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
import { EventArtwork, formatEventLabels } from '@/components/plans/EventArtwork';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_GAP } from '@/components/common/CustomTabBar';
import type { PlanWithMembers } from '@/types/plans';

interface ExploreMapViewProps {
  plans: PlanWithMembers[];
  onCreatePlan?: () => void;
}

// Fallback when location permission is denied — a city-wide view of Toronto.
const DEFAULT_REGION: Region = {
  latitude: 43.6532,
  longitude: -79.3832,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// Tight, "near me" zoom used for the initial user-centered region and recenter.
const CLOSE_DELTA = 0.02;

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2, 320);
const CARD_GAP = SPACING.md;
const CARD_SNAP = CARD_WIDTH + CARD_GAP;

// Pin (image thumbnail) sizing.
const PIN_SIZE = 44;

const MIN_SEARCH_CHARS = 2;

// Unified row for the dropdown — autocomplete suggestions (coords resolved on
// tap), category-chip results, and recents (coords already known).
interface SearchRow {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  distanceMeters?: number | null;
  types?: string[];
  coords?: { latitude: number; longitude: number };
}

export function ExploreMapView({ plans, onCreatePlan }: ExploreMapViewProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const carouselRef = useRef<FlatList<PlanWithMembers> | null>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [listVisible, setListVisible] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Suppress map→carousel sync during a programmatic scroll triggered by pin tap.
  const suppressScrollSyncRef = useRef(false);

  // Place search (Google Places autocomplete) — recenters the map on a result.
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    suggestions,
    loading: isSearching,
    select: selectPlace,
    reset: resetSearch,
  } = usePlaceAutocomplete({ near: userLocation });

  const { recents, addRecent } = useRecentPlaces();
  const planLocations = useRecentPlanLocations();
  const [searchFocused, setSearchFocused] = useState(false);

  // Center for chip search / autocomplete bias — fall back to the default region.
  const searchCenter = useMemo(
    () =>
      userLocation ?? {
        latitude: DEFAULT_REGION.latitude,
        longitude: DEFAULT_REGION.longitude,
      },
    [userLocation]
  );

  // "Recent" chip markers: previously-picked places + distinct past plan spots,
  // de-duplicated by place id. Recents come first (most recent intent).
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
  } = useCategorySearch({ near: searchCenter, recentMarkers });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionGranted(false);
        setIsLoadingLocation(false);
        return;
      }
      setPermissionGranted(true);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setIsLoadingLocation(false);
    })();
  }, []);

  // All plans with coordinates. The search bar navigates the map (Places
  // autocomplete) rather than filtering this list, so every plan stays pinned.
  const visiblePlans = useMemo(
    () => plans.filter((p) => p.latitude != null && p.longitude != null),
    [plans]
  );

  // Reset selected index whenever the visible list shrinks.
  useEffect(() => {
    if (selectedIndex >= visiblePlans.length) {
      setSelectedIndex(0);
    }
  }, [visiblePlans.length, selectedIndex]);

  const initialRegion = useMemo<Region>(() => {
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: CLOSE_DELTA,
        longitudeDelta: CLOSE_DELTA,
      };
    }
    return DEFAULT_REGION;
  }, [userLocation]);

  const animateMapToPlan = useCallback((plan: PlanWithMembers) => {
    if (plan.latitude == null || plan.longitude == null) return;
    mapRef.current?.animateToRegion(
      {
        latitude: plan.latitude,
        longitude: plan.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      350
    );
  }, []);

  const handleRecenter = useCallback(() => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: CLOSE_DELTA,
        longitudeDelta: CLOSE_DELTA,
      },
      400
    );
  }, [userLocation]);

  const handlePinPress = useCallback(
    (plan: PlanWithMembers, index: number) => {
      if (index < 0) return;
      setSelectedIndex(index);
      animateMapToPlan(plan);
      if (!listVisible) setListVisible(true);
      suppressScrollSyncRef.current = true;
      // Defer to next frame so the FlatList layout exists if we just showed it.
      requestAnimationFrame(() => {
        carouselRef.current?.scrollToOffset({ offset: index * CARD_SNAP, animated: true });
        // Release the lock once the scroll animation has had time to settle.
        setTimeout(() => {
          suppressScrollSyncRef.current = false;
        }, 450);
      });
    },
    [animateMapToPlan, listVisible]
  );

  const handleCarouselMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (suppressScrollSyncRef.current) return;
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / CARD_SNAP);
      const clamped = Math.max(0, Math.min(idx, visiblePlans.length - 1));
      if (clamped === selectedIndex) return;
      setSelectedIndex(clamped);
      const plan = visiblePlans[clamped];
      if (plan) animateMapToPlan(plan);
    },
    [animateMapToPlan, selectedIndex, visiblePlans]
  );

  const handleOpenPlan = useCallback(
    (planId: string) => {
      router.push(`/plans/${planId}` as never);
    },
    [router]
  );

  const handleSelectRow = useCallback(
    async (row: SearchRow) => {
      Keyboard.dismiss();
      setSearchFocused(false);
      let coords = row.coords;
      let label = row.primaryText;
      let secondary = row.secondaryText;
      if (!coords) {
        const loc = await selectPlace(row.placeId);
        if (!loc) return;
        coords = { latitude: loc.latitude, longitude: loc.longitude };
        label = loc.label;
        secondary = loc.address ?? row.secondaryText;
      }
      setSearchQuery(label);
      clearCategory();
      const recent: RecentPlace = {
        placeId: row.placeId,
        primaryText: label,
        secondaryText: secondary,
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      addRecent(recent);
      mapRef.current?.animateToRegion(
        {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: CLOSE_DELTA,
          longitudeDelta: CLOSE_DELTA,
        },
        450
      );
    },
    [selectPlace, setSearchQuery, addRecent, clearCategory]
  );

  // Chip tap → resolve markers (Nearby Search or Recent) and drop them on the
  // map. Camera is fit to the results by the effect below. No list, no modal.
  const handleChipPress = useCallback(
    (categoryType: string) => {
      Keyboard.dismiss();
      setSearchQuery('');
      void selectCategory(categoryType);
    },
    [selectCategory, setSearchQuery]
  );

  // "Create plan here" from a result callout — deep-link plan-create prefilled.
  const handleCreatePlanHere = useCallback(
    (marker: PlaceMarker) => {
      router.push({
        pathname: '/plan-create',
        params: {
          lat: String(marker.latitude),
          lng: String(marker.longitude),
          location: marker.primaryText,
        },
      } as never);
    },
    [router]
  );

  const handleClearSearch = useCallback(() => {
    resetSearch();
    clearCategory();
  }, [resetSearch, clearCategory]);

  // Fit the camera to category/Recent results whenever they change.
  useEffect(() => {
    if (categoryResults.length === 0) return;
    if (categoryResults.length === 1) {
      const only = categoryResults[0]!;
      mapRef.current?.animateToRegion(
        {
          latitude: only.latitude,
          longitude: only.longitude,
          latitudeDelta: CLOSE_DELTA,
          longitudeDelta: CLOSE_DELTA,
        },
        450
      );
      return;
    }
    mapRef.current?.fitToCoordinates(
      categoryResults.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
      {
        edgePadding: { top: 160, right: 60, bottom: 280, left: 60 },
        animated: true,
      }
    );
  }, [categoryResults]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        map: {
          flex: 1,
        },
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.base,
        },
        // Search bar (top overlay)
        searchWrapper: {
          position: 'absolute',
          top: SPACING.sm,
          left: SPACING.lg,
          right: SPACING.lg,
        },
        searchBar: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          height: 44,
          paddingHorizontal: SPACING.md,
          borderRadius: RADII.full,
          backgroundColor: colors.surface.card,
          borderWidth: 1,
          borderColor: colors.border,
          ...SHADOWS.card,
        },
        searchInput: {
          flex: 1,
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,

          paddingVertical: 0,
        },
        // Category chips
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
          backgroundColor: colors.surface.card,
          borderWidth: 1,
          borderColor: colors.border,
          ...SHADOWS.card,
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
        // Place autocomplete dropdown
        suggestionDropdown: {
          marginTop: SPACING.sm,
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: colors.border,
          ...SHADOWS.card,
          overflow: 'hidden',
        },
        dropdownScroll: {
          maxHeight: 280,
        },
        dropdownStatus: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
        },
        dropdownStatusText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        recentsHeader: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          paddingHorizontal: SPACING.md,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.xs,
        },
        suggestionDistance: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          marginLeft: SPACING.sm,
        },
        suggestionRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        suggestionTextWrap: {
          flex: 1,
        },
        suggestionPrimary: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        suggestionSecondary: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginTop: 1,
        },
        // Round floating action buttons (right column)
        fabColumn: {
          position: 'absolute',
          right: SPACING.lg,
          gap: SPACING.md,
          alignItems: 'flex-end',
        },
        roundFab: {
          width: 48,
          height: 48,
          borderRadius: RADII.full,
          backgroundColor: colors.surface.card,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          ...SHADOWS.card,
        },
        roundFabActive: {
          backgroundColor: colors.interactive.accent,
          borderColor: colors.interactive.accent,
        },
        roundFabAccent: {
          backgroundColor: colors.interactive.accent,
          borderColor: colors.interactive.accent,
          ...SHADOWS.fab,
        },
        roundFabDisabled: {
          opacity: 0.45,
        },
        // Pin (image thumbnail)
        pinWrapper: {
          alignItems: 'center',
        },
        pin: {
          width: PIN_SIZE,
          height: PIN_SIZE,
          borderRadius: RADII.full,
          overflow: 'hidden',
          borderWidth: 2.5,
          borderColor: colors.interactive.accent,
          backgroundColor: colors.surface.card,
          ...SHADOWS.fab,
        },
        pinSelected: {
          borderWidth: 3,
          // Subtle scale handled at the Marker level via inline transform.
        },
        pinImage: {
          width: '100%',
          height: '100%',
        },
        pinFallback: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pinMonogram: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          fontSize: 18,
          fontFamily: FONT_FAMILY.display.bold,
          color: colors.interactive.accent,
        },
        pinTip: {
          width: 0,
          height: 0,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: -2,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: colors.interactive.accent,
        },
        // Carousel
        carouselWrapper: {
          position: 'absolute',
          left: 0,
          right: 0,
        },
        carouselContent: {
          paddingHorizontal: SPACING.lg,
        },
        carouselSeparator: {
          width: CARD_GAP,
        },
        // Card
        card: {
          width: CARD_WIDTH,
          borderRadius: RADII.xl,
          backgroundColor: colors.surface.card,
          overflow: 'hidden',
          borderWidth: isDark ? 0 : 1,
          borderColor: colors.border,
        },
        cardImage: {
          width: '100%',
          height: 130,
        },
        cardInfo: {
          paddingHorizontal: SPACING.md,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.md,
          gap: SPACING.xs,
        },
        cardTitle: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        cardMetaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
        },
        cardMetaAccent: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.interactive.accent,
        },
        cardMeta: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
          flexShrink: 1,
        },
      }),
    [colors, isDark]
  );

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.interactive.accent} size="large" />
      </View>
    );
  }

  // The dropdown is only for typed search + focused recents. Category/Recent
  // chip results render as map markers, never as a list (Google-Maps style).
  const typing = searchQuery.trim().length >= MIN_SEARCH_CHARS;
  const dropdownRows: SearchRow[] = typing
    ? suggestions.map((s) => ({
        placeId: s.placeId,
        primaryText: s.primaryText,
        secondaryText: s.secondaryText,
        distanceMeters: s.distanceMeters,
        types: s.types,
      }))
    : recents.map((r) => ({
        placeId: r.placeId,
        primaryText: r.primaryText,
        secondaryText: r.secondaryText,
        coords: { latitude: r.latitude, longitude: r.longitude },
      }));
  const dropdownLoading = typing ? isSearching : false;
  const showRecentsHeader = !typing && recents.length > 0;
  // Keep the dropdown open while typing (so blur-before-tap can't hide it);
  // recents only show while the field is focused.
  const showDropdown = typing
    ? dropdownLoading || dropdownRows.length > 0
    : searchFocused && recents.length > 0;

  const bottomSafe = insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP;
  const carouselBottom = bottomSafe + SPACING.md;
  // FAB column sits above the carousel when it is visible.
  const fabsBottom = listVisible ? carouselBottom + 230 : bottomSafe + SPACING.md;

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={permissionGranted}
        showsMyLocationButton={false}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        {...(Platform.OS === 'android'
          ? { customMapStyle: DARK_MAP_STYLE }
          : { userInterfaceStyle: 'dark' })}
      >
        {visiblePlans.map((plan, index) => {
          const isSelected = index === selectedIndex;
          const hasImage = Boolean(plan.cover_image_url);
          const monogram = (Array.from(plan.title.trim())[0] ?? '?').toUpperCase();
          return (
            <Marker
              key={plan.id}
              identifier={plan.id}
              coordinate={{ latitude: plan.latitude!, longitude: plan.longitude! }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
              onPress={(e) => {
                e.stopPropagation?.();
                handlePinPress(plan, index);
              }}
            >
              <View
                style={[styles.pinWrapper, isSelected ? { transform: [{ scale: 1.12 }] } : null]}
              >
                <View style={[styles.pin, isSelected && styles.pinSelected]}>
                  {hasImage ? (
                    <Image
                      source={{ uri: plan.cover_image_url! }}
                      style={styles.pinImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.pinFallback}>
                      <Text style={styles.pinMonogram}>{monogram}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.pinTip} />
              </View>
            </Marker>
          );
        })}

        {/* Category / Recent chip results — pins with a "Create plan here" callout */}
        <CategoryResultMarkers
          results={categoryResults}
          actionLabel="Create plan here"
          onAction={handleCreatePlanHere}
        />
      </MapView>

      {/* Search bar */}
      <View style={styles.searchWrapper} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search for a place"
            placeholderTextColor={colors.text.secondary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="words"
            accessibilityLabel="Search for a place"
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.text.secondary} />
          ) : searchQuery.length > 0 || activeCategory ? (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={8}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category chips */}
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
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Suggestions / nearby / recents dropdown */}
        {showDropdown ? (
          <View style={styles.suggestionDropdown}>
            {showRecentsHeader ? <Text style={styles.recentsHeader}>Recent</Text> : null}
            {dropdownLoading && dropdownRows.length === 0 ? (
              <View style={styles.dropdownStatus}>
                <ActivityIndicator size="small" color={colors.text.secondary} />
                <Text style={styles.dropdownStatusText}>Searching…</Text>
              </View>
            ) : dropdownRows.length === 0 && typing ? (
              <View style={styles.dropdownStatus}>
                <Ionicons name="search-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.dropdownStatusText}>No results</Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={styles.dropdownScroll}
                showsVerticalScrollIndicator={false}
              >
                {dropdownRows.map((row) => {
                  const distance = formatDistance(row.distanceMeters);
                  return (
                    <TouchableOpacity
                      key={row.placeId}
                      style={styles.suggestionRow}
                      onPress={() => handleSelectRow(row)}
                      accessibilityRole="button"
                      accessibilityLabel={`Go to ${row.primaryText}`}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={row.coords && !typing ? 'time-outline' : placeTypeIcon(row.types)}
                        size={18}
                        color={colors.interactive.accent}
                      />
                      <View style={styles.suggestionTextWrap}>
                        <Text style={styles.suggestionPrimary} numberOfLines={1}>
                          {row.primaryText}
                        </Text>
                        {row.secondaryText ? (
                          <Text style={styles.suggestionSecondary} numberOfLines={1}>
                            {row.secondaryText}
                          </Text>
                        ) : null}
                      </View>
                      {distance ? <Text style={styles.suggestionDistance}>{distance}</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : null}
      </View>

      {/* Right-column FABs: create plan + list toggle + recenter */}
      <View style={[styles.fabColumn, { bottom: fabsBottom }]}>
        {onCreatePlan ? (
          <TouchableOpacity
            style={[styles.roundFab, styles.roundFabAccent]}
            onPress={onCreatePlan}
            accessibilityRole="button"
            accessibilityLabel="Create a new plan"
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color={colors.surface.base} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.roundFab, listVisible && styles.roundFabActive]}
          onPress={() => setListVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={listVisible ? 'Hide events list' : 'Show events list'}
          activeOpacity={0.85}
        >
          <Ionicons
            name="list"
            size={22}
            color={listVisible ? colors.surface.base : colors.text.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.roundFab,
            !permissionGranted || !userLocation ? styles.roundFabDisabled : null,
          ]}
          onPress={handleRecenter}
          disabled={!permissionGranted || !userLocation}
          accessibilityRole="button"
          accessibilityLabel="Center on my location"
          activeOpacity={0.85}
        >
          <Ionicons name="locate" size={22} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Horizontal carousel of upcoming events */}
      {listVisible && visiblePlans.length > 0 ? (
        <View style={[styles.carouselWrapper, { bottom: carouselBottom }]}>
          <FlatList<PlanWithMembers>
            ref={carouselRef}
            data={visiblePlans}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_SNAP}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
            ItemSeparatorComponent={() => <View style={styles.carouselSeparator} />}
            onMomentumScrollEnd={handleCarouselMomentumEnd}
            renderItem={({ item }) => (
              <MapEventCard
                plan={item}
                cardWidth={CARD_WIDTH}
                style={styles.card}
                imageStyle={styles.cardImage}
                infoStyle={styles.cardInfo}
                titleStyle={styles.cardTitle}
                metaRowStyle={styles.cardMetaRow}
                metaAccentStyle={styles.cardMetaAccent}
                metaStyle={styles.cardMeta}
                secondaryColor={colors.text.secondary}
                accentColor={colors.interactive.accent}
                onPress={() => handleOpenPlan(item.id)}
              />
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

// Compact map carousel card — visually adjacent to EventCard but tuned for
// the floating-over-map context: bolder image area on top, dense info block.
interface MapEventCardProps {
  plan: PlanWithMembers;
  cardWidth: number;
  style: object;
  imageStyle: object;
  infoStyle: object;
  titleStyle: object;
  metaRowStyle: object;
  metaAccentStyle: object;
  metaStyle: object;
  secondaryColor: string;
  accentColor: string;
  onPress: () => void;
}

function MapEventCard({
  plan,
  style,
  imageStyle,
  infoStyle,
  titleStyle,
  metaRowStyle,
  metaAccentStyle,
  metaStyle,
  secondaryColor,
  accentColor,
  onPress,
}: MapEventCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const labels = formatEventLabels(plan.scheduled_for);

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
      isInteraction: false,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1.0,
      useNativeDriver: true,
      damping: ANIMATION.easing.spring.damping,
      stiffness: ANIMATION.easing.spring.stiffness,
      isInteraction: false,
    }).start();
  }

  const a11yLabel = [
    plan.title,
    labels ? `${labels.date} at ${labels.time}` : '',
    plan.location ?? '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1.0}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        <View style={imageStyle}>
          <EventArtwork
            plan={plan}
            height={130}
            showDateBadge={false}
            showRelativePill={true}
            monogramSize={56}
          />
        </View>
        <View style={infoStyle}>
          <Text style={titleStyle} numberOfLines={1}>
            {plan.title}
          </Text>
          {labels ? (
            <View style={metaRowStyle}>
              <Ionicons name="calendar-outline" size={14} color={accentColor} />
              <Text style={metaAccentStyle} numberOfLines={1}>
                {labels.date} {'·'} {labels.time}
              </Text>
            </View>
          ) : null}
          {plan.location ? (
            <View style={metaRowStyle}>
              <Ionicons name="location-outline" size={14} color={secondaryColor} />
              <Text style={metaStyle} numberOfLines={1}>
                {plan.location}
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
