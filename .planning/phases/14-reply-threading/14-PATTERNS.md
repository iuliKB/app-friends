# Phase 14: Reply Threading - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 5 (4 modified source files + 1 new migration)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/chat/MessageBubble.tsx` | component | event-driven | `src/components/chat/MessageBubble.tsx` (self) | self — extend existing |
| `src/components/chat/SendBar.tsx` | component | event-driven | `src/components/status/StatusPickerSheet.tsx` | role-match (PanResponder + Modal pattern) |
| `src/hooks/useChatRoom.ts` | hook | CRUD + request-response | `src/hooks/useChatRoom.ts` (self) | self — extend existing |
| `src/screens/chat/ChatRoomScreen.tsx` | screen | request-response | `src/screens/chat/ChatRoomScreen.tsx` (self) | self — extend existing |
| `supabase/migrations/0019_reply_threading.sql` | migration | CRUD | `supabase/migrations/0018_chat_v1_5.sql` | exact (same table, same RLS pattern) |

---

## Pattern Assignments

### `src/components/chat/MessageBubble.tsx` (component, event-driven)

**Analog:** Self — extend existing file (`src/components/chat/MessageBubble.tsx`)

This file receives three new capabilities:
1. Long-press opens a context menu overlay (Modal)
2. Renders a `QuotedBlock` sub-component inside the bubble when `reply_to_message_id` is non-null
3. Accepts a `highlighted` prop that triggers a background color flash animation

---

#### Imports pattern — current file (lines 1-5):
```typescript
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import type { MessageWithProfile } from '@/types/chat';
```

**Add to imports for Phase 14:**
```typescript
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
```

---

#### Props interface — current (lines 7-11):
```typescript
interface MessageBubbleProps {
  message: MessageWithProfile;
  isOwn: boolean;
  showSenderInfo: boolean;
}
```

**Extend for Phase 14:**
```typescript
interface MessageBubbleProps {
  message: MessageWithProfile;
  isOwn: boolean;
  showSenderInfo: boolean;
  // Phase 14 additions:
  allMessages: MessageWithProfile[];           // for QuotedBlock lookup
  highlighted?: boolean;                       // triggers flash animation when true
  onReply: (message: MessageWithProfile) => void;
  onDelete: (messageId: string) => void;
  onScrollToMessage: (messageId: string) => void;
}
```

---

#### Tap animation pattern (lines 50-76) — copy this pattern for onLongPress state:
```typescript
// Existing tap → timestamp toggle: copy the Animated.Value + timing pattern
const fadeAnim = useRef(new Animated.Value(0)).current;
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleTap() {
  if (showTimestamp) return;
  setShowTimestamp(true);
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 200,
    useNativeDriver: true,   // opacity — native driver is fine here
  }).start();

  timerRef.current = setTimeout(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowTimestamp(false));
  }, 2500);
}
```

**New — highlight flash animation (useNativeDriver: false required for backgroundColor):**
```typescript
// [ASSUMED — standard RN color interpolation; useNativeDriver: false is mandatory]
const highlightAnim = useRef(new Animated.Value(0)).current;

// eslint-disable-next-line campfire/no-hardcoded-styles
const highlightBg = highlightAnim.interpolate({
  inputRange: [0, 1],
  outputRange: ['transparent', 'rgba(249, 115, 22, 0.2)'],
});

useEffect(() => {
  if (!highlighted) return;
  Animated.sequence([
    Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
    Animated.timing(highlightAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
  ]).start();
}, [highlighted]);
```

---

#### Both gestures on TouchableOpacity — current (line 82):
```typescript
<TouchableOpacity style={styles.ownContainer} onPress={handleTap} activeOpacity={0.8}>
```

**Extend for long-press (D-02 — both gestures coexist):**
```typescript
<TouchableOpacity
  style={styles.ownContainer}
  onPress={handleTap}
  onLongPress={handleLongPress}   // add alongside existing onPress
  activeOpacity={0.8}
>
```

---

#### Context menu Modal — pattern source: `src/components/chat/SendBar.tsx` (lines 101-131):
```typescript
// SendBar Modal pattern — transparent backdrop + absolute sheet
<Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
  <TouchableWithoutFeedback onPress={closeMenu}>
    <View style={styles.backdrop} />
  </TouchableWithoutFeedback>
  <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
    {/* sheet contents */}
  </Animated.View>
</Modal>
```

**For context menu pill — adapt to absolute positioned pill (not bottom sheet):**
```typescript
// Context menu pill positioned above tapped bubble using nativeEvent.pageY from onLongPress
// Backdrop uses same TouchableWithoutFeedback pattern
<Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
  <TouchableWithoutFeedback onPress={closeMenu}>
    <View style={StyleSheet.absoluteFillObject} />
  </TouchableWithoutFeedback>
  <View style={[styles.contextPill, { top: pillY }]}>
    <TouchableOpacity onPress={handleReply} style={styles.pillAction}>
      <Ionicons name="return-down-back" size={20} color={COLORS.text.primary} />
      <Text style={styles.pillLabel}>Reply</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={handleCopy} style={styles.pillAction}>
      <Ionicons name="copy-outline" size={20} color={COLORS.text.primary} />
      <Text style={styles.pillLabel}>Copy</Text>
    </TouchableOpacity>
    {isOwn && !message.pending && (
      <TouchableOpacity onPress={handleDelete} style={styles.pillAction}>
        <Ionicons name="trash-outline" size={20} color={COLORS.interactive.destructive} />
        <Text style={[styles.pillLabel, { color: COLORS.interactive.destructive }]}>Delete</Text>
      </TouchableOpacity>
    )}
  </View>
</Modal>
```

---

#### ActionRow visual pattern — from `SendBar.tsx` (lines 112-128):
```typescript
// Existing icon + label row format — copy for pill actions
<TouchableOpacity
  key={action.id}
  style={[styles.actionRow, i > 0 && styles.actionRowBorder]}
  onPress={() => handleAction(action.id)}
  activeOpacity={0.7}
  accessibilityLabel={action.label}
>
  <Text style={styles.actionIcon}>{action.icon}</Text>
  <View style={styles.actionText}>
    <Text style={styles.actionLabel}>{action.label}</Text>
    <Text style={styles.actionSub}>{action.sub}</Text>
  </View>
  <Ionicons name="chevron-forward" size={18} color={COLORS.text.secondary} />
</TouchableOpacity>
```

---

#### Deleted message placeholder — pattern from `isOwn` conditional (lines 80-93):

The existing body render `<Text style={styles.ownBody}>{message.body}</Text>` must be replaced with a conditional:

```typescript
// Replace direct body render with guard:
const isDeleted = message.message_type === 'deleted';
const bodyText = isDeleted ? 'Message deleted.' : (message.body ?? '');
const bodyStyle = isDeleted ? styles.deletedBody : (isOwn ? styles.ownBody : styles.othersBody);

<Text style={bodyStyle}>{bodyText}</Text>
```

---

#### QuotedBlock sub-component — new (no existing analog; based on D-07, D-08, D-09):
```typescript
// Place above body text inside the bubble container
// Data resolved from allMessages prop — no fetch
function QuotedBlock({
  replyToId,
  allMessages,
  isOwn,
  onPress,
}: {
  replyToId: string;
  allMessages: MessageWithProfile[];
  isOwn: boolean;
  onPress: () => void;
}) {
  const original = allMessages.find((m) => m.id === replyToId);
  // D-08: own messages → accent orange, others → secondary grey
  const accentColor = isOwn ? COLORS.interactive.accent : COLORS.text.secondary;

  const senderName = original?.sender_display_name ?? 'Unknown';
  const previewText = original
    ? original.message_type === 'deleted'
      ? 'Message deleted.'
      : (original.body ?? (original.image_url ? '📷 Photo' : 'Message deleted.'))
    : 'Original message deleted.';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quotedBlock}>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <View style={styles.quotedContent}>
          <Text style={[styles.quotedSender, { color: accentColor }]} numberOfLines={1}>
            {senderName}
          </Text>
          <Text style={styles.quotedPreview} numberOfLines={1}>
            {previewText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

**Styles for QuotedBlock (all tokens — note the 4px accent bar width):**
```typescript
quotedBlock: {
  flexDirection: 'row',
  backgroundColor: COLORS.surface.overlay,
  borderRadius: RADII.xs,
  marginBottom: SPACING.xs,
  overflow: 'hidden',
},
accentBar: {
  // eslint-disable-next-line campfire/no-hardcoded-styles
  width: 4,
  borderRadius: RADII.xs,
},
quotedContent: {
  flex: 1,
  paddingVertical: SPACING.xs,
  paddingHorizontal: SPACING.sm,
},
quotedSender: {
  fontSize: FONT_SIZE.sm,
  fontWeight: FONT_WEIGHT.semibold,
},
quotedPreview: {
  fontSize: FONT_SIZE.sm,
  fontWeight: FONT_WEIGHT.regular,
  color: COLORS.text.secondary,
},
deletedBody: {
  fontSize: FONT_SIZE.lg,
  fontWeight: FONT_WEIGHT.regular,
  color: COLORS.text.secondary,
  fontStyle: 'italic',   // eslint-disable-next-line campfire/no-hardcoded-styles
},
```

---

### `src/components/chat/SendBar.tsx` (component, event-driven)

**Analog:** `src/components/status/StatusPickerSheet.tsx` — PanResponder swipe-down dismiss pattern

This file receives: new optional `replyContext` prop + reply preview bar rendered above the input row, with swipe-down dismiss (PanResponder) and × button dismiss.

---

#### Imports pattern — current file (lines 1-13):
```typescript
import React, { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
```

**Add to imports for Phase 14:**
```typescript
import { Animated, Modal, PanResponder, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
```

---

#### Props interface — current (lines 17-20):
```typescript
interface SendBarProps {
  onSend: (body: string) => void;
  onAttachmentAction?: (action: AttachmentAction) => void;
}
```

**Extend for Phase 14:**
```typescript
export interface ReplyContext {
  messageId: string;
  senderName: string;
  previewText: string;
}

interface SendBarProps {
  onSend: (body: string) => void;
  onAttachmentAction?: (action: AttachmentAction) => void;
  replyContext?: ReplyContext | null;      // Phase 14: reply bar
  onClearReply?: () => void;              // Phase 14: × button + swipe dismiss
}
```

---

#### handleSend — current (lines 35-40):
```typescript
function handleSend() {
  if (!canSend) return;
  const body = text.trim();
  setText('');
  onSend(body);
}
```

**Extend — call onClearReply on send:**
```typescript
function handleSend() {
  if (!canSend) return;
  const body = text.trim();
  setText('');
  onSend(body);
  onClearReply?.();    // Phase 14: clear reply bar after send (D-14)
}
```

---

#### PanResponder pattern — source: `StatusPickerSheet.tsx` (lines 67-90):
```typescript
// Attach to reply bar drag area only — same pattern as StatusPickerSheet
const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
    onPanResponderMove: (_, gs) => {
      if (gs.dy > 0) replyBarTranslateY.setValue(gs.dy);
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 60 || gs.vy > 0.5) {
        onClearReply?.();
        replyBarTranslateY.setValue(0);   // reset for next open
      } else {
        Animated.timing(replyBarTranslateY, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    },
  })
).current;
```

---

#### translateY animation — source: `SendBar.tsx` itself (lines 31, 43-57):
```typescript
// Existing attachment sheet uses translateY — same Animated.Value pattern for reply bar show/hide
const translateY = useRef(new Animated.Value(300)).current;

function openMenu() {
  setMenuVisible(true);
  Animated.timing(translateY, {
    toValue: 0,
    duration: 250,
    useNativeDriver: true,
  }).start();
}

function closeMenu() {
  Animated.timing(translateY, {
    toValue: 300,
    duration: 200,
    useNativeDriver: true,
  }).start(() => setMenuVisible(false));
}
```

**For reply bar — simpler conditional render (no animation required if reply bar is inline static):**
```typescript
// Reply bar can be a simple conditional View above the input row
// (no translateY needed — it statically pushes the container up)
{replyContext && (
  <View {...panResponder.panHandlers} style={styles.replyBar}>
    <View style={styles.replyBarContent}>
      <Ionicons name="return-down-back" size={16} color={COLORS.interactive.accent} />
      <View style={styles.replyBarText}>
        <Text style={styles.replyBarLabel} numberOfLines={1}>
          Replying to {replyContext.senderName}
        </Text>
        <Text style={styles.replyBarPreview} numberOfLines={1}>
          {replyContext.previewText}
        </Text>
      </View>
    </View>
    <TouchableOpacity onPress={onClearReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="close" size={20} color={COLORS.text.secondary} />
    </TouchableOpacity>
  </View>
)}
```

---

#### Modal backdrop pattern — current `SendBar.tsx` (lines 101-109):
```typescript
// Use same pattern for context menu backdrop in MessageBubble
<Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
  <TouchableWithoutFeedback onPress={closeMenu}>
    <View style={styles.backdrop} />
  </TouchableWithoutFeedback>
  ...
</Modal>

// backdrop style (line 155-159):
backdrop: {
  ...StyleSheet.absoluteFillObject,
  // eslint-disable-next-line campfire/no-hardcoded-styles
  backgroundColor: 'rgba(0,0,0,0.5)',
},
```

---

### `src/hooks/useChatRoom.ts` (hook, CRUD + request-response)

**Analog:** Self — extend existing file (`src/hooks/useChatRoom.ts`)

Two additions: extend `sendMessage` signature to accept `replyToId?`, and add new `deleteMessage` function.

---

#### Imports — current (lines 1-5):
```typescript
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Message, MessageType, MessageWithProfile } from '@/types/chat';
```

**Update `MessageType` import — add `'deleted'` after migration 0019 lands:**
The `MessageType` type in `src/types/chat.ts` (line 1) must include `'deleted'`:
```typescript
export type MessageType = 'text' | 'image' | 'poll' | 'deleted';
```

---

#### UseChatRoomResult interface — current (lines 13-18):
```typescript
interface UseChatRoomResult {
  messages: MessageWithProfile[];
  loading: boolean;
  error: string | null;
  sendMessage: (body: string) => Promise<{ error: Error | null }>;
}
```

**Extend for Phase 14:**
```typescript
interface UseChatRoomResult {
  messages: MessageWithProfile[];
  loading: boolean;
  error: string | null;
  sendMessage: (body: string, replyToId?: string) => Promise<{ error: Error | null }>;
  deleteMessage: (messageId: string) => Promise<{ error: Error | null }>;
}
```

---

#### sendMessage — current (lines 277-317):
```typescript
async function sendMessage(body: string): Promise<{ error: Error | null }> {
  if (!currentUserId) return { error: new Error('Not authenticated') };

  const tempId = Date.now().toString();

  const optimistic: MessageWithProfile = {
    id: tempId,
    plan_id: planId ?? null,
    dm_channel_id: dmChannelId ?? null,
    group_channel_id: groupChannelId ?? null,
    sender_id: currentUserId,
    body,
    created_at: new Date().toISOString(),
    image_url: null,
    reply_to_message_id: null,    // <-- extend this to replyToId ?? null
    message_type: 'text',
    poll_id: null,
    pending: true,
    tempId,
    sender_display_name: currentUserDisplayName,
    sender_avatar_url: currentUserAvatarUrl,
  };

  setMessages((prev) => [optimistic, ...prev]);

  const { error: insertError } = await supabase.from('messages').insert({
    plan_id: planId ?? null,
    dm_channel_id: dmChannelId ?? null,
    group_channel_id: groupChannelId ?? null,
    sender_id: currentUserId,
    body,
    // Add: reply_to_message_id: replyToId ?? null,
  });

  if (insertError) {
    setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
    return { error: insertError };
  }

  return { error: null };
}
```

**Minimal diff for Phase 14 (D-16):**
```typescript
// Change signature — optional param, backward-compatible
async function sendMessage(body: string, replyToId?: string): Promise<{ error: Error | null }> {
  // ...
  const optimistic: MessageWithProfile = {
    // ...existing fields...
    reply_to_message_id: replyToId ?? null,   // was hardcoded null
  };
  // ...
  const { error: insertError } = await supabase.from('messages').insert({
    // ...existing fields...
    reply_to_message_id: replyToId ?? null,   // new field passed to DB
  });
  // ...
}
```

---

#### deleteMessage — new function (pattern from optimistic sendMessage rollback model):
```typescript
async function deleteMessage(messageId: string): Promise<{ error: Error | null }> {
  if (!currentUserId) return { error: new Error('Not authenticated') };

  // Stash original body before optimistic update (Pitfall 4 from RESEARCH.md)
  const originalBody = messages.find((m) => m.id === messageId)?.body ?? null;

  // Optimistic update — set body null + message_type 'deleted'
  setMessages((prev) =>
    prev.map((m) =>
      m.id === messageId ? { ...m, body: null, message_type: 'deleted' as MessageType } : m
    )
  );

  const { error: updateError } = await supabase
    .from('messages')
    .update({ body: null, message_type: 'deleted' })
    .eq('id', messageId)
    .eq('sender_id', currentUserId);

  if (updateError) {
    // Rollback optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, body: originalBody, message_type: 'text' as MessageType } : m
      )
    );
    return { error: updateError };
  }

  return { error: null };
}
```

---

#### subscribeRealtime — current INSERT listener (lines 181-263):
```typescript
channelRef.current = supabase
  .channel(channelName)
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter },
    (payload) => { /* existing INSERT handler */ }
  )
  .subscribe();
```

**Add UPDATE listener alongside INSERT for soft-delete propagation:**
```typescript
channelRef.current = supabase
  .channel(channelName)
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter },
    (payload) => { /* existing INSERT handler — unchanged */ }
  )
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'messages', filter },
    (payload) => {
      const raw = payload.new as Record<string, unknown>;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === raw.id
            ? {
                ...m,
                body: raw.body as string | null,
                message_type: (raw.message_type as string) as MessageType,
              }
            : m
        )
      );
    }
  )
  .subscribe();
```

---

### `src/screens/chat/ChatRoomScreen.tsx` (screen, request-response)

**Analog:** Self — extend existing file (`src/screens/chat/ChatRoomScreen.tsx`)

Additions: `useRef<FlatList>` for `scrollToIndex`, reply state (`replyContext`), `handleReply` / `handleDelete` callbacks passed to `MessageBubble`, toast render for out-of-window case.

---

#### Imports — current (lines 1-27):
```typescript
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// ...
```

**Add to imports for Phase 14:**
```typescript
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ReplyContext } from '@/components/chat/SendBar';
```

---

#### useChatRoom destructure — current (line 50):
```typescript
const { messages, loading: _loading, sendMessage } = useChatRoom({ planId, dmChannelId, groupChannelId });
```

**Extend:**
```typescript
const { messages, loading: _loading, sendMessage, deleteMessage } = useChatRoom({ planId, dmChannelId, groupChannelId });
```

---

#### FlatList ref — add (no ref exists currently; confirmed by RESEARCH.md):
```typescript
const flatListRef = useRef<FlatList<MessageWithProfile>>(null);
```

---

#### Reply state:
```typescript
const [replyContext, setReplyContext] = useState<ReplyContext | null>(null);
```

---

#### Toast state (Animated pattern from existing `fadeAnim` in MessageBubble):
```typescript
const toastAnim = useRef(new Animated.Value(0)).current;
const [toastVisible, setToastVisible] = useState(false);

function showToast() {
  setToastVisible(true);
  Animated.sequence([
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    Animated.delay(2000),
    Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
  ]).start(() => setToastVisible(false));
}
```

---

#### Highlighted message state:
```typescript
const [highlightedId, setHighlightedId] = useState<string | null>(null);
```

---

#### scrollToMessage — new handler:
```typescript
function scrollToMessage(messageId: string) {
  const index = messages.findIndex((m) => m.id === messageId);
  if (index === -1) {
    showToast();
    return;
  }
  flatListRef.current?.scrollToIndex({ index, animated: true });
  setHighlightedId(messageId);
  // Clear highlight after flash duration
  setTimeout(() => setHighlightedId(null), 1200);
}
```

---

#### handleSend — current (lines 77-82):
```typescript
async function handleSend(body: string) {
  const { error } = await sendMessage(body);
  if (error) {
    Alert.alert('Error', 'Message failed to send.', [{ text: 'OK' }]);
  }
}
```

**Extend to pass replyToId:**
```typescript
async function handleSend(body: string) {
  const replyToId = replyContext?.messageId;
  const { error } = await sendMessage(body, replyToId);
  if (error) {
    Alert.alert('Error', 'Message failed to send.', [{ text: 'OK' }]);
  }
}
```

---

#### FlatList — current (lines 114-139):
```typescript
<FlatList
  inverted
  data={messages}
  keyExtractor={(item) => item.id}
  renderItem={({ item, index }) => {
    // ...
    return (
      <View>
        {showSeparator && <Text style={styles.timeSeparator}>...</Text>}
        <MessageBubble
          message={item}
          isOwn={item.sender_id === currentUserId}
          showSenderInfo={isFirstInGroup(messages, index)}
        />
      </View>
    );
  }}
  contentContainerStyle={styles.listContent}
/>
```

**Extend with ref, onScrollToIndexFailed, and new MessageBubble props:**
```typescript
<FlatList
  ref={flatListRef}
  inverted
  data={messages}
  keyExtractor={(item) => item.id}
  renderItem={({ item, index }) => {
    const olderMsg = index < messages.length - 1 ? messages[index + 1] : undefined;
    const showSeparator = shouldShowTimeSeparator(item, olderMsg);
    return (
      <View>
        {showSeparator && (
          <Text style={styles.timeSeparator}>{formatTimeSeparator(item.created_at)}</Text>
        )}
        <MessageBubble
          message={item}
          isOwn={item.sender_id === currentUserId}
          showSenderInfo={isFirstInGroup(messages, index)}
          allMessages={messages}
          highlighted={highlightedId === item.id}
          onReply={(msg) =>
            setReplyContext({
              messageId: msg.id,
              senderName: msg.sender_display_name,
              previewText: msg.body ?? (msg.image_url ? '📷 Photo' : ''),
            })
          }
          onDelete={(id) => deleteMessage(id)}
          onScrollToMessage={scrollToMessage}
        />
      </View>
    );
  }}
  contentContainerStyle={styles.listContent}
  onScrollToIndexFailed={(info) => {
    // Fallback — treat like out-of-window (D-11)
    showToast();
  }}
/>
```

---

#### SendBar — current (line 141):
```typescript
<SendBar onSend={handleSend} onAttachmentAction={handleAttachmentAction} />
```

**Extend with reply props:**
```typescript
<SendBar
  onSend={handleSend}
  onAttachmentAction={handleAttachmentAction}
  replyContext={replyContext}
  onClearReply={() => setReplyContext(null)}
/>
```

---

#### Toast render — add inside the KeyboardAvoidingView, above `<SendBar>`:
```typescript
{toastVisible && (
  <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
    <Text style={styles.toastText}>Scroll up to see original message</Text>
  </Animated.View>
)}
```

**Toast styles:**
```typescript
toast: {
  position: 'absolute',
  bottom: SPACING.xxl,
  alignSelf: 'center',
  backgroundColor: COLORS.surface.card,
  borderRadius: RADII.pill,
  paddingHorizontal: SPACING.md,
  paddingVertical: SPACING.sm,
  borderWidth: 1,
  borderColor: COLORS.border,
},
toastText: {
  fontSize: FONT_SIZE.sm,
  fontWeight: FONT_WEIGHT.regular,
  color: COLORS.text.secondary,
},
```

---

### `supabase/migrations/0019_reply_threading.sql` (migration, CRUD)

**Analog:** `supabase/migrations/0018_chat_v1_5.sql`

This migration must: (1) add `'deleted'` to the `message_type` CHECK constraint, (2) add the `messages_soft_delete_own` RLS UPDATE policy. Both unblock the soft-delete `deleteMessage()` function.

---

#### Migration header — copy from `0018_chat_v1_5.sql` (lines 1-6):
```sql
-- Phase v1.5 Migration 0019 — Reply threading: soft-delete support + RLS UPDATE policy.
-- Implements Phase 14 schema requirements per 14-RESEARCH.md Pitfalls 1 and 2.
-- Decisions: add 'deleted' to message_type CHECK, add messages_soft_delete_own UPDATE policy.
```

---

#### ALTER TABLE pattern — from `0018` (lines 15-31):
```sql
-- Step 1: Drop old message_type CHECK and add new one that includes 'deleted'
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Recreate with 'deleted' added (mirror of 0018 Step 1b CHECK syntax)
ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'poll', 'deleted'));

-- Step 2: Allow body=NULL for deleted messages
-- The existing messages_body_required CHECK:
--   CHECK (message_type <> 'text' OR body IS NOT NULL)
-- Already permits NULL when message_type != 'text'.
-- Setting message_type='deleted' + body=NULL satisfies this constraint — no change needed.
```

---

#### RLS UPDATE policy — pattern from `0018` `poll_votes_update_own` (lines 187-197):
```sql
-- Step 3: Add UPDATE RLS policy for soft-delete (mirrors poll_votes_update_own pattern)
CREATE POLICY "messages_soft_delete_own"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = (SELECT auth.uid()))
  WITH CHECK (sender_id = (SELECT auth.uid()));
```

---

## Shared Patterns

### Animated.timing — opacity (useNativeDriver: true)
**Source:** `src/components/chat/MessageBubble.tsx` lines 57-70
**Apply to:** Toast fade in/out in `ChatRoomScreen`, reply bar slide in/out in `SendBar`
```typescript
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 200,
  useNativeDriver: true,   // safe for opacity and transform
}).start();
```

---

### Animated.timing — color interpolation (useNativeDriver: false)
**Source:** Pattern from RESEARCH.md §Pattern 3 (ASSUMED — standard RN)
**Apply to:** Highlight flash in `MessageBubble`
```typescript
// eslint-disable-next-line campfire/no-hardcoded-styles
const highlightBg = highlightAnim.interpolate({
  inputRange: [0, 1],
  outputRange: ['transparent', 'rgba(249, 115, 22, 0.2)'],
});
// MUST use useNativeDriver: false — backgroundColor is not natively animatable
Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
```

---

### Modal + TouchableWithoutFeedback backdrop dismiss
**Source:** `src/components/chat/SendBar.tsx` lines 101-109 and `src/components/status/StatusPickerSheet.tsx` lines 93-97
**Apply to:** Context menu overlay in `MessageBubble`, any new Modal in this phase
```typescript
<Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
  <TouchableWithoutFeedback onPress={onClose}>
    <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
  </TouchableWithoutFeedback>
  {/* content */}
</Modal>

// Style:
backdrop: {
  backgroundColor: COLORS.overlay,   // 'rgba(0,0,0,0.5)' token
},
```

---

### PanResponder swipe-down dismiss
**Source:** `src/components/status/StatusPickerSheet.tsx` lines 67-90
**Apply to:** Reply preview bar swipe-down dismiss in `SendBar`
```typescript
const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
    onPanResponderMove: (_, gs) => {
      if (gs.dy > 0) translateY.setValue(gs.dy);
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 80 || gs.vy > 0.5) {
        Animated.timing(translateY, { toValue: 600, duration: 200, useNativeDriver: true }).start(onClose);
      } else {
        Animated.timing(translateY, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      }
    },
  })
).current;
// Attach to drag handle: <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
```

---

### Optimistic update + rollback pattern
**Source:** `src/hooks/useChatRoom.ts` lines 282-316 (`sendMessage` optimistic insert + filter-on-error rollback)
**Apply to:** `deleteMessage` function in `useChatRoom`
```typescript
// Pattern: stash original, optimistic mutate, call DB, rollback on error
const tempId = Date.now().toString();
setMessages((prev) => [optimistic, ...prev]);       // or map() for update
const { error } = await supabase.from(...).insert({ ... });
if (error) {
  setMessages((prev) => prev.filter((m) => m.tempId !== tempId));  // or restore original
  return { error };
}
return { error: null };
```

---

### ESLint `no-hardcoded-styles` disable comment
**Source:** `src/components/chat/MessageBubble.tsx` lines 144-150 (repeated throughout codebase)
**Apply to:** Any raw number or rgba string in StyleSheet that has no token equivalent
```typescript
// eslint-disable-next-line campfire/no-hardcoded-styles
width: 4,
// eslint-disable-next-line campfire/no-hardcoded-styles
color: 'rgba(249, 115, 22, 0.2)',
```

---

### Ionicons icon usage
**Source:** `src/components/chat/SendBar.tsx` lines 73, 93-97, 126
**Apply to:** Context menu pill icons in `MessageBubble`, reply bar icon in `SendBar`
```typescript
// Always Ionicons — locked constraint (CONTEXT.md §Project constraints)
import { Ionicons } from '@expo/vector-icons';
<Ionicons name="return-down-back" size={20} color={COLORS.text.primary} />
<Ionicons name="copy-outline" size={20} color={COLORS.text.primary} />
<Ionicons name="trash-outline" size={20} color={COLORS.interactive.destructive} />
<Ionicons name="close" size={20} color={COLORS.text.secondary} />
```

---

## No Analog Found

No files in this phase are entirely novel. All patterns are assembled from existing code.

| File | New Capability | Analog Gap | Resolution |
|---|---|---|---|
| `MessageBubble.tsx` — QuotedBlock | Sub-component with left accent border | No existing quoted block | Use RESEARCH.md §Code Examples as reference; all styles use existing tokens |
| `ChatRoomScreen.tsx` — Toast | Non-blocking fade toast | No existing toast component | Use `Animated.View` + opacity sequence; same pattern as `fadeAnim` in `MessageBubble` |
| `0019_reply_threading.sql` — CHECK alter | Drop + recreate named constraint | No prior DROP CONSTRAINT in migrations | Standard Postgres DDL; pattern consistent with 0018 ADD CONSTRAINT style |

---

## Metadata

**Analog search scope:** `src/components/chat/`, `src/components/status/`, `src/hooks/`, `src/screens/chat/`, `supabase/migrations/`, `src/types/`, `src/theme/`
**Files read:** 9 source files + 2 migration files + 2 planning documents
**Pattern extraction date:** 2026-04-21

**Critical pre-conditions verified from RESEARCH.md:**
- `messages.reply_to_message_id` column exists (migration 0018, line 22) — confirmed
- `messages_body_required` CHECK constraint exists (migration 0018, line 31) — blocks `body=NULL` on `message_type='text'` — migration 0019 must precede `deleteMessage` use
- No UPDATE RLS policy on `messages` table exists across all 18 migrations — migration 0019 required
- `MessageType` in `src/types/chat.ts` line 1 does not include `'deleted'` — must add before hook changes
- FlatList in `ChatRoomScreen.tsx` has no `ref` (line 114) — `useRef<FlatList>` must be added
- `expo-clipboard` availability unverified (Assumption A1 from RESEARCH.md) — verify against `package.json` in Wave 0
