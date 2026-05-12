import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
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
import { usePlanPhotos } from '@/hooks/usePlanPhotos';
import { GalleryViewerModal } from '@/components/plans/GalleryViewerModal';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { showActionSheet } from '@/lib/action-sheet';

const { width: screenWidth } = Dimensions.get('window');
const CELL_SIZE = (screenWidth - SPACING.lg * 2 - SPACING.xs * 2) / 3;

interface PlanDashboardScreenProps {
  planId: string;
}

export function PlanDashboardScreen({ planId }: PlanDashboardScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const { photos, uploadPhoto, deletePhoto } = usePlanPhotos(planId);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.surface.base,
        },
        scrollContent: {
          // Leave room for the sticky Open Chat bar at the bottom.
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingBottom: 110,
        },
        heroCard: {
          marginHorizontal: SPACING.lg,
          marginTop: SPACING.lg,
          marginBottom: SPACING.md,
          borderRadius: RADII.xl,
          backgroundColor: colors.surface.card,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        },
        heroCoverWrap: {
          position: 'relative',
          width: '100%',
          height: 160,
        },
        heroCoverImage: {
          width: '100%',
          height: '100%',
        },
        heroAddCover: {
          width: '100%',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          height: 96,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.xs,
          backgroundColor: colors.surface.base,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        heroAddCoverText: {
          fontSize: FONT_SIZE.sm,
          color: colors.text.secondary,
        },
        heroInfo: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.lg,
          gap: SPACING.sm,
        },
        stickyChatBar: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.md,
          alignItems: 'center',
          backgroundColor: 'transparent',
        },
        stickyChatPill: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: SPACING.sm,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          height: 52,
          paddingHorizontal: SPACING.xl,
          borderRadius: RADII.full,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(185,255,59,0.92)',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          shadowColor: '#000',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          shadowOpacity: 0.35,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          shadowRadius: 16,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        stickyChatPillText: {
          fontSize: FONT_SIZE.lg,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.surface.base,
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
        subSectionTitle: {
          fontSize: FONT_SIZE.md,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: SPACING.md,
        },
        editButton: {
          fontSize: FONT_SIZE.md,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.interactive.accent,
        },
        summaryCard: {
          marginHorizontal: SPACING.lg,
          marginTop: SPACING.xs,
          backgroundColor: colors.surface.card,
          borderRadius: RADII.xl,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.lg,
          gap: SPACING.sm,
        },
        summaryTitle: {
          fontSize: FONT_SIZE.xxl,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.text.primary,
        },
        summaryMetaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        },
        summaryMetaText: {
          fontSize: FONT_SIZE.md,
          fontWeight: FONT_WEIGHT.regular,
          color: colors.text.secondary,
          flexShrink: 1,
        },
        summaryEditPill: {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          gap: 6, // no exact token — icon-label gap, between xs(4) and sm(8)
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingHorizontal: 10,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 6, // no exact token — compact pill padding
          borderRadius: RADII.full,
          backgroundColor: colors.surface.base,
          marginTop: SPACING.xs,
        },
        summaryEditText: {
          fontSize: FONT_SIZE.sm,
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

          minHeight: 44,
        },
        directionsText: {
          fontSize: FONT_SIZE.sm,
          fontWeight: FONT_WEIGHT.semibold,
          color: colors.interactive.accent,
        },
        locationTrigger: {
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
        photosSection: {
          paddingHorizontal: SPACING.lg,
          paddingTop: SPACING.xl,
          paddingBottom: SPACING.xl,
        },
        addPhotoRow: {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: SPACING.xs,
          paddingVertical: SPACING.sm,
        },
        addPhotoText: {
          fontSize: FONT_SIZE.md,
          color: colors.interactive.accent,
        },
        photoGrid: {
          flexDirection: 'row' as const,
          flexWrap: 'wrap' as const,
          gap: SPACING.xs,
          marginTop: SPACING.md,
        },
      }),
    [colors]
  );

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
      <View style={{ flex: 1, backgroundColor: colors.surface.base }}>
        <ErrorDisplay mode="screen" message="Couldn't load this plan." onRetry={refetch} />
      </View>
    );
  }

  if (!plan) return null;

  const currentUserRsvp =
    plan.members.find((m) => m.user_id === session?.user?.id)?.rsvp ?? 'invited';
  const isInvited = currentUserRsvp === 'invited';
  const isCreator = session?.user?.id === plan.created_by;
  const isMember = currentUserRsvp !== 'invited'; // D-17: invited-only users cannot add photos
  const currentUserId = session?.user?.id ?? '';
  const ownPhotoCount = photos.filter((p) => p.uploaderId === currentUserId).length;

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const { error } = await uploadPhoto(asset.uri);
    if (error === 'photo_cap_exceeded') {
      Alert.alert('Limit Reached', 'You can upload up to 10 photos per plan.');
    } else if (error === 'upload_failed') {
      Alert.alert('Error', 'Could not upload photo. Try again.');
    }
  }

  async function pickFromCamera() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const { error } = await uploadPhoto(asset.uri);
    if (error === 'photo_cap_exceeded') {
      Alert.alert('Limit Reached', 'You can upload up to 10 photos per plan.');
    } else if (error === 'upload_failed') {
      Alert.alert('Error', 'Could not upload photo. Try again.');
    }
  }

  function handleAddPhoto() {
    showActionSheet('Add Photo', [
      { label: 'Photo Library', onPress: pickFromLibrary },
      { label: 'Camera', onPress: pickFromCamera },
    ]);
  }

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
    <>
      <FlatList
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        data={[{ key: 'photos' }]}
        renderItem={() => null}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          <>
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

            {/* Combined cover + short detail card (read mode) */}
            {!editing ? (
              <View style={styles.heroCard}>
                {plan.cover_image_url ? (
                  <View style={styles.heroCoverWrap}>
                    <Image
                      source={{ uri: plan.cover_image_url }}
                      style={styles.heroCoverImage}
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
                    style={styles.heroAddCover}
                    onPress={pickAndUploadCoverImage}
                    disabled={uploadingCover}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Add cover image"
                  >
                    <Ionicons name="image-outline" size={20} color={colors.text.secondary} />
                    <Text style={styles.heroAddCoverText}>Add cover image</Text>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.heroInfo}>
                  <Text style={styles.summaryTitle} numberOfLines={3}>
                    {plan.title}
                  </Text>
                  {plan.scheduled_for ? (
                    <View style={styles.summaryMetaRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.interactive.accent} />
                      <Text style={styles.summaryMetaText} numberOfLines={1}>
                        {formatPlanTime(plan.scheduled_for)}
                      </Text>
                    </View>
                  ) : null}
                  {plan.location ? (
                    <View style={styles.summaryMetaRow}>
                      <Ionicons name="location-outline" size={16} color={colors.interactive.accent} />
                      <Text style={styles.summaryMetaText} numberOfLines={2}>
                        {plan.location}
                      </Text>
                    </View>
                  ) : null}
                  {isCreator ? (
                    <TouchableOpacity
                      style={styles.summaryEditPill}
                      onPress={enterEditMode}
                      accessibilityRole="button"
                      accessibilityLabel="Edit plan details"
                    >
                      <Ionicons name="create-outline" size={14} color={colors.interactive.accent} />
                      <Text style={styles.summaryEditText}>{'Edit details'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Edit mode form (creator only — gated by Edit pill in summary card) */}
            {editing ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>{'Edit details'}</Text>
                </View>
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
                  <PrimaryButton
                    title="Save Changes"
                    onPress={handleSaveChanges}
                    loading={saving}
                  />
                  <TouchableOpacity style={styles.discardButton} onPress={discardEdit}>
                    <Text style={styles.discardText}>{'Discard'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* About Event section header */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{'About Event'}</Text>
            </View>

            {/* 1) Are you going? (RSVP) */}
            {!isInvited && (
              <View style={styles.section}>
                <Text style={styles.subSectionTitle}>{'Are you going?'}</Text>
                <RSVPButtons currentRsvp={currentUserRsvp} onRsvp={handleRsvp} />
              </View>
            )}

            {/* 2) People */}
            <View style={styles.section}>
              <Text style={styles.subSectionTitle}>{'People'}</Text>
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

            {/* 3) Location — section label above the map tile */}
            {plan.latitude != null && plan.longitude != null ? (
              <View style={styles.section}>
                <Text style={styles.subSectionTitle}>{'Location'}</Text>
              </View>
            ) : null}

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
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                    {...(Platform.OS === 'android'
                      ? { customMapStyle: DARK_MAP_STYLE }
                      : { userInterfaceStyle: 'dark' })}
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
                  <Ionicons name="location-outline" size={14} color={colors.interactive.accent} />
                  <Text style={styles.mapAddressText} numberOfLines={1}>
                    {plan.location ?? ''}
                  </Text>
                  <TouchableOpacity
                    style={styles.directionsButton}
                    onPress={async () => {
                      const opened = await openInMapsApp(
                        plan.latitude!,
                        plan.longitude!,
                        plan.location ?? ''
                      );
                      if (!opened) Alert.alert('Maps unavailable', "Couldn't open the maps app.");
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel={`Get directions to ${plan.location ?? 'plan location'}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="navigate-outline" size={14} color={colors.interactive.accent} />
                    <Text style={styles.directionsText}>{'Directions'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* 4) Notes & Links — combined in one section */}
            <View style={styles.section}>
              <IOUNotesField planId={planId} initialValue={plan.general_notes} />
              <LinkDumpField planId={planId} initialValue={plan.link_dump} />
            </View>

            {/* 5) Memories of this meetup */}
            <View style={styles.photosSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{'Memories of this meetup'}</Text>
              </View>
              {isMember && ownPhotoCount < 10 && (
                <TouchableOpacity
                  style={styles.addPhotoRow}
                  onPress={handleAddPhoto}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Add photo"
                >
                  <Ionicons name="camera-outline" size={20} color={colors.interactive.accent} />
                  <Text style={styles.addPhotoText}>{'Add Photo'}</Text>
                </TouchableOpacity>
              )}
              {photos.length === 0 && (
                <EmptyState
                  icon="images-outline"
                  iconType="ionicons"
                  heading="No photos yet"
                  body="Add the first photo to this plan"
                />
              )}
              {photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {photos.map((photo, idx) => (
                    <TouchableOpacity
                      key={photo.id}
                      onPress={() => {
                        setViewerInitialIndex(idx);
                        setViewerVisible(true);
                      }}
                      activeOpacity={0.85}
                      accessibilityLabel={`Photo by ${photo.uploader.displayName}`}
                      style={{ width: CELL_SIZE, height: CELL_SIZE }}
                    >
                      <Image
                        source={{ uri: photo.signedUrl ?? undefined }}
                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                        contentFit="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        }
      />

      {/* 6) Sticky Open Chat — floating translucent pill, no container */}
      <View
        style={[styles.stickyChatBar, { paddingBottom: insets.bottom || SPACING.md }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.stickyChatPill}
          onPress={() => router.push(`/chat/room?plan_id=${planId}` as never)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open chat"
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.surface.base} />
          <Text style={styles.stickyChatPillText}>Open Chat</Text>
        </TouchableOpacity>
      </View>
      {/* GalleryViewerModal — rendered outside FlatList to avoid nesting issues */}
      <GalleryViewerModal
        visible={viewerVisible}
        photos={photos}
        initialIndex={viewerInitialIndex}
        currentUserId={currentUserId}
        onClose={() => setViewerVisible(false)}
        deletePhoto={deletePhoto}
      />
    </>
  );
}
