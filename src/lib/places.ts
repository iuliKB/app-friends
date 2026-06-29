import { supabase } from '@/lib/supabase';

/**
 * Google Places (New) autocomplete, proxied through the `places` Edge Function
 * so the Maps key never ships in the app bundle. Session tokens group a burst
 * of keystrokes + the final details lookup into one billable session.
 */

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  /** Distance from the bias origin in metres, when an origin was provided. */
  distanceMeters?: number | null;
  /** Place types (e.g. ['restaurant','food']) — drives icons + re-ranking. */
  types?: string[];
}

export interface PlaceLocation {
  latitude: number;
  longitude: number;
  label: string;
  address: string | null;
  types?: string[];
}

/** A category-chip (Nearby Search) result — coordinates are already resolved. */
export interface NearbyPlace {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
  types: string[];
}

/** Device language/region for localized, region-appropriate results. */
export function deviceLocale(): { languageCode?: string; regionCode?: string } {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale; // e.g. "en-US"
    const [lang, region] = locale.split('-');
    return { languageCode: lang || undefined, regionCode: region || undefined };
  } catch {
    return {};
  }
}

/** Opaque session token shared across one autocomplete → details interaction. */
export function newSessionToken(): string {
  // RFC4122-ish v4; good enough as a session grouping id.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function fetchPlaceSuggestions(
  input: string,
  sessionToken: string,
  near?: { latitude: number; longitude: number } | null
): Promise<PlaceSuggestion[]> {
  const { languageCode, regionCode } = deviceLocale();
  const { data, error } = await supabase.functions.invoke('places', {
    body: {
      action: 'autocomplete',
      input,
      sessionToken,
      near: near ?? null,
      languageCode: languageCode ?? null,
      regionCode: regionCode ?? null,
    },
  });
  if (error) throw error;
  return (data?.suggestions ?? []) as PlaceSuggestion[];
}

export async function fetchPlaceDetails(
  placeId: string,
  sessionToken: string
): Promise<PlaceLocation> {
  const { data, error } = await supabase.functions.invoke('places', {
    body: { action: 'details', placeId, sessionToken },
  });
  if (error) throw error;
  if (!data || typeof data.latitude !== 'number') {
    throw new Error('Place details unavailable');
  }
  return data as PlaceLocation;
}

/**
 * Category-chip search (Places Nearby Search). Separate billable SKU from the
 * autocomplete session — call sparingly (one request per chip tap).
 */
export async function fetchNearbyPlaces(
  category: string,
  near: { latitude: number; longitude: number }
): Promise<NearbyPlace[]> {
  const { languageCode } = deviceLocale();
  const { data, error } = await supabase.functions.invoke('places', {
    body: { action: 'nearby', category, near, languageCode: languageCode ?? null },
  });
  if (error) throw error;
  return (data?.places ?? []) as NearbyPlace[];
}
