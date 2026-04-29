import React, { useEffect, useMemo, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { openInMapsApp, DARK_MAP_STYLE } from '@/lib/maps';
import { usePlanDetail } from '@/hooks/usePlanDetail';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePlansStore } from '@/stores/usePlansStore';
import { uploadPlanCover } from '@/lib/uploadPlanCover';
import { RSVPButtons } from '@/components/plans/RSVPButtons';
import { MemberList } from '@/components/plans/MemberList';
import { LinkDumpField } from '@/components/plans/LinkDumpField';
import { IOUNotesField } from '@/components/plans/IOUNotesField';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { formatPlanTime } from '@/components/plans/PlanCard';
import { LocationPicker } from '@/components/maps/LocationPicker';

interface PlanDashboardScreenProps {
  planId: string;
}

export function PlanDashboardScreen({ planId }: PlanDashboardScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const session = useAuthStore((s) => s.session);
  const { plan, loading, error, refetch, updateRsvp, updatePlanDetails, deletePlan } =
    usePlanDetail(planId);
  const removePlan = usePlansStore((s) => s.removePlan);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const [editLocation, setEditLocation] = useState<string | null>(null);
  const [editLatitude, setEditLatitude] = useState<number | null>(null);
  const [editLongitude, setEditLongitude] = useState<number | null>(null);
  const [showEditLocationPicker, setShowEditLocationPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [respondingInvite, setRespondingInvite] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.surface.base,
    },
    scrollContent: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      paddingBottom: 100, // no exact token — intentional large bottom clearance
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.base,
    },
    errorText: {
      fontSize: FONT_SIZE.lg,
      color: colors.text.secondary,
      textAlign: 'center',
      paddingHorizontal: SPACING.xxl,
    },
    coverImageContainer: {
      position: 'relative',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 160,
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    coverImage: {
      width: '100%',
      height: '100%',
      borderRadius: RADII.lg,
    },
    editCoverButton: {
      position: 'absolute',
      top: SPACING.sm,
      right: SPACING.sm,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: RADII.full,
      padding: SPACING.sm,
    },
    addCoverButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    addCoverButtonText: {
      fontSize: FONT_SIZE.sm,
      color: colors.text.secondary,
    },
    section: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.xl,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      fontSize: FONT_SIZE.xl,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.text.primary,
    },
    editButton: {
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.interactive.accent,
    },
    planTitle: {
      fontSize: FONT_SIZE.xl,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.text.primary,
      marginBottom: SPACING.xs,
    },
    planTime: {
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.text.secondary,
      marginBottom: SPACING.xs,
    },
    planLocation: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.regular,
      color: colors.text.secondary,
    },
    textInput: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      fontSize: FONT_SIZE.lg,
      color: colors.text.primary,
      marginBottom: SPACING.md,
    },
    datePickerButton: {
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      marginBottom: SPACING.md,
    },
    datePickerText: {
      fontSize: FONT_SIZE.lg,
      color: colors.text.primary,
    },
    editActions: {
      marginTop: SPACING.sm,
      gap: SPACING.md,
    },
    discardButton: {
      alignItems: 'center',
      paddingVertical: SPACING.sm,
    },
    discardText: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.regular,
      color: colors.text.secondary,
    },
    headerButton: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    chatButtonContainer: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.lg,
    },
    mapTileContainer: {
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.md,
      borderRadius: RADII.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface.card,
      overflow: 'hidden',
    },
    mapTile: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 160,
    },
    mapAddressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      paddingHorizontal: 12,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    mapAddressText: {
      flex: 1,
      fontSize: FONT_SIZE.sm,
      color: colors.text.primary,
    },
    directionsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 44,
    },
    directionsText: {
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.interactive.accent,
    },
    locationTrigger: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADII.lg,
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.md,
    },
    locationTriggerText: {
      flex: 1,
      fontSize: FONT_SIZE.md,
      color: colors.text.primary,
    },
    inviteBanner: {
      backgroundColor: colors.surface.card,
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.lg,
      borderRadius: RADII.lg,
      padding: SPACING.lg,
      gap: SPACING.md,
    },
    inviteText: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.text.primary,
      textAlign: 'center',
    },
    inviteActions: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    acceptButton: {
      flex: 1,
      backgroundColor: colors.status.free,
      borderRadius: RADII.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    acceptText: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.surface.base,
    },
    declineButton: {
      flex: 1,
      backgroundColor: colors.border,
      borderRadius: RADII.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    declineText: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.text.secondary,
    },
  }), [colors]);

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
              <Ionicons name="trash-outline" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          )
        : undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, session?.user?.id, styles, colors]);

  function enterEditMode() {
    if (!plan) return;
    setEditTitle(plan.title);
    setEditDate(plan.scheduled_for ? new Date(plan.scheduled_for) : new Date());
    setEditLocation(plan.location ?? null);
    setEditLatitude(plan.latitude);
    setEditLongitude(plan.longitude);
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
      location: editLocation || null,
      latitude: editLatitude,
      longitude: editLongitude,
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
          removePlan(planId);
          router.back();
        },
      },
    ]);
  }

  async function pickAndUploadCoverImage() {
    if (!plan) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [200, 140],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;

    setUploadingCover(true);
    const publicUrl = await uploadPlanCover(plan.id, asset.uri);
    if (publicUrl) {
      const { error: updateError } = await updatePlanDetails({ cover_image_url: publicUrl });
      if (updateError) {
        Alert.alert('Error', "Couldn't update cover image.");
      } else {
        await refetch(); // Refresh plan data to show new cover
      }
    } else {
      Alert.alert('Error', "Couldn't upload image. Please try again.");
    }
    setUploadingCover(false);
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
  const isCreator = session?.user?.id === plan.created_by;

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

      {/* Cover image display and edit (creator only) — D-14 */}
      {plan.cover_image_url ? (
        <View style={styles.coverImageContainer}>
          <Image
            source={{ uri: plan.cover_image_url }}
            style={styles.coverImage}
            contentFit="cover"
          />
          {isCreator && (
            <TouchableOpacity
              style={styles.editCoverButton}
              onPress={pickAndUploadCoverImage}
              disabled={uploadingCover}
              accessibilityLabel="Change cover image"
            >
              <Ionicons name="camera-outline" size={18} color={colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>
      ) : isCreator ? (
        <TouchableOpacity
          style={styles.addCoverButton}
          onPress={pickAndUploadCoverImage}
          disabled={uploadingCover}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add cover image"
        >
          <Ionicons name="image-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.addCoverButtonText}>Add cover image</Text>
        </TouchableOpacity>
      ) : null}

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
              placeholderTextColor={colors.text.secondary}
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

            {/* Edit mode location — same trigger pattern as PlanCreateModal */}
            <TouchableOpacity
              style={styles.locationTrigger}
              onPress={() => setShowEditLocationPicker(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={editLocation ? 'Change location' : 'Add location'}
            >
              <Ionicons name="location-outline" size={20} color={colors.interactive.accent} />
              <Text
                style={[
                  styles.locationTriggerText,
                  !editLocation && { color: colors.text.secondary },
                ]}
                numberOfLines={1}
              >
                {editLocation ?? 'Add location'}
              </Text>
              {editLocation ? (
                <TouchableOpacity
                  onPress={() => {
                    setEditLocation(null);
                    setEditLatitude(null);
                    setEditLongitude(null);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
              )}
            </TouchableOpacity>

            <LocationPicker
              visible={showEditLocationPicker}
              onConfirm={({ latitude: lat, longitude: lng, label }) => {
                setEditLatitude(lat);
                setEditLongitude(lng);
                setEditLocation(label);
                setShowEditLocationPicker(false);
              }}
              onCancel={() => setShowEditLocationPicker(false)}
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

      {/* Map tile — absent when lat/lng null (D-13) */}
      {plan.latitude != null && plan.longitude != null ? (
        <View
          style={[styles.mapTileContainer, colors.cardElevation]}
          accessibilityLabel={`Map showing ${plan.location ?? 'plan location'}`}
        >
          <View pointerEvents="none">
            <MapView
              style={styles.mapTile}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              provider={PROVIDER_GOOGLE}
              customMapStyle={DARK_MAP_STYLE}
              initialRegion={{
                latitude: plan.latitude,
                longitude: plan.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Marker
                coordinate={{ latitude: plan.latitude, longitude: plan.longitude }}
                pinColor={colors.interactive.accent}
                tracksViewChanges={false}
              />
            </MapView>
          </View>

          {/* Address row */}
          <View style={styles.mapAddressRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={colors.interactive.accent}
            />
            <Text
              style={styles.mapAddressText}
              numberOfLines={1}
            >
              {plan.location ?? ''}
            </Text>
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={async () => {
                const opened = await openInMapsApp(plan.latitude!, plan.longitude!, plan.location ?? '');
                if (!opened) Alert.alert('Maps unavailable', "Couldn't open the maps app.");
              }}
              activeOpacity={0.7}
              accessibilityLabel={`Get directions to ${plan.location ?? 'plan location'}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="navigate-outline"
                size={14}
                color={colors.interactive.accent}
              />
              <Text style={styles.directionsText}>{'Directions'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

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
        <IOUNotesField planId={planId} initialValue={plan.general_notes} />
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
