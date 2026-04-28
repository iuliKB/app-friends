import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { usePoll } from '@/hooks/usePoll';
import type { MessageWithProfile } from '@/types/chat';
import type { PollOption } from '@/hooks/usePoll';

interface PollCardProps {
  message: MessageWithProfile;
  currentUserId: string;
  lastPollVoteEvent: { pollId: string; timestamp: number } | null;
}

interface OptionRowProps {
  option: PollOption;
  isSelected: boolean;
  hasVoted: boolean;
  totalVotes: number;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function OptionRow({ option, isSelected, hasVoted, totalVotes, onPress, colors }: OptionRowProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => StyleSheet.create({
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 44,
    },
    radioCircle: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 20,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 20,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderRadius: 10,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderWidth: 2,
      marginRight: SPACING.sm,
    },
    optionLabel: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    barTrack: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 4,
      backgroundColor: colors.surface.overlay,
      borderRadius: RADII.xs,
      overflow: 'hidden',
      flex: 1,
      marginHorizontal: SPACING.sm,
    },
    barFill: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 4,
      borderRadius: RADII.xs,
    },
    voteCount: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
  }), [colors]);

  useEffect(() => {
    if (hasVoted) {
      const fraction = totalVotes > 0 ? option.votes / totalVotes : 0;
      Animated.timing(widthAnim, {
        toValue: fraction,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(widthAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [hasVoted, option.votes, totalVotes]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TouchableOpacity
      style={styles.optionRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${option.label}, ${option.votes} votes, ${isSelected ? 'selected' : 'not selected'}`}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.radioCircle,
          isSelected
            ? { backgroundColor: colors.interactive.accent, borderColor: colors.interactive.accent }
            : { backgroundColor: 'transparent', borderColor: colors.border },
        ]}
      />
      <Text style={styles.optionLabel}>{option.label}</Text>
      {hasVoted && (
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: isSelected ? colors.interactive.accent : colors.surface.overlay,
              },
            ]}
          />
        </View>
      )}
      {hasVoted && <Text style={styles.voteCount}>{option.votes}</Text>}
    </TouchableOpacity>
  );
}

export function PollCard({ message, lastPollVoteEvent }: PollCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    card: {
      width: '100%',
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      paddingVertical: SPACING.lg,
      marginBottom: SPACING.xs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    emoji: { fontSize: FONT_SIZE.xl, marginRight: SPACING.sm },
    question: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      lineHeight: FONT_SIZE.lg * 1.4,
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: SPACING.sm },
    footer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
    footerText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
  }), [colors]);

  const { pollState, loading, vote, unVote } = usePoll(message.poll_id, lastPollVoteEvent);

  // Pitfall 5 — null guard: poll_id is null while optimistic send is in-flight
  if (!message.poll_id || message.pending) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.interactive.accent} />
      </View>
    );
  }

  if (loading || !pollState) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.interactive.accent} />
      </View>
    );
  }

  function handleOptionTap(optionId: string) {
    if (pollState?.myVotedOptionId === optionId) {
      void unVote();
    } else {
      void vote(optionId);
    }
  }

  const hasVoted = pollState.myVotedOptionId !== null;

  return (
    <View style={styles.card}>
      {/* Header: emoji + question */}
      <View style={styles.header}>
        <Text style={styles.emoji}>📊</Text>
        <Text style={styles.question}>{pollState.question}</Text>
      </View>
      {/* Divider */}
      <View style={styles.divider} />
      {/* Option rows */}
      {pollState.options.map((option) => (
        <OptionRow
          key={option.id}
          option={option}
          isSelected={pollState.myVotedOptionId === option.id}
          hasVoted={hasVoted}
          totalVotes={pollState.totalVotes}
          onPress={() => handleOptionTap(option.id)}
          colors={colors}
        />
      ))}
      {/* Footer divider + vote count */}
      <View style={styles.divider} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {pollState.totalVotes === 1 ? '1 vote' : `${pollState.totalVotes} votes`}
        </Text>
      </View>
    </View>
  );
}
