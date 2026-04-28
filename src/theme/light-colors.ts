export const LIGHT = {
  // Text
  text: {
    primary: '#111827',
    secondary: '#6B7280',
  },

  // Surfaces
  surface: {
    base: '#FAFAFA',
    card: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.08)',
  },

  // Interactive
  interactive: {
    accent: '#B9FF3B',       // neon green primary
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

  // Borders
  border: '#E5E7EB',

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
