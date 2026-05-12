// StatusCard visual tokens — keyed by [theme][status].
// Component reads from this map; adding a new status is one edit here.
//
// Translation notes from the source CSS brief:
//   - background-size:300% + sunset-shift keyframes → applied at the component
//     level by panning an over-sized LinearGradient layer. Tokens here just
//     describe the static gradient stops; motion is structural.
//   - radial-gradient + blur(20px) bloom → react-native-svg RadialGradient.
//     Soft falloff replaces the blur (no native CSS blur in RN).
//   - backdrop-filter:blur(4px) on the light-theme chip → not natively
//     available without expo-blur; we bump chip bg opacity (0.6 → 0.72)
//     to compensate. Note via `chip.useBackdropBlur` if you later add
//     expo-blur and want the real thing.

export type StatusKey = 'free' | 'maybe' | 'busy' | 'inactive';
export type ThemeKey = 'dark' | 'light';

// Brand neon green — same bottom-right bloom tint across all statuses.
export const BRAND_NEON = '#B9FF3B';

export interface StatusDatum {
  title: string;
  context: string;
  expiry: string | null;
  hue: string;          // dark-mode identity hue
  deep: string;         // light-mode deep hue (used as title color in light)
  emoji: string;
}

export const STATUS_DATA: Record<StatusKey, StatusDatum> = {
  free:     { title: "I'm Free",  context: 'see a movie',     expiry: 'until 10pm', hue: '#4ADE80', deep: '#0d2818', emoji: '✨' },
  maybe:    { title: 'Maybe',     context: 'wrapping up work', expiry: 'after 6pm',  hue: '#FACC15', deep: '#2a1f06', emoji: '🤔' },
  busy:     { title: 'Busy',      context: 'deep work',        expiry: 'until 5pm',  hue: '#F87171', deep: '#2a0f0f', emoji: '🛑' },
  inactive: { title: 'Inactive',  context: 'tap to set',       expiry: null,         hue: '#6B7079', deep: '#1a1c20', emoji: '·'  },
};

export interface StatusCardTokens {
  gradient: {
    colors: [string, string, string, string];
    locations: [number, number, number, number];
    // 120deg ≈ start (0, 0.25) → end (1, 0.75) in normalized coords.
    start: { x: number; y: number };
    end:   { x: number; y: number };
  };
  border: string;            // 1px solid rgba(...)
  bloom: {
    topLeft: string;         // base color for top-left radial gradient
    bottomRight: string;     // base color for bottom-right radial gradient
  };
  eyebrow: string;           // 'YOUR STATUS' color
  chip: {
    bg: string;
    border: string;
    text: string;            // 'NOW' label color
    dot: string;             // pulse dot color
    useBackdropBlur: boolean;
    pulseDotHaloColor: string | null;  // null = no halo (light mode)
  };
  title: {
    color: string;
    textShadow: { color: string; radius: number; offsetY: number } | null;
  };
  bodyText: string;          // context line color
  pencil: string;            // pencil icon color
}

const GRADIENT_120_DEG = {
  start: { x: 0, y: 0.25 },
  end:   { x: 1, y: 0.75 },
};
const STD_LOCATIONS: [number, number, number, number] = [0, 0.35, 0.70, 1];

// ---------- DARK ----------
const dark: Record<StatusKey, StatusCardTokens> = {
  free: {
    gradient: { colors: ['#0f2417', '#1a3528', '#2e4a1a', '#1a2010'], locations: STD_LOCATIONS, ...GRADIENT_120_DEG },
    border: 'rgba(74,222,128,0.19)',
    bloom: { topLeft: 'rgba(74,222,128,0.02)', bottomRight: 'rgba(185,255,59,0.01)' },
    eyebrow: '#B9FF3B',
    chip: {
      bg: 'rgba(0,0,0,0.35)',
      border: 'rgba(74,222,128,0.25)',
      text: '#4ADE80',
      dot: '#4ADE80',
      useBackdropBlur: false,
      pulseDotHaloColor: '#4ADE80',
    },
    title: {
      color: '#FFFFFF',
      textShadow: { color: 'rgba(74,222,128,0.25)', radius: 24, offsetY: 2 },
    },
    bodyText: 'rgba(255,255,255,0.7)',
    pencil: 'rgba(255,255,255,0.7)',
  },

  // Scaffolded entries below mirror the `free` structure but use STATUS_DATA
  // hues. Replace with the user's follow-up token sets when they arrive.
  maybe: {
    gradient: { colors: ['#241a07', '#352a0e', '#4a3a14', '#201b0c'], locations: STD_LOCATIONS, ...GRADIENT_120_DEG },
    border: 'rgba(250,204,21,0.19)',
    bloom: { topLeft: 'rgba(250,204,21,0.02)', bottomRight: 'rgba(185,255,59,0.01)' },
    eyebrow: '#FDE68A',
    chip: { bg: 'rgba(0,0,0,0.35)', border: 'rgba(250,204,21,0.25)', text: '#FACC15', dot: '#FACC15', useBackdropBlur: false, pulseDotHaloColor: '#FACC15' },
    title: { color: '#FFFFFF', textShadow: { color: 'rgba(250,204,21,0.22)', radius: 24, offsetY: 2 } },
    bodyText: 'rgba(255,255,255,0.7)',
    pencil: 'rgba(255,255,255,0.7)',
  },
  busy: {
    gradient: { colors: ['#240f0f', '#3a1818', '#4a2020', '#201010'], locations: STD_LOCATIONS, ...GRADIENT_120_DEG },
    border: 'rgba(248,113,113,0.19)',
    bloom: { topLeft: 'rgba(248,113,113,0.02)', bottomRight: 'rgba(185,255,59,0.01)' },
    eyebrow: '#FCA5A5',
    chip: { bg: 'rgba(0,0,0,0.35)', border: 'rgba(248,113,113,0.25)', text: '#F87171', dot: '#F87171', useBackdropBlur: false, pulseDotHaloColor: '#F87171' },
    title: { color: '#FFFFFF', textShadow: { color: 'rgba(248,113,113,0.22)', radius: 24, offsetY: 2 } },
    bodyText: 'rgba(255,255,255,0.7)',
    pencil: 'rgba(255,255,255,0.7)',
  },
  inactive: {
    gradient: { colors: ['#15171a', '#1d2027', '#23262d', '#16181b'], locations: STD_LOCATIONS, ...GRADIENT_120_DEG },
    border: 'rgba(107,112,121,0.30)',
    bloom: { topLeft: 'rgba(107,112,121,0.015)', bottomRight: 'rgba(185,255,59,0.01)' },
    eyebrow: '#9CA3AF',
    chip: { bg: 'rgba(0,0,0,0.35)', border: 'rgba(107,112,121,0.30)', text: '#9CA3AF', dot: '#6B7079', useBackdropBlur: false, pulseDotHaloColor: null },
    title: { color: 'rgba(255,255,255,0.85)', textShadow: null },
    bodyText: 'rgba(255,255,255,0.6)',
    pencil: 'rgba(255,255,255,0.6)',
  },
};

// ---------- LIGHT ----------
const light: Record<StatusKey, StatusCardTokens> = {
  free: {
    gradient: { colors: ['#eaf5ec', '#d9ecdb', '#e8f0c9', '#f1f3df'], locations: STD_LOCATIONS, ...GRADIENT_120_DEG },
    border: 'rgba(34,134,75,0.18)',
    bloom: { topLeft: 'rgba(34,134,75,0.02)', bottomRight: 'rgba(120,170,30,0.01)' },
    eyebrow: '#4d6b15',
    chip: {
      bg: 'rgba(255,255,255,0.72)',
      border: 'rgba(34,134,75,0.28)',
      text: '#166534',
      dot: '#16a34a',
      useBackdropBlur: true,         // honored if/when you add expo-blur
      pulseDotHaloColor: null,       // no halo on light
    },
    title: { color: STATUS_DATA.free.deep, textShadow: null },
    bodyText: 'rgba(13,40,24,0.62)',
    pencil: 'rgba(13,40,24,0.55)',
  },

  // Scaffolded — replace with follow-up tokens.
  maybe: {
    gradient: { colors: ['#f7eed1', '#f1e2a8', '#ede1c0', '#f5f0d6'], locations: STD_LOCATIONS, ...GRADIENT_120_DEG },
    border: 'rgba(180,120,20,0.20)',
    bloom: { topLeft: 'rgba(217,119,6,0.02)', bottomRight: 'rgba(120,170,30,0.01)' },
    eyebrow: '#7a4f0a',
    chip: { bg: 'rgba(255,255,255,0.72)', border: 'rgba(180,120,20,0.28)', text: '#92400e', dot: '#d97706', useBackdropBlur: true, pulseDotHaloColor: null },
    title: { color: STATUS_DATA.maybe.deep, textShadow: null },
    bodyText: 'rgba(42,31,6,0.62)',
    pencil: 'rgba(42,31,6,0.55)',
  },
  busy: {
    gradient: { colors: ['#fbe6e6', '#f5cfcf', '#f3d3d3', '#f8e0e0'], locations: STD_LOCATIONS, ...GRADIENT_120_DEG },
    border: 'rgba(220,38,38,0.20)',
    bloom: { topLeft: 'rgba(220,38,38,0.02)', bottomRight: 'rgba(120,170,30,0.01)' },
    eyebrow: '#9b1c1c',
    chip: { bg: 'rgba(255,255,255,0.72)', border: 'rgba(220,38,38,0.28)', text: '#991b1b', dot: '#dc2626', useBackdropBlur: true, pulseDotHaloColor: null },
    title: { color: STATUS_DATA.busy.deep, textShadow: null },
    bodyText: 'rgba(42,15,15,0.62)',
    pencil: 'rgba(42,15,15,0.55)',
  },
  inactive: {
    gradient: { colors: ['#f1f2f5', '#e8eaee', '#eceef2', '#f3f4f7'], locations: STD_LOCATIONS, ...GRADIENT_120_DEG },
    border: 'rgba(100,116,139,0.22)',
    bloom: { topLeft: 'rgba(100,116,139,0.015)', bottomRight: 'rgba(120,170,30,0.01)' },
    eyebrow: '#475569',
    chip: { bg: 'rgba(255,255,255,0.72)', border: 'rgba(100,116,139,0.28)', text: '#475569', dot: '#94a3b8', useBackdropBlur: true, pulseDotHaloColor: null },
    title: { color: STATUS_DATA.inactive.deep, textShadow: null },
    bodyText: 'rgba(26,28,32,0.55)',
    pencil: 'rgba(26,28,32,0.50)',
  },
};

export const STATUS_CARD_TOKENS: Record<ThemeKey, Record<StatusKey, StatusCardTokens>> = {
  dark,
  light,
};
