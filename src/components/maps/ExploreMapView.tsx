import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Platform,
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
import {
  useTheme,
  SPACING,
  RADII,
  FONT_SIZE,
  FONT_FAMILY,
  SHADOWS,
  ANIMATION,
} from '@/theme';
import { DARK_MAP_STYLE } from '@/lib/maps';
import { EventArtwork, formatEventLabels } from '@/components/plans/EventArtwork';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_GAP } from '@/components/common/CustomTabBar';
import type { PlanWithMembers } from '@/types/plans';

interface ExploreMapViewProps {
  plans: PlanWithMembers[];
}

const DEFAULT_REGION: Region = {
  latitude: 43.6532,
  longitude: -79.3832,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2, 320);
const CARD_GAP = SPACING.md;
const CARD_SNAP = CARD_WIDTH + CARD_GAP;

// Pin (image thumbnail) sizing.
const PIN_SIZE = 44;

export function ExploreMapView({ plans }: ExploreMapViewProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const carouselRef = useRef<FlatList<PlanWithMembers> | null>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [listVisible, setListVisible] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Suppress map→carousel sync during a programmatic scroll triggered by pin tap.
  const suppressScrollSyncRef = useRef(false);

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

  // All plans with coordinates, optionally narrowed by the search query.
  const visiblePlans = useMemo(() => {
    const withCoords = plans.filter((p) => p.latitude != null && p.longitude != null);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return withCoords;
    return withCoords.filter((p) => {
      const inTitle = p.title.toLowerCase().includes(q);
      const inLocation = p.location ? p.location.toLowerCase().includes(q) : false;
      return inTitle || inLocation;
    });
  }, [plans, searchQuery]);

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
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
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
      350,
    );
  }, []);

  const handleRecenter = useCallback(() => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      400,
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
    [animateMapToPlan, listVisible],
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
    [animateMapToPlan, selectedIndex, visiblePlans],
  );

  const handleOpenPlan = useCallback(
    (planId: string) => {
      router.push(`/plans/${planId}` as never);
    },
    [router],
  );

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
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 0,
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
    [colors, isDark],
  );

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.interactive.accent} size="large" />
      </View>
    );
  }

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
                style={[
                  styles.pinWrapper,
                  isSelected ? { transform: [{ scale: 1.12 }] } : null,
                ]}
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
      </MapView>

      {/* Search bar */}
      <View style={styles.searchWrapper} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search events or places"
            placeholderTextColor={colors.text.secondary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search events"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Right-column FABs: list toggle + recenter */}
      <View style={[styles.fabColumn, { bottom: fabsBottom }]}>
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
