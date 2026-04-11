import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ViewPreference = 'radar' | 'cards';

const STORAGE_KEY = 'campfire:home_view';
const DEFAULT_VIEW: ViewPreference = 'radar';

export function useViewPreference(): [ViewPreference, (v: ViewPreference) => void, boolean] {
  const [view, setViewState] = useState<ViewPreference>(DEFAULT_VIEW);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'radar' || stored === 'cards') {
          setViewState(stored);
        }
      })
      .catch(() => {
        // Silent: defaults to 'radar'
      })
      .finally(() => setLoading(false));
  }, []);

  const setView = useCallback((v: ViewPreference) => {
    setViewState(v);
    AsyncStorage.setItem(STORAGE_KEY, v).catch(() => {
      console.warn('[useViewPreference] Failed to persist view preference');
    });
  }, []);

  return [view, setView, loading];
}
