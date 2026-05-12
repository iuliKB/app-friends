/**
 * Habits feature — TypeScript contract layer (Phase 29.1).
 *
 * Mirrors the column shapes from migration 0024 (habits, habit_members,
 * habit_checkins) and the row shape returned by the `get_habits_overview(date)`
 * RPC. Field names stay snake_case to match Postgres column names so
 * components destructure RPC payloads directly without remapping.
 */

export type HabitCadence = 'daily' | 'weekly' | 'n_per_week';

export interface Habit {
  id: string;
  created_by: string;
  title: string;
  cadence: HabitCadence;
  weekly_target: number | null;   // smallint, NULL unless cadence='n_per_week' (D-05)
  created_at: string;             // ISO timestamp
}

export interface HabitMember {
  habit_id: string;
  user_id: string;
  accepted_at: string | null;     // NULL = pending invite (RESEARCH A3)
  joined_at: string;
}

export interface HabitCheckin {
  habit_id: string;
  user_id: string;
  date_local: string;             // 'YYYY-MM-DD'
  created_at: string;
}

/**
 * Overview row returned by get_habits_overview(p_date_local) RPC.
 * One row per habit the caller is an accepted member of.
 */
export interface HabitOverviewRow {
  habit_id: string;
  title: string;
  cadence: HabitCadence;
  weekly_target: number | null;
  is_solo: boolean;                       // true when accepted_total === 1 (only the caller)
  members_total: number;                  // total membership rows (includes pending invitees)
  accepted_total: number;                 // members with accepted_at IS NOT NULL — `members_total - accepted_total` = pending invites
  completed_today: number;                // count of habit_checkins for p_date_local across all accepted members
  did_me_check_in_today: boolean;         // whether caller has a checkin row for today
  last_checkin_date_local: string | null; // caller's most recent checkin date ('YYYY-MM-DD' or null) — drives OQ4 "about to break" rule (B2)
  current_week_completions: number;       // caller's checkins this ISO week (inclusive of today) — drives OQ4 Weekly + N×/week rules (B2)
}
