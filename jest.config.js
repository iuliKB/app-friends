/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)',
  ],
  transform: {
    '^.+\\.(js|ts|tsx)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  moduleNameMapper: {
    // Theme — lightweight mock to avoid native module chain (useColorScheme → DeviceInfo)
    '^@/theme$': '<rootDir>/src/__mocks__/theme.js',
    '^@/theme/(.*)$': '<rootDir>/src/__mocks__/theme.js',
    // Other @/ path aliases: resolve to src/
    '^@/(.*)$': '<rootDir>/src/$1',
    // React Native — full mock to avoid native module/TurboModule requirements
    '^react-native$': '<rootDir>/src/__mocks__/react-native.js',
    // Mock async storage
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/async-storage.js',
    // Mock expo-haptics
    '^expo-haptics$': '<rootDir>/src/__mocks__/expo-haptics.js',
    // Suppress native modules that aren't needed in tests
    '^react-native-reanimated$': '<rootDir>/src/__mocks__/reanimated.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.claude/',
  ],
  setupFiles: [
    '<rootDir>/src/__mocks__/jest-setup.js',
  ],
};
