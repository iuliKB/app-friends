export const COLORS = {
  // Text
  text: {
    primary: '#F5F5F5',
    secondary: '#9CA3AF',
  },

  // Surfaces
  surface: {
    base: '#0E0F11',
    card: '#1D2027',
    overlay: '#ffffff14',
  },

  // Interactive
  interactive: {
    accent: '#B9FF3B',       // neon green primary
    destructive: '#F87171',
  },

  // Feedback / indicators
  feedback: {
    info: '#3b82f6',
    error: '#F87171',
  },

  // Status
  status: {
    free: '#4ADE80',
    busy: '#F87171',
    maybe: '#FACC15',
  },

  // Borders
  border: '#1E2128',

  // Overlays
  overlay: 'rgba(0,0,0,0.5)',

  // Shadows
  shadow: '#000000',

  // Card elevation — zero in dark mode because #1D2027 on #0E0F11 already provides
  // visible depth through colour contrast. Shadows on dark backgrounds are invisible.
  cardElevation: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  // Offline banner
  offline: {
    bg: '#1a2e05',
    text: '#d9f99d',
  },

  // Splash
  splash: {
    gradientStart: '#B9FF3B',
    gradientEnd: '#8DFF2F',
    text: '#0E0F11',
  },

  // Auth / Welcome ember gradient — used as backdrop for unauthenticated screens.
  // Tuple order matches LinearGradient's `colors` prop.
  authGradient: {
    colors: ['#091A07', '#0E0F11', '#0A0C0E'] as readonly [string, string, string],
    locations: [0, 0.45, 1] as readonly [number, number, number],
    start: { x: 1, y: 0 },
    end: { x: 0, y: 0.8 },
  },
} as const;
