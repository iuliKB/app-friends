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

  // Card elevation — spreads directly onto a StyleSheet style object.
  // Light mode uses real shadows because card (#FFF) vs base (#F5F6F8) are too close
  // to rely on colour contrast alone for depth hierarchy.
  cardElevation: {
    shadowColor: '#1A1D23',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

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

  // Auth / Welcome backdrop — warm pale-lime fade on light off-white surface.
  // Mirrors the dark mode "embers" mood without overwhelming the form contents.
  authGradient: {
    colors: ['#F2FBE5', '#FFFFFF', '#F5F6F8'] as readonly [string, string, string],
    locations: [0, 0.45, 1] as readonly [number, number, number],
    start: { x: 1, y: 0 },
    end: { x: 0, y: 0.8 },
  },
} as const;
