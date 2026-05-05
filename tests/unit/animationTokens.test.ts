// Unit tests for animation.ts — run via: npx tsx tests/unit/animationTokens.test.ts
// Tests ANIMATION token shape and values per 24-01-PLAN.md (POLISH-02).

import assert from 'node:assert/strict';
import { ANIMATION } from '../../src/theme/animation';

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

console.log('animationTokens — ANIMATION const');

// Duration values
test('ANIMATION.duration.fast is 200', () => assert.equal(ANIMATION.duration.fast, 200));
test('ANIMATION.duration.normal is 300', () => assert.equal(ANIMATION.duration.normal, 300));
test('ANIMATION.duration.slow is 700', () => assert.equal(ANIMATION.duration.slow, 700));
test('ANIMATION.duration.verySlow is 1200', () => assert.equal(ANIMATION.duration.verySlow, 1200));

// Easing presets are lazy functions
test('standard easing is a function', () => assert.equal(typeof ANIMATION.easing.standard, 'function'));
test('decelerate easing is a function', () => assert.equal(typeof ANIMATION.easing.decelerate, 'function'));
test('accelerate easing is a function', () => assert.equal(typeof ANIMATION.easing.accelerate, 'function'));
test('standard() returns a non-undefined value', () => assert.notEqual(ANIMATION.easing.standard(), undefined));

// Spring config is plain data
test('spring has damping 15', () => assert.equal(ANIMATION.easing.spring.damping, 15));
test('spring has stiffness 120', () => assert.equal(ANIMATION.easing.spring.stiffness, 120));

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
