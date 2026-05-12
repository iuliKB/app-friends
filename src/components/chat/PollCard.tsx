import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      paddingVertical: SPACING.sm,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minHeight: 44,
      gap: SPACING.sm,
    },
    radioCircle: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 20,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 20,
      borderRadius: RADII.full,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderWidth: 1.5,
      flexShrink: 0,
    },
    radioInner: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 8,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 8,
      borderRadius: RADII.full,
      backgroundColor: colors.surface.base,
      alignSelf: 'center',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      marginTop: 4,
    },
    optionLabel: {
      flex: 1,
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    optionLabelSelected: {
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.interactive.accent,
    },
    barTrack: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 6,
      backgroundColor: colors.surface.overlay,
      borderRadius: RADII.xs,
      overflow: 'hidden',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      width: 80,
      flexShrink: 0,
    },
    barFill: {
      // eslint-disable-next-line campfire/no-hardcoded-styles
      height: 6,
      borderRadius: RADII.xs,
    },
    voteCount: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      minWidth: 16,
      textAlign: 'right',
    },
    voteCountSelected: {
      color: colors.interactive.accent,
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
      {/* Radio circle */}
      <View
        style={[
          styles.radioCircle,
          isSelected
            ? { backgroundColor: colors.interactive.accent, borderColor: colors.interactive.accent }
            : { backgroundColor: 'transparent', borderColor: colors.border },
        ]}
      >
        {isSelected && <View style={styles.radioInner} />}
      </View>

      {/* Label */}
      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]} numberOfLines={2}>
        {option.label}
      </Text>

      {/* Progress bar + count (after voting) */}
      {hasVoted && (
        <>
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  backgroundColor: isSelected
                    ? colors.interactive.accent
                    : colors.surface.overlay,
                },
              ]}
            />
          </View>
          <Text style={[styles.voteCount, isSelected && styles.voteCountSelected]}>
            {option.votes}
          </Text>
        </>
      )}
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
      paddingVertical: SPACING.md,
      marginBottom: SPACING.xs,
      borderWidth: StyleSheet.hairlineWidth,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      borderColor: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
      gap: SPACING.sm,
    },
    iconBadge: {
      width: 28,
      height: 28,
      borderRadius: RADII.full,
      backgroundColor: colors.interactive.accent,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      marginTop: 1,
    },
    question: {
      flex: 1,
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.display.semibold,
      color: colors.text.primary,
      lineHeight: FONT_SIZE.lg * 1.4,
    },
    pollChip: {
      backgroundColor: colors.surface.overlay,
      borderRadius: RADII.full,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      flexShrink: 0,
    },
    pollChipText: {
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.body.semibold,
      color: colors.text.secondary,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      textTransform: 'uppercase',
      // eslint-disable-next-line campfire/no-hardcoded-styles
      letterSpacing: 0.6,
    },

    // ── Divider ───────────────────────────────────────────────────────────────
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: SPACING.xs,
    },

    // ── Footer ────────────────────────────────────────────────────────────────
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
    },
    footerText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    footerHint: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
      // eslint-disable-next-line campfire/no-hardcoded-styles
      marginLeft: 'auto' as unknown as number,
    },
  }), [colors]);

  const { pollState, loading, vote, unVote } = usePoll(message.poll_id, lastPollVoteEvent);

  if (!message.poll_id || message.pending) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.interactive.accent} style={{ paddingVertical: SPACING.lg }} />
      </View>
    );
  }

  if (loading || !pollState) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.interactive.accent} style={{ paddingVertical: SPACING.lg }} />
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
      {/* Header: icon badge + question + poll chip */}
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Ionicons name="stats-chart-outline" size={14} color={colors.surface.base} />
        </View>
        <Text style={styles.question}>{pollState.question}</Text>
        <View style={styles.pollChip}>
          <Text style={styles.pollChipText}>Poll</Text>
        </View>
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

      {/* Footer divider + vote count + tap hint */}
      <View style={styles.divider} />
      <View style={styles.footer}>
        <Ionicons name="people-outline" size={13} color={colors.text.secondary} />
        <Text style={styles.footerText}>
          {pollState.totalVotes === 1 ? '1 vote' : `${pollState.totalVotes} votes`}
        </Text>
        {!hasVoted && (
          <Text style={styles.footerHint}>Tap to vote</Text>
        )}
      </View>
    </View>
  );
}
