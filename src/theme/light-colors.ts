export const LIGHT = {
  // Text
  text: {
    primary: '#1A1D23',      // deep charcoal — 16.9:1 on white (AAA)
    secondary: '#64748B',    // slate-500 — 4.8:1 on white (AA)
  },

  // Surfaces
  surface: {
    base: '#F5F6F8',         // neutral off-white — cards pop, not cold/blue
    card: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.06)',
  },

  // Interactive
  interactive: {
    // #4D7C00: deep lime — same hue as dark-mode neon, 5.0:1 on white (AA).
    // #B9FF3B is 1.2:1 on white — invisible as text, fluorescent as icon.
    accent: '#4D7C00',
    destructive: '#DC2626',
  },

  // Feedback / indicators
  feedback: {
    info: '#2563EB',
    error: '#DC2626',
  },

  // Status
  status: {
    free: '#16A34A',
    busy: '#DC2626',
    maybe: '#D97706',
  },

  // Borders — bump up from #E5E7EB so card edges are visible on the off-white base
  border: '#D1D5DB',

  // Overlays
  overlay: 'rgba(0,0,0,0.5)',

  // Shadows
  shadow: '#000000',

  // Offline banner
  offline: {
    bg: '#F0FDF4',
    text: '#166534',
  },

  // Splash
  splash: {
    gradientStart: '#B9FF3B',
    gradientEnd: '#8DFF2F',
    text: '#0E0F11',
  },
} as const;
