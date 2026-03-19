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
    return (
      <View style={styles.inviteCard}>
        <View style={styles.inviteInfo}>
          <Text style={styles.inviteTitle}>{item.title}</Text>
          <Text style={styles.inviteCreator}>from {item.creator_name}</Text>
          {item.scheduled_for ? (
            <Text style={styles.inviteTime}>{formatInviteTime(item.scheduled_for)}</Text>
          ) : null}
          {item.location ? (
            <Text style={styles.inviteLocation}>{item.location}</Text>
          ) : null}
        </View>
        <View style={styles.inviteActions}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleAccept(item.plan_id)}
          >
            <Ionicons name="checkmark" size={20} color={COLORS.dominant} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => handleDecline(item.plan_id)}
          >
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
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
          <View>
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
    paddingTop: 24,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
  },
  inviteInfo: {
    flex: 1,
    gap: 2,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inviteCreator: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  inviteTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  inviteLocation: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  acceptBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.status.free,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
