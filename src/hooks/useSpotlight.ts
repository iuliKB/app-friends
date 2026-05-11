// useSpotlight — picks the single most-urgent thing to feature in the Activity
// tab's spotlight slot. Ranking is intentionally simple and deterministic so the
// surfaced item doesn't churn between renders.
//
// Priority (first match wins):
//   1. Nearest birthday within 7 days
//   2. IOU balance with |net| >= $20 AND unsettled count > 0
//   3. Active streak >= 3 weeks
//   4. Fallback: invite to make a plan

import type { IOUSummaryData } from './useIOUSummary';
import type { StreakData } from './useStreakData';
import type { UpcomingBirthdaysData } from './useUpcomingBirthdays';

const URGENT_BDAY_DAYS = 7;
const URGENT_IOU_CENTS = 2000;
const STREAK_BRAG_THRESHOLD = 3;

export type SpotlightKind = 'birthday' | 'iou' | 'streak' | 'fallback';

export interface SpotlightItem {
  kind: SpotlightKind;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  // Tile-level accent — drives icon/border tint. Resolved against theme in tile.
  accent: 'gift' | 'money' | 'flame' | 'neutral';
  // Optional payload for tile-specific rendering (avatar, sign, etc.).
  avatarUrl?: string | null;
  displayName?: string;
  signedAmountCents?: number;
}

export interface SpotlightSources {
  birthdays: UpcomingBirthdaysData;
  iou: IOUSummaryData;
  streak: StreakData;
}

export function selectSpotlight({ birthdays, iou, streak }: SpotlightSources): SpotlightItem {
  const nearest = birthdays.entries[0];
  if (nearest && nearest.days_until <= URGENT_BDAY_DAYS) {
    const when =
      nearest.days_until === 0
        ? 'today'
        : nearest.days_until === 1
          ? 'tomorrow'
          : `in ${nearest.days_until} days`;
    return {
      kind: 'birthday',
      title: `${nearest.display_name}'s birthday ${when}`,
      subtitle: 'Plan a surprise or split a gift',
      cta: 'Open',
      href: '/squad/birthdays',
      accent: 'gift',
      avatarUrl: nearest.avatar_url,
      displayName: nearest.display_name,
    };
  }

  if (Math.abs(iou.netCents) >= URGENT_IOU_CENTS && iou.unsettledCount > 0) {
    const owed = iou.netCents >= 0;
    return {
      kind: 'iou',
      title: owed ? "You're owed money" : 'You owe money',
      subtitle: `${iou.unsettledCount} ${iou.unsettledCount === 1 ? 'IOU' : 'IOUs'} to settle`,
      cta: 'Settle up',
      href: '/squad/expenses',
      accent: 'money',
      signedAmountCents: iou.netCents,
    };
  }

  if (streak.currentWeeks >= STREAK_BRAG_THRESHOLD) {
    return {
      kind: 'streak',
      title: `${streak.currentWeeks}-week squad streak`,
      subtitle: 'Make a plan this week to keep it alive',
      cta: 'Plan',
      href: '/plan-create',
      accent: 'flame',
    };
  }

  return {
    kind: 'fallback',
    title: 'Plan something with your squad',
    subtitle: 'Pick a night and lock it in',
    cta: 'Start',
    href: '/plan-create',
    accent: 'neutral',
  };
}
