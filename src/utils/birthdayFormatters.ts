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
