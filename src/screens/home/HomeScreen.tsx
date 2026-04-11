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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { FAB } from '@/components/common/FAB';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useHomeScreen } from '@/hooks/useHomeScreen';
import { OwnStatusCard } from '@/components/status/OwnStatusCard';
import { StatusPickerSheet } from '@/components/status/StatusPickerSheet';
import { RadarViewToggle } from '@/components/home/RadarViewToggle';
import { RadarView } from '@/components/home/RadarView';
import { useViewPreference } from '@/hooks/useViewPreference';

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { friends, error, refreshing, handleRefresh } = useHomeScreen();

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
            <View style={styles.cardsPlaceholder}>
              <Text style={styles.placeholderHeading}>Cards View</Text>
              <Text style={styles.placeholderBody}>Coming in the next update.</Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      <StatusPickerSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />

      {/* FAB */}
      <FAB
        icon={<Ionicons name="add" size={20} color={COLORS.surface.base} />}
        label="Start Plan"
        onPress={() => router.push('/plan-create')}
        accessibilityLabel="Create a new plan"
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
  cardsPlaceholder: {
    height: 320,
    backgroundColor: COLORS.surface.base,
    borderRadius: RADII.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderHeading: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  placeholderBody: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text.secondary,
  },
});
