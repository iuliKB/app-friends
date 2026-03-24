export const FONT_SIZE = {
  xs: 11,   // tab bar labels only
  sm: 13,   // timestamps, captions
  md: 14,   // form labels, secondary info
  lg: 16,   // body text, card titles, button labels
  xl: 20,   // section headings
  xxl: 24,  // screen titles
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  semibold: '600' as const,
} as const;
