import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII, ANIMATION } from '@/theme';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EventCard } from '@/components/home/EventCard';
import { SkeletonPulse } from '@/components/common/SkeletonPulse';
import { useUpcomingEvents } from '@/hooks/useUpcomingEvents';
import type { PlanWithMembers } from '@/types/plans';

// Hero-card sizing — matches EventCard (240x220). Compact image-on-top layout
// with ~1.4-card peek on a typical iPhone 16 Pro (393pt) screen.

const CARD_WIDTH = 240;

const CARD_HEIGHT = 220;
const CARD_GAP = SPACING.md;

interface UpcomingEventsSectionProps {
  isLoading?: boolean;
}

export function UpcomingEventsSection({ isLoading = false }: UpcomingEventsSectionProps) {
  const { colors } = useTheme();
  const skeletonOpacity = useRef(new Animated.Value(1)).current;

  // Fade out skeleton when isLoading transitions from true → false
  useEffect(() => {
    if (!isLoading) {
      Animated.timing(skeletonOpacity, {
        toValue: 0,
        duration: ANIMATION.duration.normal, // 300ms
        useNativeDriver: true,
      }).start();
    } else {
      skeletonOpacity.setValue(1); // Reset when loading starts again
    }
  }, [isLoading, skeletonOpacity]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          // Section container — no horizontal padding here; header and list handle their own
        },
        headerWrapper: {
          // SectionHeader has no built-in horizontal padding — add it here
          paddingHorizontal: SPACING.lg,
        },
        seeAllText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.interactive.accent, // UI-SPEC: accent color for "See all"
        },
        flatList: {
          // RESEARCH.md Pitfall 1: horizontal FlatList in ScrollView needs explicit height

          height: CARD_HEIGHT, // matches hero EventCard height (300x220)
        },
        listContent: {
          paddingHorizontal: SPACING.lg,
        },
        listPadding: {
          paddingHorizontal: SPACING.lg,
        },
        placeholderCard: {
          // Match the hero EventCard dimensions (300x220) so the empty state shares its footprint.

          width: CARD_WIDTH,

          height: CARD_HEIGHT,
          borderRadius: RADII.xl,
          backgroundColor: colors.surface.card,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.xs,
          padding: SPACING.lg,
        },
        placeholderHeading: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.secondary,
          textAlign: 'center',
        },
        placeholderBody: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          textAlign: 'center',
          lineHeight: FONT_SIZE.md * 1.5,
        },
      }),
    [colors]
  );

  const router = useRouter();
  const upcomingEvents = useUpcomingEvents();

  // D-10: "See all" navigates to Explore tab
  function handleSeeAll() {
    router.push('/(tabs)/plans');
  }

  // D-12: placeholder card tap navigates to plan creation
  function handleCreatePlan() {
    router.push('/plan-create');
  }

  const seeAllAction = (
    <TouchableOpacity onPress={handleSeeAll} hitSlop={8}>
      <Text style={styles.seeAllText}>See all</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* D-10, D-11: SectionHeader with "Upcoming events" + "See all" right action */}
      <View style={styles.headerWrapper}>
        <SectionHeader title="Upcoming events" rightAction={seeAllAction} />
      </View>

      {isLoading ? (
        // HOME-08: Loading skeleton — 2 shimmer cards while plans load (D-09/D-10)
        <Animated.View
          style={{
            opacity: skeletonOpacity,
            flexDirection: 'row',
            paddingLeft: SPACING.lg,
            gap: CARD_GAP,
          }}
        >
          <SkeletonPulse width={CARD_WIDTH} height={CARD_HEIGHT} />
          <SkeletonPulse width={CARD_WIDTH} height={CARD_HEIGHT} />
        </Animated.View>
      ) : upcomingEvents.length === 0 ? (
        // D-12: Empty state — placeholder card with calendar icon + CTA
        <View style={styles.listPadding}>
          <TouchableOpacity
            style={styles.placeholderCard}
            onPress={handleCreatePlan}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="No plans yet. Tap to create one."
          >
            <Ionicons name="calendar-outline" size={32} color={colors.text.secondary} />
            <Text style={styles.placeholderHeading}>No plans yet</Text>
            <Text style={styles.placeholderBody}>Start one and invite your crew</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // D-01: Horizontal FlatList, shows ~1.5 cards to encourage scrolling
        <FlatList<PlanWithMembers>
          data={upcomingEvents}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          // UI-SPEC: snap per card boundary
          snapToInterval={CARD_WIDTH + CARD_GAP}
          decelerationRate="fast"
          pagingEnabled={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
          renderItem={({ item }) => <EventCard plan={item} />}
          // Prevent FlatList height collapse inside ScrollView (RESEARCH.md Pitfall 1)
          style={styles.flatList}
        />
      )}
    </View>
  );
}
