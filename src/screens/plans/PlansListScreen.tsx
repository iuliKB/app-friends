import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { usePlans } from '@/hooks/usePlans';
import { useTabBarSpacing } from '@/hooks/useTabBarSpacing';
import { PlanCardSkeleton } from '@/components/plans/PlanCardSkeleton';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { useInvitations, PlanInvitation } from '@/hooks/useInvitations';
import { NextEventHero } from '@/components/plans/NextEventHero';
import { EventListCard } from '@/components/plans/EventListCard';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { EmptyState } from '@/components/common/EmptyState';
import { FAB } from '@/components/common/FAB';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_GAP } from '@/components/common/CustomTabBar';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ExploreMapView } from '@/components/maps/ExploreMapView';
import type { PlanWithMembers } from '@/types/plans';

function formatInviteTime(scheduledFor: string | null): string {
  if (!scheduledFor) return '';
  const date = new Date(scheduledFor);
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function PlansListScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomSpacing = useTabBarSpacing();
  const { plans, loading, error, refreshing, handleRefresh, fetchPlans } = usePlans();
  const { invitations, count: inviteCount, accept, decline } = useInvitations();
  const [modalVisible, setModalVisible] = useState(false);
  // D-15: map is default when Explore tab opens; not persisted across sessions
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  async function handleAccept(planId: string) {
    const { error: err } = await accept(planId);
    if (err) {
      Alert.alert('Error', "Couldn't accept invitation. Try again.");
      return;
    }
    await fetchPlans();
    if (invitations.length <= 1) setModalVisible(false);
  }

  async function handleDecline(planId: string) {
    const { error: err } = await decline(planId);
    if (err) {
      Alert.alert('Error', "Couldn't decline invitation. Try again.");
      return;
    }
    await fetchPlans(); // keep plans list consistent with invitation state
    if (invitations.length <= 1) setModalVisible(false);
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        listContent: {
          paddingHorizontal: SPACING.lg,
        },
        errorText: {
          fontSize: FONT_SIZE.lg,
          color: colors.text.secondary,
          paddingHorizontal: 0,
          paddingTop: SPACING.sm,
        },
        separator: {
          height: SPACING.md,
        },
        sectionLabel: {
          fontSize: FONT_SIZE.md,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginTop: SPACING.lg,
          marginBottom: SPACING.md,
        },
        // Invite banner
        inviteBanner: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          paddingHorizontal: SPACING.lg,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 14, // no exact token — between md(12) and lg(16)
          marginBottom: SPACING.lg,
        },
        inviteBannerLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        },
        inviteBannerText: {
          fontSize: FONT_SIZE.lg,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.text.primary,
        },
        // Modal
        modalRoot: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        modalHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.xl,
          paddingBottom: SPACING.lg,
        },
        modalTitle: {
          fontSize: FONT_SIZE.xxl,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.text.primary,
        },
        modalList: {
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.xxl,
        },
        noInvitesText: {
          fontSize: FONT_SIZE.lg,
          color: colors.text.secondary,
          textAlign: 'center',
          paddingTop: SPACING.xxl,
        },
        // Invite card
        inviteCard: {
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          padding: SPACING.lg,
          gap: SPACING.sm,
        },
        inviteCreatorRow: {
          flexDirection: 'row',
          alignItems: 'center',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          gap: 10, // no exact token — between sm(8) and md(12)
          marginBottom: SPACING.xs,
        },
        inviteCreatorLabel: {
          fontSize: FONT_SIZE.md,
          fontWeight: FONT_WEIGHT.regular,
          color: colors.text.secondary,
          flex: 1,
        },
        inviteCreatorName: {
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.text.primary,
        },
        inviteTitle: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          fontSize: 18, // no exact token — between lg(16) and xl(20)
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.text.primary,
        },
        inviteTime: {
          fontSize: FONT_SIZE.md,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.text.secondary,
        },
        inviteLocation: {
          fontSize: FONT_SIZE.md,
          fontWeight: FONT_WEIGHT.regular,
          color: colors.text.secondary,
        },
        alsoInvitedRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
          marginTop: SPACING.xs,
        },
        alsoAvatars: {
          flexDirection: 'row',
        },
        alsoAvatarWrapper: {
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginRight: -6, // no exact token — negative overlap for avatar stack
        },
        alsoInvitedText: {
          fontSize: FONT_SIZE.sm,
          fontWeight: FONT_WEIGHT.regular,
          color: colors.text.secondary,
          flex: 1,
          marginLeft: SPACING.sm,
        },
        inviteActions: {
          flexDirection: 'row',
          gap: SPACING.md,
          marginTop: SPACING.sm,
        },
        acceptBtn: {
          flex: 1,
          height: 40,
          borderRadius: RADII.md,
          backgroundColor: colors.status.free,
          alignItems: 'center',
          justifyContent: 'center',
        },
        acceptBtnText: {
          fontSize: FONT_SIZE.lg,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.surface.base,
        },
        declineBtn: {
          flex: 1,
          height: 40,
          borderRadius: RADII.md,
          backgroundColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        declineBtnText: {
          fontSize: FONT_SIZE.lg,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.text.secondary,
        },
        // View mode toggle
        viewToggle: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        toggleButton: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: RADII.md,
        },
        toggleButtonActive: {
          // D-15 UI-SPEC: 15% opacity accent background on active button
          backgroundColor: 'rgba(185, 255, 59, 0.15)',
        },
      }),
    [colors]
  );

  function renderInvitation({ item }: { item: PlanInvitation }) {
    const otherNames = item.other_members.map((m) => m.display_name);
    const MAX_SHOW = 3;
    const shownNames = otherNames.slice(0, MAX_SHOW);
    const extraCount = otherNames.length - MAX_SHOW;
    const alsoInvited =
      shownNames.length > 0
        ? `Also invited: ${shownNames.join(', ')}${extraCount > 0 ? `, +${extraCount}` : ''}`
        : null;

    return (
      <View style={styles.inviteCard}>
        {/* Creator row */}
        <View style={styles.inviteCreatorRow}>
          <AvatarCircle size={36} imageUri={item.creator_avatar} displayName={item.creator_name} />
          <Text style={styles.inviteCreatorLabel}>
            <Text style={styles.inviteCreatorName}>{item.creator_name}</Text>
            {' invited you'}
          </Text>
        </View>

        {/* Plan details */}
        <Text style={styles.inviteTitle}>{item.title}</Text>
        {item.scheduled_for ? (
          <Text style={styles.inviteTime}>{formatInviteTime(item.scheduled_for)}</Text>
        ) : null}
        {item.location ? <Text style={styles.inviteLocation}>{item.location}</Text> : null}

        {/* Other invited members */}
        {alsoInvited ? (
          <View style={styles.alsoInvitedRow}>
            <View style={styles.alsoAvatars}>
              {item.other_members.slice(0, MAX_SHOW).map((m) => (
                <View key={m.user_id} style={styles.alsoAvatarWrapper}>
                  <AvatarCircle size={24} imageUri={m.avatar_url} displayName={m.display_name} />
                </View>
              ))}
            </View>
            <Text style={styles.alsoInvitedText}>{alsoInvited}</Text>
          </View>
        ) : null}

        {/* Accept / Decline */}
        <View style={styles.inviteActions}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleAccept(item.plan_id)}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptBtnText}>{'Accept'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => handleDecline(item.plan_id)}
            activeOpacity={0.7}
          >
            <Text style={styles.declineBtnText}>{'Decline'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
        <ErrorDisplay mode="screen" message="Couldn't load plans." onRetry={fetchPlans} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={{ paddingTop: SPACING.sm, paddingHorizontal: SPACING.lg }}>
        <ScreenHeader
          title="Your Plans"
          rightAction={
            <View style={styles.viewToggle} accessibilityRole="radiogroup">
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                onPress={() => setViewMode('list')}
                hitSlop={8}
                accessibilityLabel="List view"
                accessibilityState={{ selected: viewMode === 'list' }}
              >
                <Ionicons
                  name="list"
                  size={20}
                  color={viewMode === 'list' ? colors.interactive.accent : colors.text.secondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
                onPress={() => setViewMode('map')}
                hitSlop={8}
                accessibilityLabel="Map view"
                accessibilityState={{ selected: viewMode === 'map' }}
              >
                <Ionicons
                  name="map-outline"
                  size={20}
                  color={viewMode === 'map' ? colors.interactive.accent : colors.text.secondary}
                />
              </TouchableOpacity>
            </View>
          }
        />
      </View>
      {viewMode === 'map' ? (
        <ExploreMapView plans={plans} />
      ) : loading && plans.length === 0 ? (
        <View style={{ paddingHorizontal: SPACING.lg, gap: SPACING.md, paddingTop: SPACING.md }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList<PlanWithMembers>
          data={plans.slice(1)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventListCard plan={item} onPress={() => router.push(`/plans/${item.id}` as never)} />
          )}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: SPACING.lg }}>
              {inviteCount > 0 && (
                <TouchableOpacity
                  style={styles.inviteBanner}
                  onPress={() => setModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.inviteBannerLeft}>
                    <Ionicons name="mail-outline" size={20} color={colors.interactive.accent} />
                    <Text style={styles.inviteBannerText}>
                      {inviteCount === 1
                        ? 'You have 1 invitation'
                        : `You have ${inviteCount} invitations`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
              {plans[0]
                ? (() => {
                    const nextPlan = plans[0];
                    return (
                      <View style={{ marginBottom: SPACING.md }}>
                        <NextEventHero
                          plan={nextPlan}
                          onPress={() => router.push(`/plans/${nextPlan.id}` as never)}
                        />
                      </View>
                    );
                  })()
                : null}
              {plans.length > 1 ? <Text style={styles.sectionLabel}>Upcoming</Text> : null}
            </View>
          }
          ListEmptyComponent={
            error ? (
              <Text style={styles.errorText}>
                {error ?? "Couldn't load plans. Pull down to try again."}
              </Text>
            ) : (
              <EmptyState
                icon="calendar-outline"
                iconType="ionicons"
                heading="No plans yet"
                body="Tap the + button to create a quick plan and invite your free friends."
              />
            )
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomSpacing }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.interactive.accent}
            />
          }
        />
      )}

      {viewMode === 'list' ? (
        <FAB
          icon={<Ionicons name="add" size={24} color={colors.surface.base} />}
          onPress={() => router.push('/plan-create')}
          accessibilityLabel="Create a new plan"
          extraBottom={TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP}
        />
      ) : null}

      {/* Invitations Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{'Invitations'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <FlatList<PlanInvitation>
            data={invitations}
            keyExtractor={(item) => item.plan_id}
            renderItem={renderInvitation}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.modalList}
            ListEmptyComponent={
              <Text style={styles.noInvitesText}>{'No pending invitations'}</Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}
