import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** A place the user has previously chosen — coordinates already resolved. */
export interface RecentPlace {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
}

const STORAGE_KEY = 'campfire:recent_places';
const MAX_RECENTS = 8;

/**
 * Locally-persisted recent place selections (no network / no billing).
 * Surfaced when the search field is focused and empty, Google-Maps style.
 */
export function useRecentPlaces() {
  const [recents, setRecents] = useState<RecentPlace[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecents(parsed.slice(0, MAX_RECENTS));
      })
      .catch(() => {
        // Silent: defaults to an empty list.
      });
  }, []);

  const addRecent = useCallback((place: RecentPlace) => {
    setRecents((prev) => {
      const deduped = prev.filter((p) => p.placeId !== place.placeId);
      const next = [place, ...deduped].slice(0, MAX_RECENTS);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
        console.warn('[useRecentPlaces] Failed to persist recents');
      });
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
      /* ignore */
    });
  }, []);

  return { recents, addRecent, clearRecents };
}
