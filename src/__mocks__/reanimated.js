// Lightweight stub of react-native-reanimated for Jest. The default export
// exposes Animated.View / Animated.Text / etc. as plain strings so React
// renderer treats them as host components — matches the approach in the
// react-native mock (Animated.View = 'Animated.View').

const animatedDefault = {
  View: 'Animated.View',
  Text: 'Animated.Text',
  Image: 'Animated.Image',
  ScrollView: 'Animated.ScrollView',
  createAnimatedComponent: (C) => C,
};

module.exports = {
  default: animatedDefault,
  // Also expose hosts as named exports for `import Animated, { View }` shapes.
  View: animatedDefault.View,
  Text: animatedDefault.Text,
  useSharedValue: jest.fn((v) => ({ value: v })),
  useAnimatedStyle: jest.fn((fn) => fn()),
  withSpring: jest.fn((v) => v),
  withTiming: jest.fn((v) => v),
  useReducedMotion: jest.fn(() => false),
};
