import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { COLORS, FONT_SIZE } from '@/theme';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import { useInvitationCount } from '@/hooks/useInvitationCount';
import { useStatus } from '@/hooks/useStatus';
import { ensureMorningPromptScheduled } from '@/lib/morningPrompt';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  registerForPushNotifications,
  markPushPrePromptSeen,
  setNotificationsEnabledFlag,
  type RegisterResult,
} from '@/hooks/usePushNotifications';
import { PrePromptModal } from '@/components/notifications/PrePromptModal';

export default function TabsLayout() {
  const { count: pendingCount } = usePendingRequestsCount();
  const { count: invitationCount } = useInvitationCount();
  const { touch } = useStatus();
  const insets = useSafeAreaInsets();

  // PUSH-01 + PUSH-02 + PUSH-08 (D-16, D-01..D-03): register token once per authenticated
  // session, re-register on every AppState 'active' transition to catch OS token rotation,
  // and surface the value-led PrePromptModal when the hook reports 'needs_pre_prompt'.
  // Failures are intentionally swallowed — registration must not crash the tabs layout.
  const userId = useAuthStore((s) => s.session?.user?.id);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [registerState, setRegisterState] = useState<RegisterResult>('skipped');

  useEffect(() => {
    if (!userId) return;

    // Initial register + cold-launch touch (HEART-02) + morning prompt schedule (Phase 4 D-22 point 1)
    registerForPushNotifications(userId)
      .then((result) => setRegisterState(result))
      .catch(() => {});
    touch().catch(() => {});
    ensureMorningPromptScheduled().catch(() => {});

    // Foreground re-register + touch (HEART-02 on AppState 'active') — OVR-04:
    // single AppState listener; do NOT add a second one for touch.
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        registerForPushNotifications(userId)
          .then((result) => setRegisterState(result))
          .catch(() => {});
        touch().catch(() => {});
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, [userId, touch]);

  // PrePromptModal handlers (D-02, D-03).
  async function handlePrePromptAccept() {
    if (!userId) return;
    // Mark seen BEFORE re-calling register, so the hook takes the skipEligibilityCheck
    // branch and fires the native iOS prompt exactly once.
    await markPushPrePromptSeen();
    const result = await registerForPushNotifications(userId, {
      skipEligibilityCheck: true,
    }).catch(() => 'skipped' as RegisterResult);
    setRegisterState(result);
  }

  async function handlePrePromptDecline() {
    // D-03: "Not now" does NOT call requestPermissionsAsync. We also set the
    // opt-out flag so the pre-prompt will not re-surface on every foreground.
    await markPushPrePromptSeen();
    await setNotificationsEnabledFlag(false);
    setRegisterState('skipped');
  }

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: COLORS.interactive.accent,
          tabBarInactiveTintColor: COLORS.text.secondary,
          tabBarStyle: {
            backgroundColor: COLORS.surface.card,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 56 + insets.bottom,
            paddingBottom: insets.bottom,
          },
          tabBarLabelStyle: { fontSize: FONT_SIZE.xs },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="squad"
          options={{
            title: 'Squad',
            tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="plans"
          options={{
            title: 'Explore',
            tabBarBadge: invitationCount > 0 ? invitationCount : undefined,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chats',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
            ),
          }}
        />
      </Tabs>
      <PrePromptModal
        visible={registerState === 'needs_pre_prompt'}
        onAccept={handlePrePromptAccept}
        onDecline={handlePrePromptDecline}
      />
    </>
  );
}
