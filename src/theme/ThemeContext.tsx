import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS as DARK } from './colors';
import { LIGHT } from './light-colors';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'campfire:theme';

type ThemeContextValue = {
  colors: typeof DARK | typeof LIGHT;
  isDark: boolean;
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemeState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEY, t).catch(() =>
      console.warn('[ThemeProvider] Failed to persist theme preference'),
    );
  }, []);

  const effectiveScheme = theme === 'system' ? (systemScheme ?? 'dark') : theme;
  const isDark = effectiveScheme === 'dark';
  const colors = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ colors, isDark, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
