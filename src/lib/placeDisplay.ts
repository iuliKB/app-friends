import type * as React from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Human-readable distance, e.g. "850 m" or "2.4 km". */
export function formatDistance(meters?: number | null): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

// Maps a Places type to an Ionicon. Ordered by specificity — first match wins.
const TYPE_ICONS: [string, IoniconName][] = [
  ['restaurant', 'restaurant-outline'],
  ['cafe', 'cafe-outline'],
  ['bar', 'wine-outline'],
  ['lodging', 'bed-outline'],
  ['hotel', 'bed-outline'],
  ['park', 'leaf-outline'],
  ['gas_station', 'car-outline'],
  ['parking', 'car-outline'],
  ['gym', 'barbell-outline'],
  ['shopping_mall', 'cart-outline'],
  ['store', 'cart-outline'],
  ['supermarket', 'cart-outline'],
  ['school', 'school-outline'],
  ['hospital', 'medkit-outline'],
  ['airport', 'airplane-outline'],
  ['train_station', 'train-outline'],
  ['transit_station', 'train-outline'],
  ['country', 'earth-outline'],
  ['administrative_area_level_1', 'map-outline'],
  ['locality', 'business-outline'],
];

/** Best icon for a place given its Places types; falls back to a pin. */
export function placeTypeIcon(types?: string[]): IoniconName {
  if (types && types.length) {
    for (const [key, icon] of TYPE_ICONS) {
      if (types.includes(key)) return icon;
    }
  }
  return 'location-outline';
}

/** Category chips shown under the search bar. `type` is a Places primary type. */
export interface PlaceCategory {
  label: string;
  type: string;
  icon: IoniconName;
}

/** Special chip type — surfaces recent picks + past plan locations (no network). */
export const RECENT_CATEGORY = 'recent';

export const PLACE_CATEGORIES: PlaceCategory[] = [
  { label: 'Recent', type: RECENT_CATEGORY, icon: 'time-outline' },
  { label: 'Restaurants', type: 'restaurant', icon: 'restaurant-outline' },
  { label: 'Cafes', type: 'cafe', icon: 'cafe-outline' },
  { label: 'Bars', type: 'bar', icon: 'wine-outline' },
  { label: 'Parks', type: 'park', icon: 'leaf-outline' },
];

/**
 * A point rendered on the map by a category/Recent chip search. Coordinates are
 * already resolved (Nearby Search results, recent picks, or past plan spots).
 */
export interface PlaceMarker {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
  types?: string[];
}
