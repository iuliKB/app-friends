import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPlaceSuggestions,
  fetchPlaceDetails,
  newSessionToken,
  type PlaceSuggestion,
  type PlaceLocation,
} from '@/lib/places';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;
const CACHE_MAX = 50;

interface Options {
  /** Bias results toward this point (e.g. the user's location). */
  near?: { latitude: number; longitude: number } | null;
}

// Region/admin predictions are pushed below local establishments/addresses so a
// query like "Mac" surfaces nearby places before "Macedonia". We only demote
// true region types — cities (locality) stay where Google ranked them.
const REGION_TYPES = new Set([
  'country',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
]);

function isRegion(s: PlaceSuggestion): boolean {
  const types = s.types ?? [];
  if (types.length === 0) return false;
  const hasRegion = types.some((t) => REGION_TYPES.has(t));
  const hasLocal =
    types.includes('locality') ||
    types.includes('establishment') ||
    types.includes('point_of_interest') ||
    types.includes('premise') ||
    types.includes('street_address');
  return hasRegion && !hasLocal;
}

/** Stable partition: local results first (Google order kept), regions last. */
function rankSuggestions(list: PlaceSuggestion[]): PlaceSuggestion[] {
  const local: PlaceSuggestion[] = [];
  const regions: PlaceSuggestion[] = [];
  for (const s of list) (isRegion(s) ? regions : local).push(s);
  return [...local, ...regions];
}

function roundCoord(n: number): number {
  // ~1 km granularity for cache keys — nearby keystroke bursts share a key.
  return Math.round(n * 100) / 100;
}

/**
 * Debounced Places autocomplete with session-token lifecycle.
 * A session token is created lazily on the first query and reused for every
 * keystroke; selecting a suggestion spends it on the details lookup and ends
 * the session (the next keystroke starts a fresh one). This keeps each search
 * to a single billable Places session.
 */
export function usePlaceAutocomplete(options?: Options) {
  const near = options?.near ?? null;
  const nearLat = near?.latitude ?? null;
  const nearLng = near?.longitude ?? null;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionTokenRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);
  // Set right after a selection so the programmatic setQuery(label) that follows
  // does not re-open the dropdown with a fresh search for the chosen place.
  const skipNextRef = useRef(false);
  // Per-session in-memory cache: `${query}|${lat}|${lng}` -> suggestions.
  const cacheRef = useRef<Map<string, PlaceSuggestion[]>>(new Map());

  const ensureSession = useCallback(() => {
    if (!sessionTokenRef.current) sessionTokenRef.current = newSessionToken();
    return sessionTokenRef.current;
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (skipNextRef.current) {
      // Consume the suppression triggered by a just-completed selection.
      skipNextRef.current = false;
      setLoading(false);
      return;
    }

    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `${q.toLowerCase()}|${nearLat != null ? roundCoord(nearLat) : ''}|${
      nearLng != null ? roundCoord(nearLng) : ''
    }`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const token = ensureSession();
      const myReq = ++reqIdRef.current;
      try {
        const results = await fetchPlaceSuggestions(
          q,
          token,
          nearLat != null && nearLng != null ? { latitude: nearLat, longitude: nearLng } : null
        );
        if (myReq !== reqIdRef.current) return; // a newer request superseded this
        const ranked = rankSuggestions(results);
        // Bound the cache so a long session can't grow without limit.
        if (cacheRef.current.size >= CACHE_MAX) {
          const firstKey = cacheRef.current.keys().next().value;
          if (firstKey !== undefined) cacheRef.current.delete(firstKey);
        }
        cacheRef.current.set(cacheKey, ranked);
        setSuggestions(ranked);
        setError(null);
      } catch {
        if (myReq !== reqIdRef.current) return;
        setSuggestions([]);
        setError("Couldn't search places.");
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, nearLat, nearLng, ensureSession]);

  /** Resolve a suggestion to coordinates and end the current session. */
  const select = useCallback(async (placeId: string): Promise<PlaceLocation | null> => {
    const token = sessionTokenRef.current ?? newSessionToken();
    reqIdRef.current++; // cancel any in-flight autocomplete
    skipNextRef.current = true; // suppress the re-search from setQuery(label)
    try {
      return await fetchPlaceDetails(placeId, token);
    } catch {
      setError("Couldn't load that place.");
      return null;
    } finally {
      sessionTokenRef.current = null; // end billable session
      cacheRef.current.clear(); // a new session starts fresh
      setSuggestions([]);
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    reqIdRef.current++;
    skipNextRef.current = false;
    sessionTokenRef.current = null;
    cacheRef.current.clear();
    setQuery('');
    setSuggestions([]);
    setLoading(false);
    setError(null);
  }, []);

  return { query, setQuery, suggestions, loading, error, select, reset };
}
