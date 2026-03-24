import React, { useState } from 'react';
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
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { usePlans } from '@/hooks/usePlans';
import { useInvitations, PlanInvitation } from '@/hooks/useInvitations';
import { PlanCard } from '@/components/plans/PlanCard';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { EmptyState } from '@/components/common/EmptyState';
import { FAB } from '@/components/common/FAB';
import { ScreenHeader } from '@/components/common/ScreenHeader';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plans, error, refreshing, handleRefresh, fetchPlans } = usePlans();
  const { invitations, count: inviteCount, accept, decline } = useInvitations();
  const [modalVisible, setModalVisible] = useState(false);

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
    if (invitations.length <= 1) setModalVisible(false);
  }

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
        {item.location ? (
          <Text style={styles.inviteLocation}>{item.location}</Text>
        ) : null}

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

  return (
    <View style={styles.root}>
      <FlatList<PlanWithMembers>
        data={plans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlanCard plan={item} onPress={() => router.push(`/plans/${item.id}` as never)} />
        )}
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + SPACING.sm }}>
            <ScreenHeader title="Your Plans" />
            {inviteCount > 0 && (
              <TouchableOpacity
                style={styles.inviteBanner}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.inviteBannerLeft}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.interactive.accent} />
                  <Text style={styles.inviteBannerText}>
                    {inviteCount === 1
                      ? 'You have 1 invitation'
                      : `You have ${inviteCount} invitations`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          error ? (
            <Text style={styles.errorText}>{error ?? "Couldn't load plans. Pull down to try again."}</Text>
          ) : (
            <EmptyState
              icon="📅"
              heading="No plans yet"
              body="Tap the + button to create a quick plan and invite your free friends."
            />
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.interactive.accent}
          />
        }
      />

      <FAB
        icon={<Ionicons name="add" size={24} color={COLORS.surface.base} />}
        onPress={() => router.push('/plan-create')}
        accessibilityLabel="Create a new plan"
      />

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
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    paddingBottom: 100, // no exact token — intentional large FAB clearance
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.secondary,
    paddingHorizontal: 0,
    paddingTop: SPACING.sm,
  },
  separator: {
    height: SPACING.md,
  },
  // Invite banner
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface.card,
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
    color: COLORS.text.primary,
  },
  // Modal
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.surface.base,
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
    color: COLORS.text.primary,
  },
  modalList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  noInvitesText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingTop: SPACING.xxl,
  },
  // Invite card
  inviteCard: {
    backgroundColor: COLORS.surface.card,
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
    color: COLORS.text.secondary,
    flex: 1,
  },
  inviteCreatorName: {
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  inviteTitle: {
    // eslint-disable-next-line campfire/no-hardcoded-styles
    fontSize: 18, // no exact token — between lg(16) and xl(20)
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  inviteTime: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
  },
  inviteLocation: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
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
    color: COLORS.text.secondary,
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
    backgroundColor: COLORS.status.free,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
  },
  declineBtn: {
    flex: 1,
    height: 40,
    borderRadius: RADII.md,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.secondary,
  },
});
