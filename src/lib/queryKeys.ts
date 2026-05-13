// Phase 31 — Central query-key factory taxonomy. SINGLE SOURCE OF TRUTH.
// Every useQuery / useMutation / queryClient.invalidateQueries call in src/hooks/ and
// src/screens/ MUST reach through this factory. Inline arrays like
// queryKey: ['habits', 'overview', today] are forbidden — they bypass the taxonomy and
// make prefix-based invalidation impossible.
//
// Hierarchical pattern: queryKeys.habits.overview(today) returns
//   ['habits', 'overview', today] as const
// and invalidateQueries({ queryKey: queryKeys.habits.all() }) invalidates every habit
// query at once (TSQ-07).
//
// Per-user keys (list(userId), etc.) are defense-in-depth on top of the auth bridge's
// removeQueries() on SIGNED_OUT — even if a query slipped through, a different user's
// useQuery runs with a different key.

export const queryKeys = {
  habits: {
    all: () => ['habits'] as const,
    overview: (dateLocal: string) => [...queryKeys.habits.all(), 'overview', dateLocal] as const,
    detail: (habitId: string) => [...queryKeys.habits.all(), 'detail', habitId] as const,
    streak: (userId: string) => [...queryKeys.habits.all(), 'streak', userId] as const,
  },

  todos: {
    all: () => ['todos'] as const,
    mine: (today: string) => [...queryKeys.todos.all(), 'mine', today] as const,
    fromChats: (today: string) => [...queryKeys.todos.all(), 'fromChats', today] as const,
    chatList: (groupChannelId: string) => [...queryKeys.todos.all(), 'chatList', groupChannelId] as const,
  },

  chat: {
    all: () => ['chat'] as const,
    list: (userId: string) => [...queryKeys.chat.all(), 'list', userId] as const,
    room: (channelId: string) => [...queryKeys.chat.all(), 'room', channelId] as const,
    messages: (channelId: string, opts: { before?: string } = {}) =>
      [...queryKeys.chat.room(channelId), 'messages', opts] as const,
    members: (channelId: string) => [...queryKeys.chat.room(channelId), 'members'] as const,
  },

  plans: {
    all: () => ['plans'] as const,
    list: (userId: string) => [...queryKeys.plans.all(), 'list', userId] as const,
    detail: (planId: string) => [...queryKeys.plans.all(), 'detail', planId] as const,
    photos: (planId: string) => [...queryKeys.plans.all(), 'photos', planId] as const,
    allPhotos: (userId: string) => [...queryKeys.plans.all(), 'allPhotos', userId] as const,
  },

  friends: {
    all: () => ['friends'] as const,
    list: (userId: string) => [...queryKeys.friends.all(), 'list', userId] as const,
    detail: (friendId: string) => [...queryKeys.friends.all(), 'detail', friendId] as const,
    ofFriend: (friendId: string) => [...queryKeys.friends.all(), 'ofFriend', friendId] as const,
    pendingRequests: (userId: string) => [...queryKeys.friends.all(), 'pendingRequests', userId] as const,
    wishList: (userId: string) => [...queryKeys.friends.all(), 'wishList', userId] as const,
  },

  expenses: {
    all: () => ['expenses'] as const,
    list: (userId: string) => [...queryKeys.expenses.all(), 'list', userId] as const,
    detail: (expenseId: string) => [...queryKeys.expenses.all(), 'detail', expenseId] as const,
    withFriend: (friendId: string) => [...queryKeys.expenses.all(), 'withFriend', friendId] as const,
    iouSummary: (userId: string) => [...queryKeys.expenses.all(), 'iouSummary', userId] as const,
  },

  home: {
    all: () => ['home'] as const,
    friends: (userId: string) => [...queryKeys.home.all(), 'friends', userId] as const,
    upcomingEvents: (userId: string) => [...queryKeys.home.all(), 'upcomingEvents', userId] as const,
    upcomingBirthdays: (userId: string) => [...queryKeys.home.all(), 'upcomingBirthdays', userId] as const,
    invitationCount: (userId: string) => [...queryKeys.home.all(), 'invitationCount', userId] as const,
    pendingRequestCount: (userId: string) => [...queryKeys.home.all(), 'pendingRequestCount', userId] as const,
    spotlight: (userId: string) => [...queryKeys.home.all(), 'spotlight', userId] as const,
  },

  polls: {
    all: () => ['polls'] as const,
    poll: (pollId: string) => [...queryKeys.polls.all(), 'poll', pollId] as const,
    wishListVotes: (wishItemId: string) => [...queryKeys.polls.all(), 'wishListVotes', wishItemId] as const,
  },

  status: {
    all: () => ['status'] as const,
    invitations: (userId: string) => [...queryKeys.status.all(), 'invitations', userId] as const,
    own: (userId: string) => [...queryKeys.status.all(), 'own', userId] as const,
  },
} as const;
