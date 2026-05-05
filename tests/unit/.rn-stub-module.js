'use strict';
// Minimal stub for React Native and Expo packages, used by tsx unit tests.
// Loaded via tests/unit/rn-mock-preload.js in place of react-native, expo-router,
// expo-linear-gradient, react-native-url-polyfill, and @supabase/supabase-js.

function AnimatedValue(v) { this._v = v; }
AnimatedValue.prototype.setValue = function (v) { this._v = v; };

var noop = function () {};
var animObj = function () { return { start: noop, stop: noop }; };

module.exports = {
  // react-native exports
  Animated: {
    Value: AnimatedValue,
    timing: animObj,
    spring: animObj,
    loop: animObj,
    sequence: animObj,
    parallel: animObj,
    delay: animObj,
    View: function () { return null; },
  },
  StyleSheet: {
    create: function (obj) {
      var result = {};
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++) {
        result[keys[i]] = obj[keys[i]];
      }
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
    select: function (obj) { return (obj && (obj.ios || obj.default)) || {}; },
  },
  Pressable: function () { return null; },
  Text: function () { return null; },
  View: function () { return null; },
  Alert: { alert: noop },
  // expo-router exports
  useRouter: function () { return { push: noop, replace: noop, back: noop }; },
  // expo-linear-gradient exports
  LinearGradient: function () { return null; },
  // supabase exports
  createClient: function () {
    return {
      rpc: function () { return Promise.resolve({ data: null, error: null }); },
    };
  },
};
