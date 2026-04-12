// Phase 8 v1.4 — Currency formatting utilities for IOU expense amounts.
// Uses Intl.NumberFormat built into Hermes (Expo SDK 55) — no external dependency.
// rawDigits pattern: internal state is a string of digit chars only (no decimal point).
// Backspace removes the last digit cleanly because the display is derived, never stored.

/**
 * Converts integer cents to a USD display string.
 * formatCentsDisplay(4250) → "$42.50"
 * formatCentsDisplay(0)    → "$0.00"
 */
export function formatCentsDisplay(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Strips non-digit characters from a raw input string.
 * Used in onChange handlers: setRawDigits(parseCentsFromInput(text))
 * parseCentsFromInput("$42.50") → "4250"
 * parseCentsFromInput("")       → ""
 */
export function parseCentsFromInput(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Converts a rawDigits string to integer cents.
 * rawDigitsToInt("4250") → 4250
 * rawDigitsToInt("")     → 0
 */
export function rawDigitsToInt(rawDigits: string): number {
  return parseInt(rawDigits || '0', 10);
}
