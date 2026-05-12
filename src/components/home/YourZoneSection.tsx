import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';
import { SectionHeader } from '@/components/common/SectionHeader';
import { formatCentsDisplay } from '@/utils/currencyFormat';
import { formatBirthdayDate, formatDaysUntil } from '@/utils/birthdayFormatters';
import { useStreakData } from '@/hooks/useStreakData';
import type { IOUSummaryData } from '@/hooks/useIOUSummary';
import type { UpcomingBirthdaysData } from '@/hooks/useUpcomingBirthdays';
import { TileShell, EyebrowPill, type IconName } from './HomeTilePrimitives';

const TOP_ROW_HEIGHT = 170;
const STREAK_HEIGHT = 130;
const PULSE_CYCLE_MS = 1600;

interface YourZoneSectionProps {
  iouSummary: IOUSummaryData;
  birthdays: UpcomingBirthdaysData;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (mounted) setReduced(r);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (r) => setReduced(!!r));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

export function YourZoneSection({ iouSummary, birthdays }: YourZoneSectionProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerWrapper: {
          paddingHorizontal: SPACING.lg,
        },
        seeAllText: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.interactive.accent,
        },
        topRow: {
          flexDirection: 'row',
          paddingHorizontal: SPACING.lg,
          gap: SPACING.md,
          height: TOP_ROW_HEIGHT,
        },
        streakRow: {
          paddingHorizontal: SPACING.lg,
          marginTop: SPACING.md,
          height: STREAK_HEIGHT,
        },
      }),
    [colors]
  );

  return (
    <View>
      <View style={styles.headerWrapper}>
        <SectionHeader
          title="Your circle"
          rightAction={
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/squad?tab=activity' as never)}
              hitSlop={8}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          }
        />
      </View>

      <HighlightBanner
        birthdays={birthdays}
        iouSummary={iouSummary}
        accentColor={colors.interactive.accent}
        destructiveColor={colors.interactive.destructive}
        onBirthdayPress={() => router.push('/squad/birthdays' as never)}
        onIOUPress={() => router.push('/squad/expenses' as never)}
        onStreakPress={() => router.push('/(tabs)/squad' as never)}
      />

      <View style={styles.topRow}>
        <BirthdayTile
          birthdays={birthdays}
          onPress={() => router.push('/squad/birthdays' as never)}
        />
        <IOUTile iouSummary={iouSummary} onPress={() => router.push('/squad/expenses' as never)} />
      </View>
      <View style={styles.streakRow}>
        <StreakTile onPress={() => router.push('/(tabs)/squad' as never)} />
      </View>
    </View>
  );
}

// --- Live "ON" chip ---
// StatusCard-style pulse ring + dot, used by the streak tile when active.
// Signals the streak is "ticking" without resorting to fire/flame imagery.
function LiveChip({ label = 'ON' }: { label?: string }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (reduceMotion) {
      ringScale.setValue(1);
      ringOpacity.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 2.6,
            duration: PULSE_CYCLE_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: PULSE_CYCLE_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
            isInteraction: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, ringScale, ringOpacity]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.sm,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 4,
          borderRadius: 999,
          borderWidth: 1,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          borderColor: 'rgba(185,255,59,0.45)',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(185,255,59,0.14)',
        },
        dotWrap: {
          width: 6,
          height: 6,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginRight: 6,
          alignItems: 'center',
          justifyContent: 'center',
        },
        dot: {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.interactive.accent,
        },
        ring: {
          position: 'absolute',
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.interactive.accent,
        },
        label: {
          fontFamily: FONT_FAMILY.body.bold,
          fontSize: FONT_SIZE.xs,
          letterSpacing: 0.6,
          color: colors.interactive.accent,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.chip}>
      <View style={styles.dotWrap}>
        <Animated.View
          style={[styles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
          pointerEvents="none"
        />
        <Animated.View style={styles.dot} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

// --- Streak tile (large) ---
// Single huge hero numeral on a faint neon glow when active; "no streak yet"
// with a quiet caption when cold. Apple-Fitness-rings energy — one number,
// one identity, lots of breathing room.
function StreakTile({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const { currentWeeks, bestWeeks, loading } = useStreakData();
  const isHot = currentWeeks > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        center: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        },
        valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
        hero: {
          fontFamily: FONT_FAMILY.display.extrabold,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          fontSize: 48,

          lineHeight: 48,

          letterSpacing: -1.4,
          color: colors.text.primary,
        },
        heroHot: {
          color: colors.interactive.accent,
        },
        unit: {
          fontFamily: FONT_FAMILY.body.medium,
          fontSize: FONT_SIZE.lg,
          color: colors.text.secondary,
        },
        caption: {
          fontFamily: FONT_FAMILY.body.regular,
          fontSize: FONT_SIZE.sm,
          color: colors.text.secondary,
        },
        coldBlock: {
          flex: 1,
        },
        coldHero: {
          fontFamily: FONT_FAMILY.display.bold,
          fontSize: FONT_SIZE.xl,
          color: colors.text.primary,

          letterSpacing: -0.4,
        },
        coldCaption: {
          fontFamily: FONT_FAMILY.body.regular,
          fontSize: FONT_SIZE.sm,
          color: colors.text.secondary,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: 4,
        },
      }),
    [colors]
  );

  const unit = currentWeeks === 1 ? 'week' : 'weeks';
  const bestUnit = bestWeeks === 1 ? 'week' : 'weeks';

  const a11y = loading
    ? 'Streak: loading'
    : isHot
      ? `Streak: ${currentWeeks} ${unit}, best ${bestWeeks} ${bestUnit}`
      : 'No streak yet — log activity to start';

  return (
    <TileShell
      eyebrow={<EyebrowPill icon="flame" label="Goals" />}
      chip={isHot ? <LiveChip label="ON" /> : null}
      hot={isHot}
      onPress={onPress}
      a11yLabel={a11y}
    >
      <View style={styles.center}>
        {loading ? (
          <Text style={styles.hero}>—</Text>
        ) : isHot ? (
          <>
            <View style={styles.valueRow}>
              <Text style={[styles.hero, styles.heroHot]}>{currentWeeks}</Text>
              <Text style={styles.unit}>{unit}</Text>
            </View>
            {bestWeeks > 0 ? (
              <Text style={styles.caption}>
                best {bestWeeks} {bestUnit}
              </Text>
            ) : null}
          </>
        ) : (
          <View style={styles.coldBlock}>
            <Text style={styles.coldHero}>no streak yet</Text>
            <Text style={styles.coldCaption}>log a hangout to start</Text>
          </View>
        )}
      </View>
    </TileShell>
  );
}

// --- Birthday tile (small) ---
// Lists the next 2 birthdays as full rows: avatar on the left (with neon ring
// on the imminent one) + name on top + date · countdown beneath. Hairline
// divider between rows. The corner chip is a gift glyph, not an avatar — the
// avatars live inside the rows where they belong.
interface BirthdayTileProps {
  birthdays: UpcomingBirthdaysData;
  onPress: () => void;
}

function BirthdayTile({ birthdays, onPress }: BirthdayTileProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: {
          flex: 1,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: 8,
        },
        entry: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
        },
        entryText: {
          flex: 1,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          gap: 2,
        },
        name: {
          fontFamily: FONT_FAMILY.display.bold,
          fontSize: FONT_SIZE.lg,
          color: colors.text.primary,

          letterSpacing: -0.3,
        },
        meta: {
          fontFamily: FONT_FAMILY.body.medium,
          fontSize: FONT_SIZE.sm,
          color: colors.text.secondary,
        },
        metaHot: {
          color: colors.interactive.accent,
          fontFamily: FONT_FAMILY.body.semibold,
        },
        divider: {
          height: 1,
          backgroundColor: colors.border,
        },
        moreHint: {
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.xs,
          color: colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: 6,
          paddingTop: SPACING.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        emptyHero: {
          fontFamily: FONT_FAMILY.display.bold,
          fontSize: FONT_SIZE.xl,
          color: colors.text.primary,

          letterSpacing: -0.4,
        },
        emptyCaption: {
          fontFamily: FONT_FAMILY.body.regular,
          fontSize: FONT_SIZE.sm,
          color: colors.text.secondary,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: 4,
        },
      }),
    [colors]
  );

  // Show only birthdays falling in the *current calendar month*. The hook
  // already returns upcoming entries in date order, so filtering by
  // birthday_month gives us this-month-and-beyond — clip to the current month.
  const currentMonth = new Date().getMonth() + 1;
  const monthEntries = birthdays.entries.filter((e) => e.birthday_month === currentMonth);
  const top = monthEntries.slice(0, 2);
  const restCount = Math.max(0, monthEntries.length - top.length);
  const next = top[0];
  const isImminent = !!next && next.days_until <= 1;

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());

  const a11y =
    top.length > 0
      ? `${monthName} birthdays: ${top
          .map((e) => `${e.display_name.split(' ')[0]} ${formatDaysUntil(e.days_until)}`)
          .join(', ')}${restCount > 0 ? `, plus ${restCount} more` : ''}`
      : `Birthdays: ${birthdays.loading ? 'loading' : `no birthdays in ${monthName}`}`;

  return (
    <TileShell
      eyebrow={<EyebrowPill icon="gift" label="B-days" />}
      hot={isImminent}
      onPress={onPress}
      a11yLabel={a11y}
    >
      {top.length > 0 ? (
        <View style={styles.list}>
          {top.map((entry, idx) => {
            const firstName = entry.display_name.split(' ')[0] ?? entry.display_name;
            const isHot = entry.days_until <= 1;
            const date = formatBirthdayDate(entry.birthday_month, entry.birthday_day);
            const countdown = formatDaysUntil(entry.days_until).toLowerCase();
            return (
              <React.Fragment key={entry.friend_id}>
                {idx > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.entry}>
                  <MiniAvatar
                    size={36}
                    uri={entry.avatar_url}
                    displayName={entry.display_name}
                    ring={isHot}
                  />
                  <View style={styles.entryText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {firstName}
                    </Text>
                    <Text style={[styles.meta, isHot ? styles.metaHot : null]} numberOfLines={1}>
                      {date} {'·'} {countdown}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
          {restCount > 0 ? (
            <Text style={styles.moreHint} numberOfLines={1}>
              +{restCount} more this month
            </Text>
          ) : null}
        </View>
      ) : (
        <View>
          <Text style={styles.emptyHero}>{birthdays.loading ? '—' : 'quiet month'}</Text>
          {!birthdays.loading ? (
            <Text style={styles.emptyCaption}>no birthdays in {monthName}</Text>
          ) : null}
        </View>
      )}
    </TileShell>
  );
}

// --- IOU tile (small) ---
// Three stacked rows separated by hairlines: you'll get (incoming arrow,
// green), you'll give (outgoing arrow, red), and net (no arrow, signed and
// colored by direction). Wallet glyph in the corner. When fully settled, the
// tile dims to "all settled" with a check.
interface IOUTileProps {
  iouSummary: IOUSummaryData;
  onPress: () => void;
}

function IOUTile({ iouSummary, onPress }: IOUTileProps) {
  const { colors } = useTheme();

  const { owedToYou, youOwe } = useMemo(() => {
    let getCents = 0;
    let giveCents = 0;
    for (const r of iouSummary.rows) {
      if (r.unsettled_count <= 0) continue;
      if (r.net_amount_cents > 0) getCents += r.net_amount_cents;
      else if (r.net_amount_cents < 0) giveCents += Math.abs(r.net_amount_cents);
    }
    return { owedToYou: getCents, youOwe: giveCents };
  }, [iouSummary.rows]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        list: {
          flex: 1,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          marginTop: 8,
        },
        row: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.sm,
        },
        iconSlot: {
          width: 18,
          alignItems: 'center',
          justifyContent: 'center',
        },
        label: {
          flex: 1,
          fontFamily: FONT_FAMILY.body.medium,
          fontSize: FONT_SIZE.md,
          color: colors.text.secondary,
        },
        amount: {
          fontFamily: FONT_FAMILY.display.bold,
          fontSize: FONT_SIZE.xl,

          letterSpacing: -0.5,
        },
        amountNeutral: { color: colors.text.primary },
        amountGet: { color: colors.interactive.accent },
        amountGive: { color: colors.interactive.destructive },
        netLabel: {
          flex: 1,
          fontFamily: FONT_FAMILY.body.semibold,
          fontSize: FONT_SIZE.md,
          color: colors.text.primary,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        divider: {
          height: 1,
          backgroundColor: colors.border,
        },
        emptyHero: {
          fontFamily: FONT_FAMILY.display.bold,
          fontSize: FONT_SIZE.xl,
          color: colors.text.primary,

          letterSpacing: -0.4,
        },
      }),
    [colors]
  );

  const allClear = !iouSummary.loading && owedToYou === 0 && youOwe === 0;

  // Net position: positive = you're up, negative = you owe overall, zero = even.
  const netCents = owedToYou - youOwe;
  const netIsPositive = netCents > 0;
  const netIsNegative = netCents < 0;

  const a11y = iouSummary.loading
    ? 'IOUs: loading'
    : allClear
      ? 'IOUs: all settled'
      : `IOUs: ${formatCentsDisplay(owedToYou)} you'll get, ${formatCentsDisplay(
          youOwe
        )} you'll give, net ${
          netIsNegative
            ? `minus ${formatCentsDisplay(Math.abs(netCents))}`
            : netIsPositive
              ? formatCentsDisplay(netCents)
              : 'zero'
        }`;

  return (
    <TileShell
      eyebrow={<EyebrowPill icon="wallet-outline" label="IOUs" />}
      chip={
        allClear ? <Ionicons name="checkmark" size={18} color={colors.interactive.accent} /> : null
      }
      onPress={onPress}
      a11yLabel={a11y}
    >
      {iouSummary.loading ? (
        <Text style={[styles.amount, styles.amountNeutral]}>—</Text>
      ) : allClear ? (
        <Text style={styles.emptyHero}>all settled</Text>
      ) : (
        <View style={styles.list}>
          <View style={styles.row}>
            <View style={styles.iconSlot}>
              <Ionicons name="arrow-down" size={14} color={colors.interactive.accent} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              you&apos;ll get
            </Text>
            <Text style={[styles.amount, styles.amountGet]} numberOfLines={1}>
              {formatCentsDisplay(owedToYou)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.iconSlot}>
              <Ionicons name="arrow-up" size={14} color={colors.interactive.destructive} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              you&apos;ll give
            </Text>
            <Text style={[styles.amount, styles.amountGive]} numberOfLines={1}>
              {formatCentsDisplay(youOwe)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.iconSlot} />
            <Text style={styles.netLabel} numberOfLines={1}>
              net
            </Text>
            <Text
              style={[
                styles.amount,
                netIsPositive
                  ? styles.amountGet
                  : netIsNegative
                    ? styles.amountGive
                    : styles.amountNeutral,
              ]}
              numberOfLines={1}
            >
              {netIsNegative ? '-' : ''}
              {formatCentsDisplay(Math.abs(netCents))}
            </Text>
          </View>
        </View>
      )}
    </TileShell>
  );
}

// --- Highlight banner ---
// Single contextual nudge displayed above the 3-tile grid. Picks the most
// time-sensitive thing the user should know about right now:
//   1. Birthday today (highest priority)
//   2. Outstanding IOU you owe (≥ $20)
//   3. Active streak (ambient nudge to log activity)
// Returns null when nothing qualifies.
interface HighlightBannerProps {
  birthdays: UpcomingBirthdaysData;
  iouSummary: IOUSummaryData;
  accentColor: string;
  destructiveColor: string;
  onBirthdayPress: () => void;
  onIOUPress: () => void;
  onStreakPress: () => void;
}

const IOU_BANNER_THRESHOLD_CENTS = 2000; // $20

interface BannerItem {
  key: 'birthday' | 'iou' | 'streak';
  toneColor: string;
  labelText: string;
  labelIcon: IconName;
  message: string;
  buttonText: string;
  buttonA11y: string;
  bannerA11y: string;
  onPress: () => void;
  visualType: 'avatar' | 'icon';
  avatarUri?: string | null;
  avatarName?: string;
  iconName?: IconName;
}

const BANNER_INTERVAL_MS = 4500;
const BANNER_FADE_MS = 250;

function HighlightBanner({
  birthdays,
  iouSummary,
  accentColor,
  destructiveColor,
  onBirthdayPress,
  onIOUPress,
  onStreakPress,
}: HighlightBannerProps) {
  const { colors } = useTheme();
  const { currentWeeks, loading: streakLoading } = useStreakData();
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  const todayBirthday = birthdays.entries.find((e) => e.days_until === 0);

  const totalYouOwe = useMemo(
    () =>
      iouSummary.rows
        .filter((r) => r.unsettled_count > 0 && r.net_amount_cents < 0)
        .reduce((sum, r) => sum + Math.abs(r.net_amount_cents), 0),
    [iouSummary.rows]
  );

  const bannerItems = useMemo<BannerItem[]>(() => {
    const items: BannerItem[] = [];

    if (todayBirthday) {
      const firstName = todayBirthday.display_name.split(' ')[0] ?? todayBirthday.display_name;
      items.push({
        key: 'birthday',
        toneColor: accentColor,
        labelText: 'Today',
        labelIcon: 'gift-outline',
        message: `${firstName}'s birthday`,
        buttonText: 'Wish',
        buttonA11y: `Wish ${firstName}`,
        bannerA11y: `Today is ${firstName}'s birthday. Tap to wish.`,
        onPress: onBirthdayPress,
        visualType: 'avatar',
        avatarUri: todayBirthday.avatar_url,
        avatarName: todayBirthday.display_name,
      });
    }

    if (totalYouOwe >= IOU_BANNER_THRESHOLD_CENTS) {
      items.push({
        key: 'iou',
        toneColor: destructiveColor,
        labelText: 'To pay',
        labelIcon: 'alert-circle-outline',
        message: `${formatCentsDisplay(totalYouOwe)} outstanding`,
        buttonText: 'Settle',
        buttonA11y: 'Settle balances',
        bannerA11y: `You owe ${formatCentsDisplay(totalYouOwe)}. Tap to settle.`,
        onPress: onIOUPress,
        visualType: 'icon',
        iconName: 'cash-outline',
      });
    }

    if (!streakLoading && currentWeeks > 0) {
      const weeksLabel = currentWeeks === 1 ? 'week' : 'weeks';
      items.push({
        key: 'streak',
        toneColor: accentColor,
        labelText: 'Streak',
        labelIcon: 'flame-outline',
        message: `${currentWeeks} ${weeksLabel} — keep it up`,
        buttonText: 'Log',
        buttonA11y: 'Log activity',
        bannerA11y: `On a ${currentWeeks} ${weeksLabel} streak. Tap to log activity.`,
        onPress: onStreakPress,
        visualType: 'icon',
        iconName: 'flame-outline',
      });
    }

    return items;
  }, [
    todayBirthday,
    totalYouOwe,
    currentWeeks,
    streakLoading,
    accentColor,
    destructiveColor,
    onBirthdayPress,
    onIOUPress,
    onStreakPress,
  ]);

  // Clamp index when the active list shrinks (e.g., user pays off an IOU).
  useEffect(() => {
    if (index >= bannerItems.length && bannerItems.length > 0) {
      setIndex(0);
    }
  }, [bannerItems.length, index]);

  // Auto-cycle: fade out → advance index → fade in. Pauses while pressed and
  // when reduce-motion is enabled.
  useEffect(() => {
    if (bannerItems.length <= 1 || pressed || reduceMotion) return;
    const id = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: BANNER_FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        setIndex((i) => (i + 1) % bannerItems.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: BANNER_FADE_MS,
          useNativeDriver: true,
        }).start();
      });
    }, BANNER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [bannerItems.length, pressed, reduceMotion, opacity]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          paddingHorizontal: SPACING.lg,
          marginBottom: SPACING.md,
        },
        banner: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.md,
          padding: SPACING.md,
          backgroundColor: colors.surface.card,
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: colors.border,
          ...colors.cardElevation,
        },
        textBlock: {
          flex: 1,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          gap: 2,
        },
        labelRow: {
          flexDirection: 'row',
          alignItems: 'center',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          gap: 4,
        },
        label: {
          fontFamily: FONT_FAMILY.display.semibold,
          fontSize: FONT_SIZE.xs,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        },
        message: {
          fontFamily: FONT_FAMILY.display.semibold,
          fontSize: FONT_SIZE.md,
          color: colors.text.primary,
        },
        button: {
          paddingHorizontal: SPACING.md,
          // eslint-disable-next-line campfire/no-hardcoded-styles
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
        },
        buttonText: {
          fontFamily: FONT_FAMILY.body.bold,
          fontSize: FONT_SIZE.sm,
          letterSpacing: 0.3,
        },
        iconWrap: {
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors]
  );

  if (bannerItems.length === 0) return null;

  const item = bannerItems[index] ?? bannerItems[0];
  if (!item) return null;

  // Match EventCard's "accent-tinted glass" treatment: button bg is the
  // accent at 18% with a 45% accent border, text is the full accent. For the
  // destructive (IOU) variant, swap accent for destructive at the same alphas.
  const isDestructive = item.toneColor === destructiveColor;
  const buttonBg = isDestructive ? 'rgba(248,113,113,0.16)' : 'rgba(185,255,59,0.18)';
  const buttonBorder = isDestructive ? 'rgba(248,113,113,0.45)' : 'rgba(185,255,59,0.45)';
  const iconBorder = isDestructive ? 'rgba(248,113,113,0.45)' : 'rgba(185,255,59,0.45)';

  return (
    <View style={styles.wrapper}>
      <Animated.View style={{ opacity }}>
        <Pressable
          style={({ pressed: p }) => [styles.banner, p ? { opacity: 0.85 } : null]}
          onPress={item.onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          accessibilityRole="button"
          accessibilityLabel={item.bannerA11y}
        >
          {item.visualType === 'avatar' ? (
            <MiniAvatar
              size={32}
              uri={item.avatarUri ?? null}
              displayName={item.avatarName ?? ''}
              ring
            />
          ) : item.iconName ? (
            <View style={[styles.iconWrap, { borderColor: iconBorder }]}>
              <Ionicons name={item.iconName} size={16} color={item.toneColor} />
            </View>
          ) : null}
          <View style={styles.textBlock}>
            <View style={styles.labelRow}>
              <Ionicons name={item.labelIcon} size={11} color={item.toneColor} />
              <Text style={[styles.label, { color: item.toneColor }]}>{item.labelText}</Text>
            </View>
            <Text style={styles.message} numberOfLines={1}>
              {item.message}
            </Text>
          </View>
          <Pressable
            style={[styles.button, { backgroundColor: buttonBg, borderColor: buttonBorder }]}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.buttonA11y}
          >
            <Text style={[styles.buttonText, { color: item.toneColor }]}>{item.buttonText}</Text>
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// --- Mini avatar ---
// AvatarCircle's initials font is hardcoded at FONT_SIZE.xl and overflows
// at small sizes (≤ 28pt), so use a custom mini variant that scales the
// initials proportionally to the circle. Optional accent ring matches the
// brand neon (or the destructive red in the imminent-birthday case via the
// MiniAvatar caller — currently only neon is used).
interface MiniAvatarProps {
  size: number;
  uri: string | null;
  displayName: string;
  ring?: boolean;
}

function MiniAvatar({ size, uri, displayName, ring }: MiniAvatarProps) {
  const { colors } = useTheme();
  const ringWidth = 1.5;
  const outerSize = ring ? size + ringWidth * 2 : size;
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const inner = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surface.card,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text
          style={{
            fontSize: Math.max(9, Math.round(size * 0.42)),
            fontFamily: FONT_FAMILY.display.semibold,
            color: colors.interactive.accent,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );

  if (!ring) return inner;

  return (
    <View
      style={{
        width: outerSize,
        height: outerSize,
        borderRadius: outerSize / 2,
        backgroundColor: colors.interactive.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {inner}
    </View>
  );
}
