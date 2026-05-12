// Comprehensive react-native mock for Jest tests in Node environment.
// Used by moduleNameMapper: '^react-native$' → this file.
// Provides minimal stubs for all RN APIs used by campfire components.

'use strict';

const React = require('react');

// Animated value stub
function AnimatedValue(v) {
  this._value = v;
  this._listeners = [];
}
AnimatedValue.prototype.setValue = function (v) {
  this._value = v;
};
AnimatedValue.prototype.addListener = function (cb) {
  return '0';
};
AnimatedValue.prototype.removeListener = function () {};
AnimatedValue.prototype.interpolate = function (config) {
  return new AnimatedValue(0);
};

const Animated = {
  Value: AnimatedValue,
  timing: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  spring: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  sequence: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  parallel: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  stagger: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  delay: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  View: 'Animated.View',
  Text: 'Animated.Text',
  Image: 'Animated.Image',
  FlatList: 'Animated.FlatList',
  createAnimatedComponent: jest.fn((Component) => Component),
  event: jest.fn(),
  add: jest.fn(),
};

const StyleSheet = {
  create: jest.fn((styles) => styles),
  flatten: jest.fn((s) => s),
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hairlineWidth: 1,
};

const Platform = {
  OS: 'ios',
  Version: '17.0',
  select: jest.fn((obj) => obj.ios || obj.default || {}),
  isTV: false,
};

// Simple component stubs that render children
const View = ({ children, ...props }) => React.createElement('View', props, children);
const Text = ({ children, ...props }) => React.createElement('Text', props, children);
const TouchableOpacity = ({ children, onPress, ...props }) =>
  React.createElement('TouchableOpacity', { ...props, onClick: onPress }, children);
const Pressable = ({ children, onPress, onPressIn, onPressOut, style, ...props }) => {
  const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
  return React.createElement(
    'Pressable',
    { ...props, style: resolvedStyle, onClick: onPress },
    children
  );
};
const ActivityIndicator = (props) => React.createElement('ActivityIndicator', props);
const TextInput = (props) => React.createElement('TextInput', props);
const FlatList = ({ data, renderItem, keyExtractor, ...props }) =>
  React.createElement(
    'FlatList',
    props,
    (data || []).map((item, i) => renderItem({ item, index: i }))
  );
const ScrollView = ({ children, ...props }) => React.createElement('ScrollView', props, children);
const Image = (props) => React.createElement('Image', props);
const SafeAreaView = ({ children, ...props }) =>
  React.createElement('SafeAreaView', props, children);
const Modal = ({ children, visible, ...props }) =>
  visible !== false ? React.createElement('Modal', props, children) : null;
const RefreshControl = (props) => React.createElement('RefreshControl', props);
const Alert = { alert: jest.fn() };
// KeyboardAvoidingView — used by sheets that adjust for the iOS keyboard
// (PollCreationSheet, ChatTodoPickerSheet). In the jest Node env there is no
// keyboard, so the component just passes children through.
const KeyboardAvoidingView = ({ children, ...props }) =>
  React.createElement('KeyboardAvoidingView', props, children);
// TouchableWithoutFeedback — used by modal backdrops. The mock exposes onPress
// via the `onClick` prop name (matching TouchableOpacity) so fireEvent.press
// works against backdrops in tests.
const TouchableWithoutFeedback = ({ children, onPress, ...props }) =>
  React.createElement(
    'TouchableWithoutFeedback',
    { ...props, onClick: onPress },
    children
  );

const useColorScheme = jest.fn(() => 'light');
const useWindowDimensions = jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 }));
const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
const Linking = {
  openURL: jest.fn(),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  addEventListener: jest.fn(),
};
const Keyboard = {
  dismiss: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};
const Vibration = { vibrate: jest.fn(), cancel: jest.fn() };
const Share = { share: jest.fn(() => Promise.resolve()) };
const Clipboard = { setString: jest.fn(), getString: jest.fn(() => Promise.resolve('')) };

// LayoutAnimation — used by ChatTodoListRow (Phase 29.1 Plan 06) and any
// component that animates section/row reflow. configureNext is a no-op in the
// jest Node env (no native bridge); we only need the API surface to exist.
const LayoutAnimation = {
  configureNext: jest.fn(),
  create: jest.fn((duration, type, property) => ({ duration, type, property })),
  Presets: {
    easeInEaseOut: { duration: 300 },
    linear: { duration: 500 },
    spring: { duration: 700 },
  },
  Types: {
    spring: 'spring',
    linear: 'linear',
    easeInEaseOut: 'easeInEaseOut',
    easeIn: 'easeIn',
    easeOut: 'easeOut',
    keyboard: 'keyboard',
  },
  Properties: {
    opacity: 'opacity',
    scaleX: 'scaleX',
    scaleY: 'scaleY',
    scaleXY: 'scaleXY',
  },
};

// UIManager — used to opt into Android LayoutAnimation in ChatTodoListRow.
const UIManager = {
  setLayoutAnimationEnabledExperimental: jest.fn(),
  measure: jest.fn(),
  measureInWindow: jest.fn(),
  measureLayout: jest.fn(),
};

const useRef = React.useRef;
const useState = React.useState;
const useEffect = React.useEffect;
const useMemo = React.useMemo;
const useCallback = React.useCallback;

module.exports = {
  Animated,
  StyleSheet,
  Platform,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  TextInput,
  FlatList,
  ScrollView,
  Image,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  RefreshControl,
  Alert,
  Dimensions,
  Linking,
  Keyboard,
  Vibration,
  Share,
  Clipboard,
  useColorScheme,
  useWindowDimensions,
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  // Re-export React hooks so files that import from react-native directly still work
  AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  StatusBar: { setBarStyle: jest.fn() },
  LayoutAnimation,
  UIManager,
  NativeModules: {},
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeAllListeners: jest.fn(),
  })),
  PermissionsAndroid: {
    request: jest.fn(() => Promise.resolve('granted')),
    check: jest.fn(() => Promise.resolve(true)),
    PERMISSIONS: {},
    RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
  },
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    in: (fn) => fn,
    out: (fn) => fn,
    inOut: (fn) => fn,
    bezier: () => (t) => t,
    circle: (t) => t,
    sin: (t) => t,
    exp: (t) => t,
    elastic: () => (t) => t,
    back: () => (t) => t,
    bounce: (t) => t,
    poly: () => (t) => t,
    cubic: (t) => t,
    quad: (t) => t,
    step0: (t) => t,
    step1: (t) => t,
  },
};
