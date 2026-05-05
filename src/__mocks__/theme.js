// Lightweight mock for @/theme in Jest tests.
// Provides the same API surface without native module dependencies.

const COLORS = {
  text: { primary: '#000', secondary: '#666' },
  surface: { base: '#fff', card: '#f5f5f5' },
  interactive: { accent: '#007AFF' },
  status: { free: '#34C759', busy: '#FF3B30', maybe: '#FF9500' },
  border: '#e0e0e0',
  feedback: { success: '#34C759', error: '#FF3B30', warning: '#FF9500' },
};

const useTheme = () => ({ colors: COLORS, isDark: false, theme: 'system', setTheme: jest.fn() });

const ThemeProvider = ({ children }) => children;

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
const FONT_SIZE = { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 24, xxxl: 32 };
const FONT_FAMILY = {
  body: { regular: 'System', semibold: 'System' },
  display: { regular: 'System', semibold: 'System', bold: 'System' },
};
const RADII = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, xxl: 24, full: 9999 };
const SHADOW = { sm: {}, md: {}, lg: {} };

const ANIMATION = {
  duration: { fast: 200, normal: 300, slow: 700, verySlow: 1200 },
  easing: {
    standard: () => (t) => t,
    decelerate: () => (t) => t,
    accelerate: () => (t) => t,
    spring: { damping: 15, stiffness: 120 },
  },
};

module.exports = {
  useTheme,
  ThemeProvider,
  SPACING,
  FONT_SIZE,
  FONT_FAMILY,
  RADII,
  SHADOW,
  ANIMATION,
  COLORS,
  DARK: COLORS,
  LIGHT: COLORS,
};
