// Phase 2 v1.3 — Preset context chips per mood (D-03, D-06, D-07).
// Tuned without code changes by editing this file. All entries: lowercase,
// ≤20 chars, no emoji (D-05). Exactly 5 entries per mood.

import type { StatusValue, MoodPreset } from '@/types/app';

export const MOOD_PRESETS: Record<StatusValue, MoodPreset[]> = {
  free: [
    { id: 'down to hang', label: 'down to hang' },
    { id: 'grab a coffee', label: 'grab a coffee' },
    { id: 'get food', label: 'get food' },
    { id: 'see a movie', label: 'see a movie' },
    { id: 'chill', label: 'chill' },
  ],
  maybe: [
    { id: 'reach out first', label: 'reach out first' },
    { id: 'text me', label: 'text me' },
    { id: 'depends', label: 'depends' },
    { id: 'later tonight', label: 'later tonight' },
    { id: 'maybe tomorrow', label: 'maybe tomorrow' },
  ],
  busy: [
    { id: 'in meetings', label: 'in meetings' },
    { id: 'deep work', label: 'deep work' },
    { id: 'at the gym', label: 'at the gym' },
    { id: 'running errands', label: 'running errands' },
    { id: 'sleeping', label: 'sleeping' },
  ],
};
