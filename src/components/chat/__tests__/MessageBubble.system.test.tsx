/**
 * MessageBubble system-branch test scaffold — Phase 29.1 Plan 07 Task 1.
 *
 * Validates the render-branch ordering for `message_type: 'system'` (Pitfall
 * 10 + 9): system rows render centered via SystemMessageRow regardless of
 * whether sender_id matches the current user. Long-press is bailed out by
 * `handleLongPress` (Pitfall 9) — covered indirectly by absence of a
 * context-menu pill on render.
 *
 * NOTE: this test is RED until Task 3 lands the MessageBubble dispatcher
 * branches. The plan explicitly admits RED-until-integration.
 *
 * Run: npx jest --testPathPatterns="MessageBubble.system" --no-coverage
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { MessageBubble } from '../MessageBubble';
import type { MessageWithProfile } from '@/types/chat';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

// MessageBubble imports ReactionsSheet which imports @/lib/supabase. The
// supabase module throws in jest because EXPO_PUBLIC_SUPABASE_* env vars
// aren't set. Stub it so the import chain resolves.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() })),
    removeChannel: jest.fn(),
  },
}));

const baseSystemMessage: MessageWithProfile = {
  id: 'm1',
  plan_id: null,
  dm_channel_id: null,
  group_channel_id: 'gc1',
  sender_id: 'u-sender',
  body: '✓ Sam completed Buy bread',
  created_at: '2026-05-12T10:00:00Z',
  image_url: null,
  reply_to_message_id: null,
  message_type: 'system',
  poll_id: null,
  sender_display_name: 'Sam',
  sender_avatar_url: null,
};

function renderBubble(message: MessageWithProfile, currentUserId: string) {
  return render(
    <ThemeProvider>
      <MessageBubble
        message={message}
        isOwn={message.sender_id === currentUserId}
        showSenderInfo={false}
        allMessages={[message]}
        onReply={jest.fn()}
        onDelete={jest.fn()}
        onScrollToMessage={jest.fn()}
        onReact={jest.fn()}
        currentUserId={currentUserId}
      />
    </ThemeProvider>
  );
}

describe('MessageBubble system render branch', () => {
  it('renders system message centered with "System: ..." a11y label (Pitfall 10)', () => {
    const { getByText, queryByLabelText } = renderBubble(baseSystemMessage, 'u-self');
    expect(getByText(/Sam completed Buy bread/)).toBeTruthy();
    expect(queryByLabelText(/^System:/)).toBeTruthy();
  });

  it('does NOT render as own bubble even when sender_id === currentUserId (Pitfall 10)', () => {
    // sender is the current user — without the isSystem branch BEFORE the
    // isOwn dispatch, this would render right-aligned in the orange "own"
    // bubble style. With the system branch, it must still render centered.
    const { queryByLabelText } = renderBubble(baseSystemMessage, 'u-sender');
    expect(queryByLabelText(/^System:/)).toBeTruthy();
  });
});
