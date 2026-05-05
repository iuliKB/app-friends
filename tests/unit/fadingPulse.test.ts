// Unit tests for FADING PulseRing constant — run via: npx tsx tests/unit/fadingPulse.test.ts
// Tests FADING_PULSE_COLOR export from RadarBubble (HOME-03, Phase 26).
// These tests are RED until Plan 02 adds the constant to RadarBubble.tsx.

import assert from 'node:assert/strict';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    if (err instanceof Error) console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('fadingPulse — FADING_PULSE_COLOR constant');

// Dynamically import to avoid crashing the whole test on missing export
let FADING_PULSE_COLOR: unknown;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../../src/components/home/RadarBubble') as Record<string, unknown>;
  FADING_PULSE_COLOR = mod['FADING_PULSE_COLOR'];
} catch {
  FADING_PULSE_COLOR = undefined;
}

test('FADING_PULSE_COLOR is exported from RadarBubble', () => {
  assert.ok(FADING_PULSE_COLOR !== undefined, 'FADING_PULSE_COLOR should be exported');
});

test('FADING_PULSE_COLOR is a string', () => {
  assert.equal(typeof FADING_PULSE_COLOR, 'string');
});

test('FADING_PULSE_COLOR is amber-500 (#F59E0B)', () => {
  assert.equal(FADING_PULSE_COLOR, '#F59E0B');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
