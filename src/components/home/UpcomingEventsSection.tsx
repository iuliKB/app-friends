import React, { useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EventCard } from '@/components/home/EventCard';
import { useUpcomingEvents } from '@/hooks/useUpcomingEvents';
import type { PlanWithMembers } from '@/types/plans';

// D-01: card width 200 + D-UI-SPEC: gap between cards = SPACING.md (12)
// eslint-disable-next-line campfire/no-hardcoded-styles
const CARD_WIDTH = 200;
const CARD_GAP = SPACING.md;

export function UpcomingEventsSection() {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 140, // matches EventCard height
    },
    listContent: {
      // UI-SPEC: left pad aligns first card with screen content; right pad shows bleed
      paddingLeft: SPACING.lg,
      paddingRight: SPACING.sm,
    },
    listPadding: {
      paddingHorizontal: SPACING.lg,
    },
    placeholderCard: {
      // D-12: same 200x140 dimensions as EventCard but with dashed border
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 200,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 140,
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
  }), [colors]);

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
        <SectionHeader title="Upcoming events ✨" rightAction={seeAllAction} />
      </View>

      {upcomingEvents.length === 0 ? (
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
