/**
 * Formats a plan's scheduled_for for EventCard display.
 * D-18: Output format: "Mon 15, Aug · in 2 days"
 * D-19: Mirrors relative-time logic from formatPlanTime in PlanCard.tsx
 */
export function formatEventCardDate(scheduledFor: string | null): string {
  if (!scheduledFor) return '';

  const date = new Date(scheduledFor);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Short date: "Mon 15, Aug"
  const shortDate = date.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Relative context
  let relative: string;
  if (diffMs <= 0) {
    relative = 'now';
  } else if (diffHours < 1) {
    relative = `in ${Math.max(1, Math.round(diffMs / 60000))} min`;
  } else if (diffHours < 24) {
    relative = `in ${Math.floor(diffHours)}h`;
  } else if (diffDays === 1) {
    relative = 'tomorrow';
  } else {
    relative = `in ${diffDays} days`;
  }

  // U+00B7 is the middle dot separator
  return `${shortDate} \u00B7 ${relative}`;
}
