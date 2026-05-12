// Semantic accent palette for Activity bento tiles.
// Each tool owns a color so the grid reads chromatically — money is money,
// birthdays are birthdays. Tints (10-20% alpha) sit nicely on surface.card
// (#1D2027) without competing with the brand neon-green #B9FF3B.

export const TILE_ACCENTS = {
  iouPositive: '#4ADE80', // status.free — same green used for "you're owed"
  iouNegative: '#F87171', // destructive — same red used for "you owe"
  birthday: '#F472B6', // pink-400 — celebratory, plays against the dark base
  streak: '#FB923C', // orange-400 — flame/warmth without bleeding into red
  goals: '#60A5FA', // blue-400 — achievement/progress, cool counterweight
  habits: '#22D3EE', // cyan-400 — "checked / habitual / clear" (Phase 29.1 UI-SPEC §Color)
  todos: '#A78BFA', // violet-400 — "task / agenda / list" (Phase 29.1 UI-SPEC §Color)
  neutral: '#B9FF3B', // fall back to the brand neon when no semantic fits
} as const;

// 12% opacity ("1F" hex suffix) — used for icon bubble bg and subtle tint fills.
export const ACCENT_FILL = '1F';
// 20% opacity ("33" hex suffix) — used for accent-tinted borders.
export const ACCENT_BORDER = '33';
