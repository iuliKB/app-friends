import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, RADII } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';

export interface PendingRequest {
  id: string;
  requester_id: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface RequestCardProps {
  request: PendingRequest;
  onAccept: () => void;
  onDecline: () => void;
  loading: boolean;
}

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = Math.floor((now - then) / 1000);
  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(diff / 86400);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function RequestCard({ request, onAccept, onDecline, loading }: RequestCardProps) {
  const profile = request.profiles;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <AvatarCircle size={44} imageUri={profile.avatar_url} displayName={profile.display_name} />
        <View style={styles.info}>
          <Text style={styles.displayName}>{profile.display_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
        <Text style={styles.timestamp}>{relativeTime(request.created_at)}</Text>
      </View>

      <View style={styles.buttonRow}>
        {loading ? (
          <ActivityIndicator color={COLORS.text.secondary} />
        ) : (
          <>
            <TouchableOpacity style={styles.acceptButton} onPress={onAccept} activeOpacity={0.8}>
              <Text style={styles.acceptText}>Accept Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={onDecline} activeOpacity={0.8}>
              <Text style={styles.declineText}>Decline Request</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: SPACING.lg,
  },
  displayName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text.primary,
  },
  username: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  timestamp: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  acceptButton: {
    height: 36,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
    backgroundColor: COLORS.interactive.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.surface.base,
  },
  declineButton: {
    height: 36,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.md,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
});
