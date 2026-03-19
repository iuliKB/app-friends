import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants/colors';
import { usePlanDetail } from '@/hooks/usePlanDetail';
import { useAuthStore } from '@/stores/useAuthStore';
import { RSVPButtons } from '@/components/plans/RSVPButtons';
import { MemberList } from '@/components/plans/MemberList';
import { LinkDumpField } from '@/components/plans/LinkDumpField';
import { IOUNotesField } from '@/components/plans/IOUNotesField';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { formatPlanTime } from '@/components/plans/PlanCard';

interface PlanDashboardScreenProps {
  planId: string;
}

export function PlanDashboardScreen({ planId }: PlanDashboardScreenProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const session = useAuthStore((s) => s.session);
  const { plan, loading, error, refetch, updateRsvp, updatePlanDetails, deletePlan } =
    usePlanDetail(planId);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [editLocation, setEditLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync navigation header
  useEffect(() => {
    const isCreator = plan?.created_by === session?.user?.id;

    navigation.setOptions({
      title: plan?.title ?? '',
      headerRight: isCreator
        ? () => (
            <TouchableOpacity
              onPress={handleDeletePress}
              style={styles.headerButton}
              accessibilityLabel="Delete plan"
            >
              <Ionicons name="trash-outline" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [plan, session?.user?.id]);

  function enterEditMode() {
    if (!plan) return;
    setEditTitle(plan.title);
    setEditDate(plan.scheduled_for ? new Date(plan.scheduled_for) : new Date());
    setEditLocation(plan.location ?? '');
    setEditing(true);
  }

  function discardEdit() {
    setEditing(false);
    setShowDatePicker(false);
  }

  async function handleSaveChanges() {
    setSaving(true);
    const { error: saveError } = await updatePlanDetails({
      title: editTitle,
      scheduled_for: editDate.toISOString(),
      location: editLocation || undefined,
    });
    setSaving(false);
    if (saveError) {
      Alert.alert('Error', "Couldn't save changes. Try again.");
      return;
    }
    setEditing(false);
    await refetch();
  }

  async function handleRsvp(newRsvp: 'going' | 'maybe' | 'out') {
    const { error: rsvpError } = await updateRsvp(newRsvp);
    if (rsvpError) {
      Alert.alert('Error', "Couldn't update your RSVP. Try again.");
      return;
    }
    await refetch();
  }

  function handleDeletePress() {
    Alert.alert('Delete this plan?', "This can't be undone.", [
      { text: 'Keep Plan', style: 'cancel' },
      {
        text: 'Delete Plan',
        style: 'destructive',
        onPress: async () => {
          const { error: deleteError } = await deletePlan();
          if (deleteError) {
            Alert.alert('Error', "Couldn't delete the plan. Try again.");
            return;
          }
          router.back();
        },
      },
    ]);
  }

  if (loading && !plan) {
    return <LoadingIndicator />;
  }

  if (error && !plan) {
    return (
      <View style={styles.centered}>
        <TouchableOpacity onPress={refetch}>
          <Text style={styles.errorText}>{"Couldn't load this plan. Tap to retry."}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!plan) return null;

  const currentUserRsvp =
    plan.members.find((m) => m.user_id === session?.user?.id)?.rsvp ?? 'invited';
  const isInvited = currentUserRsvp === 'invited';
  const [respondingInvite, setRespondingInvite] = useState(false);

  async function handleAcceptInvite() {
    setRespondingInvite(true);
    const { error: rsvpError } = await updateRsvp('going');
    setRespondingInvite(false);
    if (rsvpError) {
      Alert.alert('Error', "Couldn't accept invite. Try again.");
      return;
    }
    await refetch();
  }

  async function handleDeclineInvite() {
    setRespondingInvite(true);
    const { error: rsvpError } = await updateRsvp('out');
    setRespondingInvite(false);
    if (rsvpError) {
      Alert.alert('Error', "Couldn't decline invite. Try again.");
      return;
    }
    router.back();
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Invitation Banner */}
      {isInvited && (
        <View style={styles.inviteBanner}>
          <Text style={styles.inviteText}>{"You've been invited to this plan"}</Text>
          <View style={styles.inviteActions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptInvite}
              disabled={respondingInvite}
            >
              <Text style={styles.acceptText}>{'Accept'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDeclineInvite}
              disabled={respondingInvite}
            >
              <Text style={styles.declineText}>{'Decline'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Details Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{'Details'}</Text>
          {!editing && (
            <TouchableOpacity onPress={enterEditMode}>
              <Text style={styles.editButton}>{'Edit'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <View>
            <TextInput
              style={styles.textInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Plan title"
              placeholderTextColor={COLORS.textSecondary}
            />

            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Text style={styles.datePickerText}>
                {editDate.toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={editDate}
                mode="datetime"
                display="default"
                onChange={(_event, date) => {
                  if (date) setEditDate(date);
                }}
              />
            )}

            <TextInput
              style={styles.textInput}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="Location"
              placeholderTextColor={COLORS.textSecondary}
            />

            <View style={styles.editActions}>
              <PrimaryButton title="Save Changes" onPress={handleSaveChanges} loading={saving} />
              <TouchableOpacity style={styles.discardButton} onPress={discardEdit}>
                <Text style={styles.discardText}>{'Discard'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.planTitle}>{plan.title}</Text>
            {plan.scheduled_for ? (
              <Text style={styles.planTime}>{formatPlanTime(plan.scheduled_for)}</Text>
            ) : null}
            {plan.location ? <Text style={styles.planLocation}>{plan.location}</Text> : null}
          </View>
        )}
      </View>

      {/* Who's Going Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{"Who's Going"}</Text>
        {!isInvited && <RSVPButtons currentRsvp={currentUserRsvp} onRsvp={handleRsvp} />}
        <MemberList
          members={plan.members}
          creatorId={plan.created_by}
          onMemberPress={(userId) => {
            if (userId !== session?.user?.id) {
              router.push(`/friends/${userId}` as never);
            }
          }}
        />
      </View>

      {/* Links Section */}
      <View style={styles.section}>
        <LinkDumpField planId={planId} initialValue={plan.link_dump} />
      </View>

      {/* IOU Notes Section */}
      <View style={styles.section}>
        <IOUNotesField planId={planId} initialValue={plan.iou_notes} />
      </View>

      {/* Open Chat Button */}
      <View style={styles.chatButtonContainer}>
        <PrimaryButton
          title="Open Chat"
          onPress={() => router.push(`/chat/room?plan_id=${planId}` as never)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dominant,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  planTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  planLocation: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  textInput: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  datePickerButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  datePickerText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  editActions: {
    marginTop: 8,
    gap: 12,
  },
  discardButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  discardText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chatButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  inviteBanner: {
    backgroundColor: COLORS.secondary,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  inviteText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.status.free,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dominant,
  },
  declineButton: {
    flex: 1,
    backgroundColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
