import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '@/theme';
import { haversineKm, DARK_MAP_STYLE } from '@/lib/maps';
import type { PlanWithMembers } from '@/types/plans';

interface ExploreMapViewProps {
  plans: PlanWithMembers[];
}

const DEFAULT_REGION = {
  latitude: 43.6532,
  longitude: -79.3832,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export function ExploreMapView({ plans }: ExploreMapViewProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

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

  const visiblePlans = useMemo(() => {
    const withCoords = plans.filter(
      (p) => p.latitude != null && p.longitude != null,
    );
    if (!permissionGranted || !userLocation) return withCoords; // D-17: no filter if no GPS
    return withCoords.filter(
      (p) =>
        haversineKm(userLocation.latitude, userLocation.longitude, p.latitude!, p.longitude!) <= 25,
    );
  }, [plans, permissionGranted, userLocation]);

  const initialRegion = useMemo(() => {
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

  const styles = useMemo(() => StyleSheet.create({
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
  }), [colors]);

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.interactive.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={permissionGranted}
        showsMyLocationButton={false}
        provider={PROVIDER_GOOGLE}
        customMapStyle={DARK_MAP_STYLE}
      >
        {visiblePlans.map((plan) => (
          <Marker
            key={plan.id}
            identifier={plan.id}
            coordinate={{ latitude: plan.latitude!, longitude: plan.longitude! }}
            pinColor={colors.interactive.accent}
            tracksViewChanges={false}
            onPress={() => router.push(`/plans/${plan.id}` as never)}
          />
        ))}
      </MapView>
    </View>
  );
}
