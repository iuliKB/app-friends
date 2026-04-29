export const LIGHT = {
  // Text
  text: {
    primary: '#1A1D23',      // deep charcoal — readable without the harshness of pure black
    secondary: '#64748B',    // slate-500 — clear hierarchy over base
  },

  // Surfaces
  surface: {
    base: '#F2F3F7',         // warm off-white — airy, not stark; cards visibly float above it
    card: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.06)',
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
