/**
 * Node.js --require preload script for tsx unit tests.
 *
 * Redirects React Native and Expo packages to minimal stubs so that component
 * files (e.g. RadarBubble.tsx) can be loaded in a pure Node.js environment
 * without the full React Native runtime.
 *
 * Usage:
 *   NODE_OPTIONS="--require ./tests/unit/rn-mock-preload.js" npx tsx tests/unit/<file>.test.ts
 *
 * The stub resolves:
 *   - react-native                    → stub (Animated, StyleSheet, Easing, Platform, etc.)
 *   - react-native-url-polyfill       → stub
 *   - expo-linear-gradient            → stub
 *   - expo-router                     → stub
 *   - @supabase/supabase-js paths     → stub
 *   - Any resolved path under /lib/supabase, /lib/action-sheet → stub
 */

'use strict';

const Module = require('module');
const path = require('path');
const origResolve = Module._resolveFilename;

// Stub for Animated.Value constructor
function AnimatedValue(v) {
  this._v = v;
}
AnimatedValue.prototype.setValue = function (v) {
  this._v = v;
};

const reactNativeStub = {
  Animated: {
    Value: AnimatedValue,
    timing: function () { return { start: function () {}, stop: function () {} }; },
    spring: function () { return { start: function () {}, stop: function () {} }; },
    loop: function () { return { start: function () {}, stop: function () {} }; },
    sequence: function () { return { start: function () {}, stop: function () {} }; },
    parallel: function () { return { start: function () {}, stop: function () {} }; },
    delay: function () { return { start: function () {}, stop: function () {} }; },
    View: function () { return null; },
  },
  StyleSheet: {
    create: function (obj) {
      const result = {};
      for (const key of Object.keys(obj)) result[key] = obj[key];
      return result;
    },
    absoluteFill: {},
  },
  Easing: {
    out: function (fn) { return fn || function (t) { return t; }; },
    ease: function (t) { return t; },
    inOut: function (fn) { return fn || function (t) { return t; }; },
  },
  Platform: {
    OS: 'ios',
    Version: '16.0',
    select: function (obj) { return obj.ios || obj.default || {}; },
  },
  Pressable: function () { return null; },
  Text: function () { return null; },
  View: function () { return null; },
  Alert: { alert: function () {} },
  useRef: function (v) { return { current: v }; },
  useEffect: function () {},
  useMemo: function (fn) { try { return fn(); } catch (e) { return {}; } },
  useCallback: function (fn) { return fn; },
};

// Write stub content to a temp file that can be required as a module
const stubPath = path.join(__dirname, '.rn-stub-module.js');
const fs = require('fs');
if (!fs.existsSync(stubPath)) {
  fs.writeFileSync(stubPath, "'use strict';\nmodule.exports = " + JSON.stringify(reactNativeStub) + ";\n");
}

// Direct name → stub path matches (exact module name or prefix)
const DIRECT_STUBS = [
  'react-native',
  'react-native-url-polyfill',
  'expo-linear-gradient',
  'expo-router',
  '@react-native/',
];

// Resolved path fragment → stub
const PATH_STUBS = [
  '/node_modules/@supabase/',
  '/node_modules/react-native-url-polyfill/',
  '/lib/supabase',
  '/lib/action-sheet',
];

Module._resolveFilename = function (request, parent, isMain, options) {
  // Check direct name stubs first (package names only)
  for (const key of DIRECT_STUBS) {
    if (request === key || request.startsWith(key + '/') || request.startsWith(key + '.')) {
      return stubPath;
    }
  }

  // Check if the request itself contains a path fragment to stub
  // (handles cases where tsx pre-resolved @/ aliases to absolute paths)
  for (const fragment of PATH_STUBS) {
    if (request.includes(fragment)) {
      return stubPath;
    }
  }

  // For relative and absolute paths that don't match stubs,
  // call origResolve (or the tsx-patched version) normally
  if (request.startsWith('.') || request.startsWith('/')) {
    return origResolve.call(this, request, parent, isMain, options);
  }

  // Resolve package names normally, then check path stubs on the result
  let resolved;
  try {
    resolved = origResolve.call(this, request, parent, isMain, options);
  } catch (e) {
    // If a package cannot be resolved, stub it (likely an RN ecosystem package)
    return stubPath;
  }

  for (const fragment of PATH_STUBS) {
    if (resolved.includes(fragment)) {
      return stubPath;
    }
  }

  return resolved;
};
