export const FONT_FAMILY = {
  display: {
    regular: 'BricolageGrotesque_400Regular',
    medium: 'BricolageGrotesque_500Medium',
    semibold: 'BricolageGrotesque_600SemiBold',
    bold: 'BricolageGrotesque_700Bold',
    extrabold: 'BricolageGrotesque_800ExtraBold',
  },
  body: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
} as const;

export const FONT_SIZE = {
  xs: 11, // tab bar labels only
  sm: 13, // timestamps, captions
  md: 14, // form labels, secondary info
  lg: 16, // body text, card titles, button labels
  xl: 20, // section headings
  xxl: 24, // screen titles
  xxxl: 28, // tile titles in hero contexts (Activity spotlight)
  display: 32, // auth hero, brand wordmark, tile hero metrics
  hero: 44, // dominant numeric metrics (Activity spotlight amount)
} as const;

export const FONT_WEIGHT = {
  regular: '400' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;
