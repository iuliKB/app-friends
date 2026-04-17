import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/theme';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useHomeScreen } from '@/hooks/useHomeScreen';
import { OwnStatusCard } from '@/components/status/OwnStatusCard';
import { StatusPickerSheet } from '@/components/status/StatusPickerSheet';
import { RadarViewToggle } from '@/components/home/RadarViewToggle';
import { RadarView } from '@/components/home/RadarView';
import { CardStackView } from '@/components/home/CardStackView';
import { useViewPreference } from '@/hooks/useViewPreference';
import { usePlans } from '@/hooks/usePlans';
import { useIOUSummary } from '@/hooks/useIOUSummary';
import { useUpcomingBirthdays } from '@/hooks/useUpcomingBirthdays';
import { UpcomingEventsSection } from '@/components/home/UpcomingEventsSection';
import { HomeWidgetRow } from '@/components/home/HomeWidgetRow';

export function HomeScreen() {

  const insets = useSafeAreaInsets();
  const { friends, error, refreshing, handleRefresh } = useHomeScreen();
  usePlans(); // Populates usePlansStore so UpcomingEventsSection can filter client-side
  const iouSummary = useIOUSummary();
  const birthdays = useUpcomingBirthdays();

  // OVR-06: 60s tick to force heartbeat re-evaluation across own + friend rows
  // without a refetch. setHeartbeatTick is enough to trigger a re-render that
  // recomputes computeHeartbeatState() in RadarBubble + the partition above.
  const [, setHeartbeatTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHeartbeatTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const [sheetVisible, setSheetVisible] = useState(false);

  const [view, setView, prefLoading] = useViewPreference();

  // Crossfade animated values — radar starts visible, cards hidden
  const radarOpacity = useRef(new Animated.Value(1)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;

  // Crossfade effect — runs when view changes
  useEffect(() => {
    if (view === 'radar') {
      Animated.parallel([
        Animated.timing(radarOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(cardsOpacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(radarOpacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(cardsOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]).start();
    }
  }, [view, radarOpacity, cardsOpacity]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.sm }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.interactive.accent}
          />
        }
      >
        {/* Screen title */}
        <View style={styles.headerContainer}>
          <ScreenHeader title="Campfire" />
        </View>
        <View style={styles.statusCardContainer}>
          <OwnStatusCard onPress={() => setSheetVisible(true)} />
        </View>

        {/* Error state */}
        {error !== null && (
          <Text style={styles.errorText}>{"Couldn't load friends. Pull down to try again."}</Text>
        )}

        {/* Friends status section header */}
        <View style={styles.freeHeaderContainer}>
          <Text style={styles.freeHeaderTitle}>Free right now 🔥</Text>
          <Text style={styles.freeHeaderSubtitle}>
            {friends.filter((f) => f.status === 'free').length} friends available
          </Text>
        </View>

        {/* View toggle */}
        {!prefLoading && (
          <View style={styles.toggleContainer}>
            <RadarViewToggle value={view} onValueChange={setView} />
          </View>
        )}

        {/* Radar / Cards crossfade */}
        <View style={styles.viewSwitcher}>
          <Animated.View style={{ opacity: radarOpacity }} pointerEvents={view === 'radar' ? 'auto' : 'none'}>
            <RadarView friends={friends} />
          </Animated.View>
          <Animated.View
            style={[styles.absoluteFill, { opacity: cardsOpacity }]}
            pointerEvents={view === 'cards' ? 'auto' : 'none'}
          >
            <CardStackView friends={friends} />
          </Animated.View>
        </View>

        {/* D-09: Upcoming events section — below Radar/Cards view */}
        <UpcomingEventsSection />

        <HomeWidgetRow iouSummary={iouSummary} birthdays={birthdays} />

      </ScrollView>

      <StatusPickerSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    paddingBottom: 100, // no exact token
  },
  headerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  statusCardContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  toggleContainer: {
    marginTop: SPACING.xl,
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
  freeHeaderContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.sm,
  },
  freeHeaderTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  freeHeaderSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
});
