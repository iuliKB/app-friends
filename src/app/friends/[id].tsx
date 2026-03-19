import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AvatarCircle } from '@/components/common/AvatarCircle';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';

type StatusValue = 'free' | 'busy' | 'maybe';

interface FriendProfile {
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);

  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [status, setStatus] = useState<StatusValue>('free');
  const [contextTag, setContextTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      const [profileResult, statusResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, username, avatar_url')
          .eq('id', id)
          .single(),
        supabase.from('statuses').select('status, context_tag').eq('user_id', id).single(),
      ]);

      if (profileResult.data && !profileResult.error) {
        setProfile(profileResult.data as FriendProfile);
      }
      if (statusResult.data && !statusResult.error) {
        setStatus(statusResult.data.status as StatusValue);
        setContextTag((statusResult.data.context_tag as string | null) ?? null);
      }
      setLoading(false);
    }

    fetchData();
  }, [id]);

  async function handleStartDM() {
    if (!profile) return;
    const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
      other_user_id: id,
    });
    if (error || !data) {
      Alert.alert('Error', "Couldn't open chat. Try again.");
      return;
    }
    router.push(
      `/chat/room?dm_channel_id=${data}&friend_name=${encodeURIComponent(profile.display_name)}` as never
    );
  }

  function handleRemoveFriend() {
    if (!profile || !session) return;
    Alert.alert(
      'Remove Friend',
      `Remove ${profile.display_name} from your friends? You can add them again by searching their username.`,
      [
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const sortedIds = [session.user.id, id].sort();
            const { error } = await supabase
              .from('friendships')
              .delete()
              .or(`and(user_a.eq.${sortedIds[0]},user_b.eq.${sortedIds[1]})`);

            if (error) {
              Alert.alert('Error', "Couldn't remove friend. Try again.");
              return;
            }
            router.back();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!profile) {
    return null;
  }

  const firstName = profile.display_name.split(' ')[0];

  return (
    <>
      <Stack.Screen options={{ title: profile.display_name }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Top section */}
        <View style={styles.topSection}>
          <AvatarCircle
            size={80}
            imageUri={profile.avatar_url}
            displayName={profile.display_name}
          />
          <Text style={styles.displayName}>{profile.display_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>

          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: COLORS.status[status] }]} />
            <Text style={[styles.statusText, { color: COLORS.status[status] }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
            {contextTag ? <Text style={styles.contextTag}> {contextTag}</Text> : null}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsSection}>
          <PrimaryButton title={`Message ${firstName}`} onPress={handleStartDM} />
          <TouchableOpacity style={styles.removeFriendButton} onPress={handleRemoveFriend}>
            <Text style={styles.removeFriendText}>Remove Friend</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.dominant,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  topSection: {
    alignItems: 'center',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  username: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '400',
  },
  contextTag: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  actionsSection: {
    marginTop: 24,
  },
  removeFriendButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  removeFriendText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.destructive,
  },
});
