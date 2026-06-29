import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNearbyPlaces } from '@/lib/places';
import { RECENT_CATEGORY, type PlaceMarker } from '@/lib/placeDisplay';

interface Options {
  /** Center for category Nearby Search (the user's location / map center). */
  near: { latitude: number; longitude: number };
  /** Pre-resolved markers for the "Recent" chip (recent picks + plan spots). */
  recentMarkers: PlaceMarker[];
}

/**
 * Drives the Google-Maps-style category chips. Tapping a chip resolves a set of
 * on-map markers (Nearby Search for a real category, or the supplied recents for
 * the "Recent" chip) — never a list or a new screen. Tapping the active chip
 * again clears it. The caller renders `results` as map markers and fits the
 * camera to them.
 */
export function useCategorySearch({ near, recentMarkers }: Options) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [results, setResults] = useState<PlaceMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);

  const clear = useCallback(() => {
    reqRef.current++; // cancel any in-flight nearby search
    setActiveCategory(null);
    setResults([]);
    setLoading(false);
  }, []);

  const selectCategory = useCallback(
    async (type: string) => {
      if (activeCategory === type) {
        clear();
        return;
      }
      setActiveCategory(type);

      if (type === RECENT_CATEGORY) {
        reqRef.current++; // a recent selection supersedes any pending nearby search
        setResults(recentMarkers);
        setLoading(false);
        return;
      }

      setLoading(true);
      const myReq = ++reqRef.current;
      try {
        const places = await fetchNearbyPlaces(type, near);
        if (myReq !== reqRef.current) return;
        setResults(
          places.map((p) => ({
            placeId: p.placeId,
            primaryText: p.primaryText,
            secondaryText: p.secondaryText,
            latitude: p.latitude,
            longitude: p.longitude,
            types: p.types,
          }))
        );
      } catch {
        if (myReq === reqRef.current) setResults([]);
      } finally {
        if (myReq === reqRef.current) setLoading(false);
      }
    },
    [activeCategory, near, recentMarkers, clear]
  );

  // Keep the Recent results live as plan locations / recents load in async.
  useEffect(() => {
    if (activeCategory === RECENT_CATEGORY) setResults(recentMarkers);
  }, [activeCategory, recentMarkers]);

  return { activeCategory, results, loading, selectCategory, clear };
}
