import React, { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { usePlans } from '@/hooks/usePlans';
import { usePlansStore } from '@/stores/usePlansStore';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';
import { uploadPlanCover } from '@/lib/uploadPlanCover';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { StatusPill } from '@/components/friends/StatusPill';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { LocationPicker } from '@/components/maps/LocationPicker';
import type { FriendWithStatus } from '@/hooks/useFriends';

function getDefaultTitle(): string {
  const hour = new Date().getHours();
  return hour < 18 ? 'Tonight' : 'Tomorrow';
}

function getNextRoundHour(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours());
  return next;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PlanCreateModal() {
  const { colors } = useTheme();
  const router = useRouter();
  const { preselect_friend_id } = useLocalSearchParams<{ preselect_friend_id?: string }>();
  const { createPlan } = usePlans();
  const { fetchFriends } = useFriends();

  const [title, setTitle] = useState(getDefaultTitle());
  const [scheduledFor, setScheduledFor] = useState(getNextRoundHour());
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [friends, setFriends] = useState<FriendWithStatus[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    fetchFriends().then(({ data }) => {
      if (data) {
        setFriends(data);
        if (preselect_friend_id) {
          // D-06: long-press "Plan with..." pre-selects the requested friend only.
          setSelectedFriendIds(new Set([preselect_friend_id]));
        } else {
          // Default: all currently-Free friends pre-selected.
          const freeFriendIds = data.filter((f) => f.status === 'free').map((f) => f.friend_id);
          setSelectedFriendIds(new Set(freeFriendIds));
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect_friend_id]);

  function toggleFriend(friendId: string) {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  }

  function handleTimeChange(_event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setScheduledFor(selectedDate);
    }
  }

  async function pickCoverImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // D-15: camera roll only, no camera capture
      allowsEditing: true,
      aspect: [200, 140], // match EventCard aspect ratio
      quality: 0.8, // compress before upload
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      setCoverImageUri(asset.uri);
    }
  }

  async function handleCreate() {
    if (!title.trim()) return;

    setCreating(true);
    const { planId, error } = await createPlan({
      title: title.trim(),
      scheduledFor,
      location: locationLabel,     // was: location (string), now: locationLabel (string | null)
      latitude,                     // new — Phase 20
      longitude,                    // new — Phase 20
      invitedFriendIds: Array.from(selectedFriendIds),
    });
    setCreating(false);

    if (error || !planId) {
      Alert.alert('Error', `Couldn't create plan. ${error?.message ?? 'Unknown error'}`);
      return;
    }

    // Upload cover image if selected (D-14)
    if (coverImageUri && planId) {
      setUploadingCover(true);
      const publicUrl = await uploadPlanCover(planId, coverImageUri);
      if (publicUrl) {
        // Update the plan with the cover URL
        await supabase
          .from('plans')
          .update({ cover_image_url: publicUrl })
          .eq('id', planId);
        // Sync store so EventCard shows the image immediately
        const store = usePlansStore.getState();
        store.setPlans(
          store.plans.map((p) =>
            p.id === planId ? { ...p, cover_image_url: publicUrl } : p
          )
        );
      }
      setUploadingCover(false);
    }

    router.back();
    router.push(`/plans/${planId}` as never);
  }

  const styles = useMemo(() => StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.surface.base,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      paddingBottom: 40, // no exact token — between xxl(32) and 48
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.lg,
    },
    headerTitle: {
      fontSize: FONT_SIZE.xxl,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.text.primary,
    },
    fieldGroup: {
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.xl,
    },
    fieldLabel: {
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.text.secondary,
      marginBottom: SPACING.sm,
    },
    textInput: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.regular,
      color: colors.text.primary,
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    coverImagePicker: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 100,
      borderRadius: RADII.md,
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    coverImagePlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xs,
    },
    coverImagePlaceholderText: {
      fontSize: FONT_SIZE.sm,
      color: colors.text.secondary,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface.card,
      borderRadius: RADII.md,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: SPACING.sm,
    },
    timeText: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      color: colors.text.primary,
    },
    friendSection: {
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.xl,
    },
    friendSectionHeading: {
      fontSize: FONT_SIZE.xl,
      fontWeight: FONT_WEIGHT.semibold,
      color: colors.text.primary,
      marginBottom: SPACING.lg,
    },
    noFriendsText: {
      fontSize: FONT_SIZE.lg,
      color: colors.text.secondary,
    },
    friendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      gap: SPACING.md,
    },
    friendName: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      color: colors.text.primary,
    },
    checkbox: {
      marginLeft: SPACING.xs,
    },
    createButton: {
      paddingHorizontal: SPACING.lg,
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
    },
    locationTriggerText: {
      flex: 1,
      fontSize: FONT_SIZE.md,
      color: colors.text.primary,
    },
  }), [colors]);

  function renderFriendRow({ item }: { item: FriendWithStatus }) {
    const isSelected = selectedFriendIds.has(item.friend_id);
    return (
      <TouchableOpacity
        style={styles.friendRow}
        onPress={() => toggleFriend(item.friend_id)}
        activeOpacity={0.7}
      >
        <AvatarCircle size={40} imageUri={item.avatar_url} displayName={item.display_name} />
        <Text style={styles.friendName} numberOfLines={1}>
          {item.display_name}
        </Text>
        <StatusPill status={item.status} />
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={24}
          color={isSelected ? colors.interactive.accent : colors.text.secondary}
          style={styles.checkbox}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Plan</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Title field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Tonight"
            placeholderTextColor={colors.text.secondary}
            autoCapitalize="words"
          />
        </View>

        {/* Cover image picker — D-14: optional */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Cover Image (optional)</Text>
          <TouchableOpacity
            style={styles.coverImagePicker}
            onPress={pickCoverImage}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={coverImageUri ? 'Change cover image' : 'Add cover image'}
          >
            {coverImageUri ? (
              <Image
                source={{ uri: coverImageUri }}
                // eslint-disable-next-line campfire/no-hardcoded-styles
                style={{ width: '100%', height: '100%', borderRadius: RADII.md }}
                contentFit="cover"
              />
            ) : (
              <View style={styles.coverImagePlaceholder}>
                <Ionicons name="image-outline" size={28} color={colors.text.secondary} />
                <Text style={styles.coverImagePlaceholderText}>Tap to add cover image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Time field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>When</Text>
          <TouchableOpacity
            style={styles.timeRow}
            onPress={() => setShowTimePicker((v) => !v)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.timeText}>{formatTime(scheduledFor)}</Text>
            <Ionicons
              name={showTimePicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={scheduledFor}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              minimumDate={new Date()}
              themeVariant="dark"
            />
          )}
        </View>

        {/* Where field — D-08: "Add location" button opens LocationPicker modal */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{'Where'}</Text>
          <TouchableOpacity
            style={styles.locationTrigger}
            onPress={() => setShowLocationPicker(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={locationLabel ? 'Change location' : 'Add location'}
          >
            <Ionicons
              name="location-outline"
              size={20}
              color={colors.interactive.accent}
            />
            <Text
              style={[
                styles.locationTriggerText,
                !locationLabel && { color: colors.text.secondary },
              ]}
              numberOfLines={1}
            >
              {locationLabel ?? 'Add location'}
            </Text>
            {locationLabel ? (
              <TouchableOpacity
                onPress={() => {
                  setLocationLabel(null);
                  setLatitude(null);
                  setLongitude(null);
                }}
                hitSlop={8}
                accessibilityLabel="Remove location"
              >
                <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
            )}
          </TouchableOpacity>
        </View>

        <LocationPicker
          visible={showLocationPicker}
          onConfirm={({ latitude: lat, longitude: lng, label }) => {
            setLatitude(lat);
            setLongitude(lng);
            setLocationLabel(label);
            setShowLocationPicker(false);
          }}
          onCancel={() => setShowLocationPicker(false)}
        />

        {/* Friend selector */}
        <View style={styles.friendSection}>
          <Text style={styles.friendSectionHeading}>{"Who's coming?"}</Text>
          {friends.length === 0 ? (
            <Text style={styles.noFriendsText}>No friends yet</Text>
          ) : (
            <FlatList<FriendWithStatus>
              data={friends}
              keyExtractor={(item) => item.friend_id}
              renderItem={renderFriendRow}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Create button */}
        <View style={styles.createButton}>
          <PrimaryButton
            title="Create Plan"
            onPress={handleCreate}
            loading={creating || uploadingCover}
            disabled={!title.trim() || uploadingCover}
          />
        </View>
      </ScrollView>
    </View>
  );
}
