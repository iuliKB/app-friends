import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING } from '@/theme';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { useHomeScreen } from '@/hooks/useHomeScreen';
import { StatusCard } from '@/components/home/StatusCard';
import type { StatusKey } from '@/components/home/statusCardTokens';
import { useStatusStore } from '@/stores/useStatusStore';
import { computeHeartbeatState } from '@/lib/heartbeat';
import { StatusPickerSheet } from '@/components/status/StatusPickerSheet';
import { OnboardingHintSheet } from '@/components/onboarding/OnboardingHintSheet';
import { RadarView } from '@/components/home/RadarView';
import { CardStackView } from '@/components/home/CardStackView';
import { useViewPreference } from '@/hooks/useViewPreference';
import { usePlans } from '@/hooks/usePlans';
import { useIOUSummary } from '@/hooks/useIOUSummary';
import { useUpcomingBirthdays } from '@/hooks/useUpcomingBirthdays';
import { UpcomingEventsSection } from '@/components/home/UpcomingEventsSection';
import { MemoriesSection } from '@/components/home/MemoriesSection';
import { YourZoneSection } from '@/components/home/YourZoneSection';
import { HomeTopBar } from '@/components/home/HomeTopBar';
import { FriendsSectionHeader } from '@/components/home/FriendsSectionHeader';

// Heights for the radar / cards crossfade container — close to parity with
// the radar (260px), so the parent height barely shifts between modes.
const VIEW_HEIGHT = {
  radar: 290,
  cards: 290,
};

const ONBOARDING_FLAG_KEY = '@campfire/onboarding_hint_shown';

function formatUntil(expiresAt: string): string {
  const d = new Date(expiresAt);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `until ${h12}${period}` : `until ${h12}:${String(m).padStart(2, '0')}${period}`;
}

export function HomeScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { friends, loading, error, refreshing, handleRefresh, refetch } = useHomeScreen();
  const router = useRouter();

  function handleNavigateToSquad() {
    router.push('/(tabs)/squad');
  }

  const { loading: plansLoading } = usePlans();
  const iouSummary = useIOUSummary();
  const birthdays = useUpcomingBirthdays();

  // OVR-06: 60s tick to force heartbeat re-evaluation across own + friend rows
  // without a refetch.
  const [, setHeartbeatTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHeartbeatTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // --- Onboarding hint sheet ---
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_FLAG_KEY).then((value) => {
      if (!value) setOnboardingVisible(true);
    });
  }, []);
  function handleOnboardingDismiss() {
    AsyncStorage.setItem(ONBOARDING_FLAG_KEY, '1').catch(() => {});
    setOnboardingVisible(false);
  }

  // --- Status picker sheet ---
  const [sheetVisible, setSheetVisible] = useState(false);

  // --- Radar / cards view toggle + crossfade ---
  const [view, setView, prefLoading] = useViewPreference();

  const radarOpacity = useRef(new Animated.Value(1)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  // Container height animates between radar (compact) and cards (tall) modes —
  // cards view is position:absolute so it doesn't push parent layout on its own.
  const switcherHeight = useRef(new Animated.Value(VIEW_HEIGHT.radar)).current;

  useEffect(() => {
    const isRadar = view === 'radar';
    Animated.parallel([
      Animated.timing(radarOpacity, {
        toValue: isRadar ? 1 : 0,
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.timing(cardsOpacity, {
        toValue: isRadar ? 0 : 1,
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.timing(switcherHeight, {
        toValue: isRadar ? VIEW_HEIGHT.radar : VIEW_HEIGHT.cards,
        duration: 250,
        easing: Easing.inOut(Easing.ease),
        // height can't use native driver — runs on JS thread in parallel
        useNativeDriver: false,
        isInteraction: false,
      }),
    ]).start();
  }, [view, radarOpacity, cardsOpacity, switcherHeight]);

  // --- Friend counts for the section header ---
  const { freeCount, maybeCount, totalActiveCount } = useMemo(() => {
    let free = 0;
    let maybe = 0;
    let active = 0;
    for (const f of friends) {
      const state = computeHeartbeatState(f.status_expires_at, f.last_active_at);
      if (state === 'dead') continue;
      active++;
      if (f.status === 'free') free++;
      else if (f.status === 'maybe') maybe++;
    }
    return { freeCount: free, maybeCount: maybe, totalActiveCount: active };
  }, [friends]);

  // --- Own status, mapped to StatusCard's StatusKey domain ---
  const currentStatus = useStatusStore((s) => s.currentStatus);
  const ownStatus: StatusKey = useMemo(() => {
    if (!currentStatus) return 'inactive';
    const state = computeHeartbeatState(
      currentStatus.status_expires_at,
      currentStatus.last_active_at
    );
    if (state === 'dead') return 'inactive';
    return currentStatus.status as StatusKey;
  }, [currentStatus]);
  const ownContextTag = currentStatus?.context_tag ?? undefined;
  const statusExpiry = currentStatus?.status_expires_at
    ? formatUntil(currentStatus.status_expires_at)
    : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          paddingTop: SPACING.sm,
        },
        statusCardContainer: {
          paddingHorizontal: SPACING.lg,
        },
        viewSwitcher: {
          position: 'relative',
        },
        absoluteFill: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
        },
      }),
    []
  );

  const rootStyle = [styles.root, { paddingTop: insets.top }];

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
        <ErrorDisplay
          mode="screen"
          message="Couldn't load your feed. Check your connection."
          onRetry={refetch}
        />
      </View>
    );
  }

  const content = (
    <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.interactive.accent}
          />
        }
      >
        <HomeTopBar />

        <View style={styles.statusCardContainer}>
          <StatusCard
            status={ownStatus}
            context={ownContextTag}
            expiry={statusExpiry}
            onEditPress={() => setSheetVisible(true)}
          />
        </View>

        {!loading && friends.length === 0 ? (
          /* Zero-friends empty state */
          <EmptyState
            icon="people-outline"
            iconType="ionicons"
            heading="No friends yet"
            body="Add a friend to see where they're at and make plans."
            ctaLabel="Add a friend"
            onCta={handleNavigateToSquad}
          />
        ) : (
          <>
            {/* Friends section header — title + free count + radar/cards pill */}
            <FriendsSectionHeader
              freeCount={freeCount}
              maybeCount={maybeCount}
              totalActiveCount={totalActiveCount}
              view={view}
              onViewChange={setView}
              showToggle={!prefLoading}
            />

            {/* Radar / Cards crossfade — animated height between modes */}
            <Animated.View style={[styles.viewSwitcher, { height: switcherHeight }]}>
              <Animated.View
                style={[styles.absoluteFill, { opacity: radarOpacity }]}
                pointerEvents={view === 'radar' ? 'auto' : 'none'}
              >
                <RadarView friends={friends} loading={loading} />
              </Animated.View>
              <Animated.View
                style={[styles.absoluteFill, { opacity: cardsOpacity }]}
                pointerEvents={view === 'cards' ? 'auto' : 'none'}
              >
                <CardStackView friends={friends} loading={loading} />
              </Animated.View>
            </Animated.View>
          </>
        )}

        {/* Upcoming events section — below Radar/Cards view */}
        <UpcomingEventsSection isLoading={plansLoading} />

        {/* Memories — full-width photo slider hero */}
        <MemoriesSection />

        {/* "Your circle" — Streak (left) + Birthdays / IOUs stacked (right) */}
        <YourZoneSection iouSummary={iouSummary} birthdays={birthdays} />
      </ScrollView>

      <StatusPickerSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />

      <OnboardingHintSheet visible={onboardingVisible} onDismiss={handleOnboardingDismiss} />
    </>
  );

  if (isDark) {
    return (
      <LinearGradient
        colors={['#091A07', '#0E0F11', '#0A0C0E']}
        locations={[0, 0.45, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0.8 }}
        style={rootStyle}
      >
        {content}
      </LinearGradient>
    );
  }

  return <View style={[rootStyle, { backgroundColor: colors.surface.base }]}>{content}</View>;
}
