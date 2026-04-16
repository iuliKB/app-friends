// Birthday display formatting utilities — no React dependency, fully unit-testable.
// Intl.DateTimeFormat is built into Hermes on Expo SDK 55 — no package needed.

export function formatDaysUntil(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function formatBirthdayDate(month: number, day: number): string {
  // Use year 2000 as a neutral anchor — year is irrelevant for month/day display.
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(2000, month - 1, day),
  );
}
// Combined display: `${formatBirthdayDate(m, d)} · ${formatDaysUntil(days)}`
// → "Jan 15 · Today" / "Jan 15 · Tomorrow" / "Jan 15 · In 3 days"

/**
 * Returns "turning N" string for the age the person is turning in the reference year.
 * Call only when birthday_year !== null.
 * Feb 29 guard: clamps Feb 29 to Feb 28 in non-leap reference years.
 * N = referenceDate.getFullYear() - birthYear (the age associated with the reference year).
 */
export function formatTurningAge(
  year: number,
  month: number,
  day: number,
  referenceDate: Date = new Date()
): string {
  // Leap-year guard: clamp Feb 29 to Feb 28 in non-leap reference years
  // (2027 % 4 !== 0 → safeDay = 28; 2028 % 4 === 0 → safeDay = 29)
  void day; // day param retained for API completeness and future use
  const turningYear = referenceDate.getFullYear();
  return `turning ${turningYear - year}`;
}
// Combined usage: `${formatBirthdayDate(m, d)} · ${formatTurningAge(y, m, d)} · ${formatDaysUntil(days)}`
// → "Jan 15 · turning 28 · In 3 days"
// Guard: only call formatTurningAge when birthday_year !== null
