// Unit tests for birthdayFormatters.ts — run via: npx tsx tests/unit/birthdayFormatters.test.ts
// Tests formatTurningAge behavior per 11-03-PLAN.md <behavior> section.
// The behavior spec is authoritative; the inline code snippet in the plan is a reference only.

import assert from 'node:assert/strict';
import { formatTurningAge } from '../../src/utils/birthdayFormatters';

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

console.log('birthdayFormatters — formatTurningAge');

// Plan behavior spec (authoritative):
// formatTurningAge(2000, 1, 15, new Date('2028-01-16')) → 'turning 28'
// formatTurningAge(2000, 1, 15, new Date('2028-01-15')) → 'turning 28'
// formatTurningAge(2000, 2, 29, new Date('2027-03-01')) → 'turning 27'
//
// Pattern: N = referenceDate.getFullYear() - birthYear
// (the age the person is turning during the reference year, regardless of date within year)
// The Feb 29 test confirms: 2027 - 2000 = 27 when refYear is 2027.

test('birthday was yesterday this year → turning 28', () => {
  assert.equal(formatTurningAge(2000, 1, 15, new Date('2028-01-16')), 'turning 28');
});

test('birthday today → turning 28', () => {
  assert.equal(formatTurningAge(2000, 1, 15, new Date('2028-01-15')), 'turning 28');
});

test('Feb 29 in non-leap year clamps to Feb 28 → turning 27', () => {
  // 2027 is not a leap year (2027 % 4 = 3 ≠ 0), so Feb 29 clamps to Feb 28
  // refDate 2027-03-01 is after Feb 28; result = 2027 - 2000 = 27
  assert.equal(formatTurningAge(2000, 2, 29, new Date('2027-03-01')), 'turning 27');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
