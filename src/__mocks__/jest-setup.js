// Jest global setup for React Native test environment.
// Defines globals that React Native expects to be available.

global.__DEV__ = true;
global.__BUNDLE_START_TIME__ = Date.now();
global.__fbBatchedBridgeConfig = {};
global.performance = global.performance || {
  now: () => Date.now(),
};

// Mock TurboModuleRegistry to prevent "DeviceInfo could not be found" errors
// when react-native tries to load native modules in a Node test environment.
const TurboModuleRegistry = {
  getEnforcing: (name) => {
    const mocks = {
      DeviceInfo: {
        getConstants: () => ({
          Dimensions: { window: { width: 375, height: 812, scale: 2, fontScale: 1 }, screen: { width: 375, height: 812, scale: 2, fontScale: 1 } },
        }),
      },
      PlatformConstants: {
        getConstants: () => ({
          isTesting: true,
          reactNativeVersion: { major: 0, minor: 83, patch: 0 },
          osVersion: '17.0',
          systemName: 'iOS',
        }),
      },
      Networking: { sendRequest: () => {}, abortRequest: () => {}, clearCookies: () => {} },
      SourceCode: { getConstants: () => ({ scriptURL: null }) },
      AppState: { getConstants: () => ({ initialAppState: 'active' }) },
      Timing: { createTimer: () => {}, deleteTimer: () => {}, setSendIdleEvents: () => {} },
      UIManager: {},
    };
    return mocks[name] || {};
  },
  get: (name) => null,
};
global.TurboModuleRegistry = TurboModuleRegistry;

// Also patch it on the require side — react-native imports it from the module
try {
  const { TurboModuleRegistry: RNTurbo } = require('react-native/Libraries/TurboModule/TurboModuleRegistry');
} catch (_) {
  // ok if not found
}
