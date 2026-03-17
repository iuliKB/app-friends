export const COLORS = {
  // Brand
  accent: '#f97316', // Campfire orange — primary interactive elements
  dominant: '#1a1a1a', // App background
  secondary: '#2a2a2a', // Cards, input backgrounds, tab bar
  destructive: '#ef4444', // Inline errors, destructive actions

  // Status colors (used from Phase 2 onward, defined here for consistency)
  status: {
    free: '#22c55e',
    busy: '#ef4444',
    maybe: '#eab308',
  },

  // Text
  textPrimary: '#f5f5f5',
  textSecondary: '#9ca3af',

  // Borders & surfaces
  border: '#3f3f46',
  surfaceOverlay: '#ffffff14',

  // Offline banner
  offlineBg: '#92400e',
  offlineText: '#fef3c7',

  // Splash
  splashGradientStart: '#ff6b35',
  splashGradientEnd: '#dc2626',
  splashText: '#fef3c7',
} as const;
