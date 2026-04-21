import type { MessageReaction } from '@/types/chat';

export function aggregateReactions(
  rawReactions: { emoji: string; user_id: string }[],
  currentUserId: string,
): MessageReaction[] {
  const map = new Map<string, { count: number; reacted_by_me: boolean }>();
  for (const r of rawReactions) {
    const entry = map.get(r.emoji) ?? { count: 0, reacted_by_me: false };
    entry.count += 1;
    if (r.user_id === currentUserId) entry.reacted_by_me = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.entries()).map(([emoji, { count, reacted_by_me }]) => ({
    emoji,
    count,
    reacted_by_me,
  }));
}
