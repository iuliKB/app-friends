// Surface tokens for Activity bento tiles.
// Gradient lifts the top edge so cards feel lit from above instead of pasted
// flat on the page. Hairline border defines the edge in dark mode where shadows
// barely show. Spotlight gets a stronger shadow because it's the hero tile.

export const TILE_SURFACE = {
  // 2-stop vertical gradient — top a touch brighter than surface.card (#1D2027),
  // bottom a touch darker. Subtle on purpose; depth via contrast, not glare.
  tileGradient: ['#23262E', '#1A1D24'] as const,
  spotlightGradient: ['#262932', '#1A1D24'] as const,

  // Edge definition. ~6% white on dark — invisible in light, clean in dark.
  hairlineBorder: 'rgba(255,255,255,0.06)',
} as const;

export const SPOTLIGHT_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.4,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
} as const;
