export const RADII = {
  xs: 4,      // small indicators (unread dot, action sheet handle)
  sm: 6,      // segmented control thumb
  md: 8,      // buttons, inputs, small cards, tags
  lg: 12,     // cards, containers, modals, form fields
  xl: 16,     // large containers (QR display, scan overlay)
  pill: 18,   // message bubbles
  full: 9999, // fully circular (avatars, FABs — use with equal width/height)
} as const;
