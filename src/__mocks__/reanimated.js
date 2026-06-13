// Lightweight stub of react-native-reanimated for Jest. The default export
// exposes Animated.View / Animated.Text / etc. as plain strings so React
// renderer treats them as host components — matches the approach in the
// react-native mock (Animated.View = 'Animated.View').
//
// __esModule: true is required so babel interop passes `default` through
// directly (without wrapping the whole module.exports as the default).

const animatedDefault = {
  View: 'Animated.View',
  Text: 'Animated.Text',
  Image: 'Animated.Image',
  ScrollView: 'Animated.ScrollView',
  createAnimatedComponent: (C) => C,
};

module.exports = {
  __esModule: true,
  default: animatedDefault,
  // Also expose hosts as named exports for `import Animated, { View }` shapes.
  View: animatedDefault.View,
  Text: animatedDefault.Text,
  useSharedValue: jest.fn((v) => ({ value: v })),
  useAnimatedStyle: jest.fn((fn) => {
    try {
      return fn();
    } catch {
      return {};
    }
  }),
  useAnimatedScrollHandler: jest.fn(() => jest.fn()),
  useDerivedValue: jest.fn((fn) => {
    try {
      return { value: fn() };
    } catch {
      return { value: 0 };
    }
  }),
  withSpring: jest.fn((v) => v),
  withTiming: jest.fn((v) => v),
  interpolate: jest.fn((value, inputRange, outputRange) => outputRange[0]),
  Extrapolation: { CLAMP: 'CLAMP', EXTEND: 'EXTEND', IDENTITY: 'IDENTITY' },
  useReducedMotion: jest.fn(() => false),
  runOnJS: jest.fn((fn) => fn),
};
