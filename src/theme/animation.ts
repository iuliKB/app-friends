// Animation theme tokens — Phase 24 (POLISH-02)
// Usage: import { ANIMATION } from '@/theme'
// Easing presets are lazy functions — call with () at render time to avoid import-time side effects.
// See: CONTEXT.md D-05, D-06
//
// Note: easing functions implement the same cubic-bezier math as React Native's Easing class,
// without importing react-native directly. This keeps the module testable in Node.js (tsx runner)
// while producing identical (t: number) => number functions that Animated.timing's easing prop accepts.

type EasingFn = (t: number) => number;

// Bezier implementation matching React Native's Easing.bezier internals.
// Easing.ease = bezier(0.42, 0, 1.0, 1.0); same cubic-bezier as CSS ease.
function _bezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const NEWTON_ITERATIONS = 4;
  const NEWTON_MIN_SLOPE = 0.001;
  const SUBDIVISION_PRECISION = 0.0000001;
  const SUBDIVISION_MAX_ITERATIONS = 10;
  const kSplineTableSize = 11;
  const kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

  function a(aA1: number, aA2: number) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
  function b(aA1: number, aA2: number) { return 3.0 * aA2 - 6.0 * aA1; }
  function c(aA1: number) { return 3.0 * aA1; }
  function calcBezier(aT: number, aA1: number, aA2: number) {
    return ((a(aA1, aA2) * aT + b(aA1, aA2)) * aT + c(aA1)) * aT;
  }
  function getSlope(aT: number, aA1: number, aA2: number) {
    return 3.0 * a(aA1, aA2) * aT * aT + 2.0 * b(aA1, aA2) * aT + c(aA1);
  }

  const sampleValues = new Float32Array(kSplineTableSize);
  if (x1 !== y1 || x2 !== y2) {
    for (let i = 0; i < kSplineTableSize; ++i) {
      sampleValues[i] = calcBezier(i * kSampleStepSize, x1, x2);
    }
  }

  function getTForX(aX: number): number {
    let intervalStart = 0.0;
    let currentSample = 1;
    const lastSample = kSplineTableSize - 1;
    for (; currentSample !== lastSample && (sampleValues[currentSample] ?? 0) <= aX; ++currentSample) {
      intervalStart += kSampleStepSize;
    }
    --currentSample;
    const dist = (aX - (sampleValues[currentSample] ?? 0)) / ((sampleValues[currentSample + 1] ?? 0) - (sampleValues[currentSample] ?? 0));
    const guessForT = intervalStart + dist * kSampleStepSize;
    const initialSlope = getSlope(guessForT, x1, x2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      let currentT = guessForT;
      for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
        const currentSlope = getSlope(currentT, x1, x2);
        if (currentSlope === 0.0) break;
        currentT -= (calcBezier(currentT, x1, x2) - aX) / currentSlope;
      }
      return currentT;
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      let aA = intervalStart, aB = intervalStart + kSampleStepSize;
      let currentX: number, currentT: number = 0;
      let i = 0;
      do {
        currentT = aA + (aB - aA) / 2.0;
        currentX = calcBezier(currentT, x1, x2) - aX;
        if (currentX > 0.0) { aB = currentT; } else { aA = currentT; }
      } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
      return currentT;
    }
  }

  return (t: number): number => {
    if (x1 === y1 && x2 === y2) return t;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return calcBezier(getTForX(t), y1, y2);
  };
}

// Compose: inOut(f)(t) = f(2t)/2 for t<0.5; 1-f(2(1-t))/2 for t>=0.5
function _inOut(easing: EasingFn): EasingFn {
  return (t: number) => {
    if (t < 0.5) return easing(t * 2) / 2;
    return 1 - easing((1 - t) * 2) / 2;
  };
}

function _out(easing: EasingFn): EasingFn {
  return (t: number) => 1 - easing(1 - t);
}

// Easing.ease = bezier(0.42, 0, 1.0, 1.0) — CSS ease equivalent
const _ease = _bezier(0.42, 0, 1.0, 1.0);

export const ANIMATION = {
  duration: {
    fast: 200,       // quick UI responses, haptic confirms
    normal: 300,     // state transitions, reveals
    slow: 700,       // emphasis animations, status pulses
    verySlow: 1200,  // looping ambient animations (radar pulse, skeleton shimmer)
  },
  easing: {
    standard:   () => _inOut(_ease),  // balanced — state transitions
    decelerate: () => _out(_ease),    // fast-in, slow-out — content arriving
    accelerate: () => _ease,          // slow-in, fast-out — content leaving
    spring: { damping: 15, stiffness: 120 }, // Reanimated withSpring config (data only — no import needed)
  },
} as const;
