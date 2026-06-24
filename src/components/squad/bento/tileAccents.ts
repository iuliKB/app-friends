// Accent palette for Activity bento tiles.
// Restricted to colors that already live in the app's theme so the grid reads
// on-brand instead of rainbow: money keeps its functional green/red, time-based
// tools use status.maybe amber, and everything else falls back to the brand
// neon-green #B9FF3B. Accent shows only on each tile's icon + key number.
export const TILE_ACCENTS = {
  iouPositive: '#4ADE80', // status.free — "you're owed"
  iouNegative: '#F87171', // destructive — "you owe"
  birthday: '#FACC15', // status.maybe — warm/celebratory, already in the app
  streak: '#FACC15', // status.maybe — amber reads as flame/warmth
  goals: '#B9FF3B', // brand neon
  habits: '#B9FF3B', // brand neon
  todos: '#B9FF3B', // brand neon
  neutral: '#B9FF3B', // brand neon
} as const;

// 12% opacity ("1F" hex suffix) — used for icon bubble bg and subtle tint fills.
export const ACCENT_FILL = '1F';
// 20% opacity ("33" hex suffix) — used for accent-tinted borders.
export const ACCENT_BORDER = '33';
