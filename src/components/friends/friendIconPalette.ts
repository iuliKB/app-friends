// Phase 33 — Leading-icon palette for the friend profile grouped-inset rows (D-03).
//
// Single source of truth for the Messenger-style colorful round-icon palette.
// Components MUST import via `getIconPalette(tint, colors)` — no hex/rgba literals
// for these tints anywhere else.
//
// Light/dark switching is in this helper, NOT in the consuming component, so
// theme changes stay atomic. Each tint returns `{ bg, glyph, ionicon }`:
//   - bg: the 32pt circle's backgroundColor (low-alpha tint)
//   - glyph: the centered Ionicon glyph color (full saturation)
//   - ionicon: the Ionicons glyph name for this row type
//
// Backgrounds use 12–20% alpha — locked verbatim from UI-SPEC §Leading-Icon Palette.

import type { Ionicons } from '@expo/vector-icons';

// Colors-typed accessor — keep loose to avoid coupling to the theme module shape.
interface PaletteColors {
  interactive: { accent: string };
  // remaining theme fields not consumed here
}

export type IconTint =
  | 'bio'
  | 'friendsSince'
  | 'birthday'
  | 'timezone'
  | 'wishlist'
  | 'mutualPlans'
  | 'mutualFriends'
  | 'sharedPhotos'
  | 'iou';

export interface IconPaletteEntry {
  bg: string;
  glyph: string;
  ionicon: keyof typeof Ionicons.glyphMap;
}

// Detect light vs dark by inspecting the accent token — `#B9FF3B` is dark mode,
// `#4D7C00` is light mode (per src/theme/colors.ts + light-colors.ts). This avoids
// requiring the caller to pass a `mode` argument explicitly.
function isDark(colors: PaletteColors): boolean {
  return colors.interactive.accent === '#B9FF3B';
}

export function getIconPalette(tint: IconTint, colors: PaletteColors): IconPaletteEntry {
  const dark = isDark(colors);

  switch (tint) {
    case 'bio':
      return {
        bg: dark ? 'rgba(96, 165, 250, 0.18)' : 'rgba(37, 99, 235, 0.12)',
        glyph: dark ? '#60A5FA' : '#2563EB',
        ionicon: 'chatbubble-ellipses-outline',
      };
    case 'friendsSince':
      return {
        bg: dark ? 'rgba(185, 255, 59, 0.15)' : 'rgba(77, 124, 0, 0.12)',
        glyph: colors.interactive.accent,
        ionicon: 'people-outline',
      };
    case 'birthday':
      return {
        bg: dark ? 'rgba(244, 114, 182, 0.20)' : 'rgba(219, 39, 119, 0.14)',
        glyph: dark ? '#F472B6' : '#DB2777',
        ionicon: 'gift-outline',
      };
    case 'timezone':
      return {
        bg: dark ? 'rgba(125, 211, 252, 0.18)' : 'rgba(2, 132, 199, 0.12)',
        glyph: dark ? '#7DD3FC' : '#0284C7',
        ionicon: 'globe-outline',
      };
    case 'wishlist':
      return {
        bg: dark ? 'rgba(252, 165, 165, 0.20)' : 'rgba(220, 38, 38, 0.14)',
        glyph: dark ? '#FCA5A5' : '#DC2626',
        ionicon: 'heart-outline',
      };
    case 'mutualPlans':
      return {
        bg: dark ? 'rgba(167, 139, 250, 0.20)' : 'rgba(124, 58, 237, 0.14)',
        glyph: dark ? '#A78BFA' : '#7C3AED',
        ionicon: 'calendar-outline',
      };
    case 'mutualFriends':
      return {
        bg: dark ? 'rgba(251, 191, 36, 0.18)' : 'rgba(217, 119, 6, 0.14)',
        glyph: dark ? '#FBBF24' : '#D97706',
        ionicon: 'people-circle-outline',
      };
    case 'sharedPhotos':
      return {
        bg: dark ? 'rgba(185, 255, 59, 0.15)' : 'rgba(77, 124, 0, 0.12)',
        glyph: colors.interactive.accent,
        ionicon: 'images-outline',
      };
    case 'iou':
      return {
        bg: dark ? 'rgba(45, 212, 191, 0.18)' : 'rgba(13, 148, 136, 0.14)',
        glyph: dark ? '#2DD4BF' : '#0D9488',
        ionicon: 'wallet-outline',
      };
  }
}

// Phase 33 row-icon diameter — not a SPACING token (UI-SPEC §Spacing Scale §Exceptions).
// Stored here so consumers don't need to redeclare it locally.
export const ROW_ICON_SIZE = 32;
// Glyph size inside the 32pt circle (UI-SPEC §Pre-delivery checklist — consistent 18pt).
export const ROW_ICON_GLYPH_SIZE = 18;
