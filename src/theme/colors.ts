export const COLORS = {
  // Text
  text: {
    primary: '#f5f5f5',
    secondary: '#9ca3af',
  },

  // Surfaces
  surface: {
    base: '#1a1a1a',       // app background (was: dominant)
    card: '#2a2a2a',       // cards, inputs, tab bar (was: secondary)
    overlay: '#ffffff14',  // (was: surfaceOverlay)
  },

  // Interactive
  interactive: {
    accent: '#f97316',      // campfire orange — primary CTA
    destructive: '#ef4444', // inline errors, destructive actions
  },

  // Feedback / indicators
  feedback: {
    info: '#3b82f6',       // notification/indicator blue (was undeclared #3b82f6 in ChatListRow)
    error: '#ef4444',      // same as destructive — semantic alias
  },

  // Status
  status: {
    free: '#22c55e',
    busy: '#ef4444',
    maybe: '#eab308',
  },

  // Borders
  border: '#3f3f46',

  // Shadows
  shadow: '#000000',

  // Offline banner
  offline: {
    bg: '#92400e',
    text: '#fef3c7',
  },

  // Splash
  splash: {
    gradientStart: '#ff6b35',
    gradientEnd: '#dc2626',
    text: '#fef3c7',
  },
} as const;
