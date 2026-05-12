import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';
import { AvatarCircle } from '@/components/common/AvatarCircle';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/lib/supabase';

const AVATAR_SIZE = 44;

function weekdayName(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'long' });
}

function monthDay(d: Date): string {
  return d.toLocaleDateString([], { month: 'long', day: 'numeric' });
}

function firstName(displayName: string | null | undefined): string {
  if (!displayName) return '';
  return displayName.trim().split(/\s+/)[0] ?? '';
}

export function HomeTopBar() {
  const { colors } = useTheme();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);

  const [now, setNow] = useState(() => new Date());
  const [profile, setProfile] = useState<{
    display_name: string;
    avatar_url: string | null;
  } | null>(null);

  // Tick the clock once a minute so the displayed time stays current.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fetch the lightweight profile fields we need for greeting + avatar.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setProfile({
          display_name: (data.display_name as string) ?? '',
          avatar_url: (data.avatar_url as string | null) ?? null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING.lg,
          paddingBottom: SPACING.md,
        },
        textBlock: {
          flex: 1,
          paddingRight: SPACING.md,
        },
        dateLabel: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: SPACING.xs,
        },
        greeting: {
          fontSize: FONT_SIZE.xxl,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        greetingName: {
          color: colors.interactive.accent,
          fontFamily: FONT_FAMILY.display.bold,
        },
        statusPrompt: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.primary,
          marginTop: SPACING.xs,
        },
        avatarPressable: {
          borderRadius: RADII.full,
          overflow: 'hidden',
        },
        avatarPressed: {
          opacity: 0.85,
        },
      }),
    [colors]
  );

  const name = firstName(profile?.display_name);

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.dateLabel} numberOfLines={1}>
          {`${weekdayName(now)} · ${monthDay(now)}`}
        </Text>
        <Text style={styles.greeting} numberOfLines={1}>
          {name ? (
            <>
              {'Hey, '}
              <Text style={styles.greetingName}>{name}</Text>
            </>
          ) : (
            'Hey there'
          )}
        </Text>
        <Text style={styles.statusPrompt} numberOfLines={1}>
          What's your status today?
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/(tabs)/profile')}
        style={({ pressed }) => [styles.avatarPressable, pressed && styles.avatarPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        hitSlop={8}
      >
        <AvatarCircle
          size={AVATAR_SIZE}
          imageUri={profile?.avatar_url}
          displayName={profile?.display_name || 'You'}
        />
      </Pressable>
    </View>
  );
}
