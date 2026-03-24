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
import { COLORS } from '@/constants/colors';
import { usePlans } from '@/hooks/usePlans';
import { useInvitations, PlanInvitation } from '@/hooks/useInvitations';
import { PlanCard } from '@/components/plans/PlanCard';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { EmptyState } from '@/components/common/EmptyState';
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
          <View style={{ paddingTop: insets.top + 8 }}>
            <Text style={styles.heading}>{'Your Plans'}</Text>
            {inviteCount > 0 && (
              <TouchableOpacity
                style={styles.inviteBanner}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.inviteBannerLeft}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.accent} />
                  <Text style={styles.inviteBannerText}>
                    {inviteCount === 1
                      ? 'You have 1 invitation'
                      : `You have ${inviteCount} invitations`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
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
            tintColor={COLORS.textSecondary}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => router.push('/plan-create')}
        activeOpacity={0.8}
        accessibilityLabel="New Plan"
      >
        <Ionicons name="add" size={24} color={COLORS.dominant} />
      </TouchableOpacity>

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
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
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
    backgroundColor: COLORS.dominant,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  separator: {
    height: 12,
  },
  fab: {
    position: 'absolute',
    right: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  // Invite banner
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  inviteBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteBannerText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // Modal
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  noInvitesText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingTop: 32,
  },
  // Invite card
  inviteCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  inviteCreatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  inviteCreatorLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    flex: 1,
  },
  inviteCreatorName: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inviteTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  inviteLocation: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  alsoInvitedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  alsoAvatars: {
    flexDirection: 'row',
  },
  alsoAvatarWrapper: {
    marginRight: -6,
  },
  alsoInvitedText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
    flex: 1,
    marginLeft: 8,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  acceptBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.status.free,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dominant,
  },
  declineBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
