module.exports = {
  default: {},
  useSharedValue: jest.fn(v => ({ value: v })),
  useAnimatedStyle: jest.fn(fn => fn()),
  withSpring: jest.fn(v => v),
  withTiming: jest.fn(v => v),
};
