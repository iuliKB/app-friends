import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants/colors';
import { usePlans } from '@/hooks/usePlans';
import { useFriends } from '@/hooks/useFriends';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { StatusPill } from '@/components/friends/StatusPill';
import { PrimaryButton } from '@/components/common/PrimaryButton';
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
  const router = useRouter();
  const { createPlan } = usePlans();
  const { fetchFriends } = useFriends();

  const [title, setTitle] = useState(getDefaultTitle());
  const [scheduledFor, setScheduledFor] = useState(getNextRoundHour());
  const [location, setLocation] = useState('');
  const [friends, setFriends] = useState<FriendWithStatus[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchFriends().then(({ data }) => {
      if (data) {
        setFriends(data);
        const freeFriendIds = data.filter((f) => f.status === 'free').map((f) => f.friend_id);
        setSelectedFriendIds(new Set(freeFriendIds));
      }
    });
  }, []);

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

  async function handleCreate() {
    if (!title.trim()) return;

    setCreating(true);
    const { planId, error } = await createPlan({
      title: title.trim(),
      scheduledFor,
      location,
      invitedFriendIds: Array.from(selectedFriendIds),
    });
    setCreating(false);

    if (error || !planId) {
      Alert.alert('Error', `Couldn't create plan. ${error?.message ?? 'Unknown error'}`);
      return;
    }

    router.back();
    router.push(`/plans/${planId}` as never);
  }

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
          color={isSelected ? COLORS.accent : COLORS.textSecondary}
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
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
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
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="words"
          />
        </View>

        {/* Time field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>When</Text>
          <TouchableOpacity
            style={styles.timeRow}
            onPress={() => setShowTimePicker((v) => !v)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.timeText}>{formatTime(scheduledFor)}</Text>
            <Ionicons
              name={showTimePicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.textSecondary}
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

        {/* Location field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Where</Text>
          <TextInput
            style={styles.textInput}
            value={location}
            onChangeText={setLocation}
            placeholder="My place, a park, TBD..."
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="words"
          />
        </View>

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
            loading={creating}
            disabled={!title.trim()}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  fieldGroup: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  timeText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  friendSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  friendSectionHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  noFriendsText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  checkbox: {
    marginLeft: 4,
  },
  createButton: {
    paddingHorizontal: 16,
  },
});
