import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Haversine distance between two GPS coordinates, in kilometres.
 * Used for the 25 km Explore map filter (MAP-04, D-16).
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Open the native maps app with a pin at the given coordinates.
 * iOS: maps:// scheme → Apple Maps.
 * Android: geo: scheme → Google Maps (or user's default).
 * MAP-05, D-14.
 */
export async function openInMapsApp(
  lat: number,
  lng: number,
  label: string,
): Promise<void> {
  const encodedLabel = encodeURIComponent(label);
  const url =
    Platform.OS === 'ios'
      ? `maps://?ll=${lat},${lng}&q=${encodedLabel}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

/**
 * Format a reverseGeocodeAsync result into a human-readable label.
 * Format: "123 Main St, Toronto". Falls back to formattedAddress, then raw coords.
 * D-11 (discretion resolved).
 */
export function formatAddress(
  r: Location.LocationGeocodedAddress,
  lat: number,
  lng: number,
): string {
  const streetParts = [r.streetNumber, r.street].filter(Boolean).join(' ');
  const parts = [streetParts, r.city].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return r.formattedAddress ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Google Maps dark style JSON for Android MapView.
 * Applied via customMapStyle prop when provider === PROVIDER_GOOGLE on Android.
 * Source: Google Maps Styling Wizard — standard dark theme.
 * UI-SPEC Section 6.
 */
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#181818' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1b1b1b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8a8a' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#373737' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3c3c3c' }],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [{ color: '#4e4e4e' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3d3d3d' }],
  },
];
