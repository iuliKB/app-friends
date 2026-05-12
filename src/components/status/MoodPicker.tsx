import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme, SPACING, FONT_SIZE, FONT_FAMILY, RADII } from '@/theme';
import { useStatus } from '@/hooks/useStatus';
import { MOOD_PRESETS } from '@/components/status/moodPresets';
import { getWindowOptions } from '@/lib/windows';
import type { StatusValue, WindowId } from '@/types/app';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MoodPickerProps {
  onCommit?: () => void;
  onClose?: () => void;
  /** Driven by the parent sheet — flips false→true triggers state reset on each open. */
  visible?: boolean;
}

const MOOD_ICONS: Record<StatusValue, keyof typeof Ionicons.glyphMap> = {
  free: 'sunny-outline',
  maybe: 'help-outline',
  busy: 'moon-outline',
};

const MOOD_LABELS: Record<StatusValue, string> = {
  free: 'Free',
  maybe: 'Maybe',
  busy: 'Busy',
};

const TAG_SECTION_LABELS: Record<StatusValue, string> = {
  free: "I'm down to…",
  maybe: 'I might…',
  busy: "I'm…",
};

const MOOD_ORDER: StatusValue[] = ['free', 'maybe', 'busy'];
const ACTIVE_TINT_OPACITY = 0.15;
const CUSTOM_TAG_MAX_LENGTH = 20;

function formatTimeLabel(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`;
}

function formatExpiryShort(iso: string): string {
  return `until ${formatTimeLabel(new Date(iso))}`;
}

function defaultCustomTime(): Date {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const m = d.getMinutes();
  d.setMinutes(Math.ceil(m / 15) * 15, 0, 0);
  return d;
}

function ensureFuture(d: Date): Date {
  if (d.getTime() > Date.now()) return d;
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return next;
}

type WindowSelection =
  | { kind: 'preset'; id: WindowId }
  | { kind: 'custom'; expiry: Date };

export function MoodPicker({ onCommit, onClose, visible = true }: MoodPickerProps) {
  const { colors, isDark } = useTheme();
  const { currentStatus, saving, setStatus } = useStatus();

  const [activeMood, setActiveMood] = useState<StatusValue>('free');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<WindowSelection>({
    kind: 'preset',
    id: '1h',
  });
  // Custom tag input
  const [customInputOpen, setCustomInputOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const customInputRef = useRef<TextInput>(null);
  // Custom time picker
  const [customTimeOpen, setCustomTimeOpen] = useState(false);
  const [customTime, setCustomTime] = useState<Date>(() => defaultCustomTime());

  // C1: tinted-bg fade for the active mood row.
  const activeAnims = useRef<Record<StatusValue, Animated.Value>>({
    free: new Animated.Value(0),
    maybe: new Animated.Value(0),
    busy: new Animated.Value(0),
  }).current;

  // B2: success ✓ overlay value.
  const successAnim = useRef(new Animated.Value(0)).current;

  // Animate tint based on which mood is currently active in the picker.
  useEffect(() => {
    MOOD_ORDER.forEach((m) => {
      Animated.timing(activeAnims[m], {
        toValue: m === activeMood ? ACTIVE_TINT_OPACITY : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }, [activeMood, activeAnims]);

  // Reset state on each open. Defaults seed from currentStatus when present.
  useEffect(() => {
    if (!visible) return;
    if (currentStatus) {
      setActiveMood(currentStatus.status);
      setSelectedTag(currentStatus.context_tag ?? null);
    } else {
      setActiveMood('free');
      setSelectedTag(null);
    }
    setSelectedWindow({ kind: 'preset', id: '1h' });
    setCustomInputOpen(false);
    setCustomDraft('');
    setCustomTimeOpen(false);
    setCustomTime(defaultCustomTime());
  }, [visible, currentStatus]);

  const handleMoodPress = useCallback(
    async (mood: StatusValue) => {
      if (mood === activeMood) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveMood(mood);
      setSelectedTag(null);
      setSelectedWindow({ kind: 'preset', id: '1h' });
      setCustomInputOpen(false);
      setCustomDraft('');
      setCustomTimeOpen(false);
    },
    [activeMood]
  );

  const handlePresetPress = useCallback((presetId: string) => {
    setSelectedTag((prev) => (prev === presetId ? null : presetId));
    setCustomInputOpen(false);
    setCustomDraft('');
  }, []);

  const isCustomTag = useMemo(() => {
    if (!selectedTag) return false;
    const presetIds = MOOD_PRESETS[activeMood]?.map((p) => p.id) ?? [];
    return !presetIds.includes(selectedTag);
  }, [selectedTag, activeMood]);

  const openCustomInput = useCallback(() => {
    setCustomDraft(isCustomTag && selectedTag ? selectedTag : '');
    setCustomInputOpen(true);
    requestAnimationFrame(() => customInputRef.current?.focus());
  }, [isCustomTag, selectedTag]);

  const submitCustomInput = useCallback(() => {
    const cleaned = customDraft.trim().toLowerCase().slice(0, CUSTOM_TAG_MAX_LENGTH);
    if (cleaned) setSelectedTag(cleaned);
    setCustomInputOpen(false);
    setCustomDraft('');
  }, [customDraft]);

  const clearCustomTag = useCallback(() => {
    setSelectedTag(null);
  }, []);

  const handleWindowSelect = useCallback((id: WindowId) => {
    setSelectedWindow({ kind: 'preset', id });
    setCustomTimeOpen(false);
  }, []);

  const openCustomTime = useCallback(() => {
    Keyboard.dismiss();
    setCustomTime(defaultCustomTime());
    setCustomTimeOpen(true);
  }, []);

  const cancelCustomTime = useCallback(() => {
    setCustomTimeOpen(false);
  }, []);

  const handleCustomTimeChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        if (event.type === 'set' && date) {
          const fixed = ensureFuture(date);
          setCustomTime(fixed);
          setSelectedWindow({ kind: 'custom', expiry: fixed });
        }
        setCustomTimeOpen(false);
        return;
      }
      // iOS spinner — track temp value; user confirms below.
      if (date) setCustomTime(date);
    },
    []
  );

  const confirmCustomTime = useCallback(() => {
    const fixed = ensureFuture(customTime);
    setSelectedWindow({ kind: 'custom', expiry: fixed });
    setCustomTimeOpen(false);
  }, [customTime]);

  const handleCommit = useCallback(async () => {
    // Flush any in-progress custom tag draft.
    let tag = selectedTag;
    if (customInputOpen) {
      const cleaned = customDraft.trim().toLowerCase().slice(0, CUSTOM_TAG_MAX_LENGTH);
      if (cleaned) tag = cleaned;
      setCustomInputOpen(false);
      setCustomDraft('');
    }
    Keyboard.dismiss();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } =
      selectedWindow.kind === 'custom'
        ? await setStatus(activeMood, tag, '1h', selectedWindow.expiry)
        : await setStatus(activeMood, tag, selectedWindow.id);
    if (error) {
      Alert.alert('Error', "Couldn't update status. Try again.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.sequence([
      Animated.timing(successAnim, { toValue: 1, duration: 110, useNativeDriver: true }),
      Animated.delay(140),
      Animated.timing(successAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start();
    onCommit?.();
  }, [
    activeMood,
    selectedTag,
    selectedWindow,
    customInputOpen,
    customDraft,
    setStatus,
    onCommit,
    successAnim,
  ]);

  // Header subtitle: mirrors the user's currently-active status.
  const subtitleText = useMemo(() => {
    if (!currentStatus) return null;
    const moodLabel = MOOD_LABELS[currentStatus.status];
    const expiry = currentStatus.status_expires_at;
    return `${moodLabel}${expiry ? ' ' + formatExpiryShort(expiry) : ''}`;
  }, [currentStatus]);

  const subtitleDotColor = useMemo(() => {
    if (!currentStatus) return null;
    return currentStatus.status === 'free'
      ? colors.status.free
      : currentStatus.status === 'maybe'
        ? colors.status.maybe
        : colors.status.busy;
  }, [currentStatus, colors]);

  const windowOpts = useMemo(() => getWindowOptions(new Date()), []);

  // Commit-button label: "Set Free for 1h" / "Set Free until 6pm" / "Set Free for the rest of day".
  const commitLabel = useMemo(() => {
    const moodLabel = MOOD_LABELS[activeMood];
    if (selectedWindow.kind === 'custom') {
      return `Set ${moodLabel} until ${formatTimeLabel(selectedWindow.expiry)}`;
    }
    const opt = windowOpts.find((w) => w.id === selectedWindow.id);
    if (selectedWindow.id === 'rest_of_day') return `Set ${moodLabel} for the rest of day`;
    return `Set ${moodLabel} ${opt?.ownLabel ?? selectedWindow.id}`;
  }, [activeMood, selectedWindow, windowOpts]);

  const activeColor = useMemo(() => {
    return activeMood === 'free'
      ? colors.status.free
      : activeMood === 'maybe'
        ? colors.status.maybe
        : colors.status.busy;
  }, [activeMood, colors]);

  const inactiveMoods = useMemo(
    () => MOOD_ORDER.filter((m) => m !== activeMood),
    [activeMood]
  );
  const activePresets = MOOD_PRESETS[activeMood];

  const isWindowSelected = useCallback(
    (id: WindowId) => selectedWindow.kind === 'preset' && selectedWindow.id === id,
    [selectedWindow]
  );
  const isCustomWindowSelected = selectedWindow.kind === 'custom';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginHorizontal: SPACING.lg,
          gap: SPACING.lg,
        },
        // Header
        header: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: SPACING.md,
        },
        headerTextWrap: {
          flex: 1,
        },
        headerTitle: {
          fontSize: FONT_SIZE.xxl,
          fontFamily: FONT_FAMILY.display.bold,
          color: colors.text.primary,
        },
        headerSubtitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 2,
          gap: SPACING.xs + 2,
        },
        headerSubtitleText: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          flexShrink: 1,
        },
        headerDot: {
          width: 8,
          height: 8,
          borderRadius: RADII.full,
        },
        closeBtn: {
          width: 36,
          height: 36,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.overlay,
        },
        // Active mood row
        activeMoodRow: {
          minHeight: 56,
          borderRadius: RADII.lg,
          borderWidth: 1,
          overflow: 'hidden',
        },
        activeMoodInner: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          gap: SPACING.md,
        },
        moodDot: {
          width: 12,
          height: 12,
          borderRadius: RADII.full,
        },
        activeMoodLabel: {
          flex: 1,
          fontSize: FONT_SIZE.xl,
          fontFamily: FONT_FAMILY.display.bold,
        },
        // Sections
        sectionLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
          marginBottom: SPACING.sm,
        },
        chipWrap: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: SPACING.sm,
        },
        // Tag chips — filled subtle bg, no border
        tagChip: {
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.sm,
          borderRadius: RADII.full,
          backgroundColor: colors.surface.overlay,
        },
        tagChipLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
        },
        addTagChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderStyle: 'dashed',
        },
        customTagPill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        customInputWrap: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: SPACING.md,
          paddingRight: SPACING.xs,
          borderRadius: RADII.full,
          borderWidth: 1,
          minWidth: 160,
          height: 36,
        },
        customInput: {
          flex: 1,
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.primary,
          padding: 0,
          margin: 0,
        },
        customSubmitBtn: {
          width: 28,
          height: 28,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: SPACING.xs,
        },
        // Window grid — outlined cells, filled when selected
        windowGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: SPACING.sm,
        },
        windowCell: {
          flexBasis: '31%',
          flexGrow: 1,
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.sm,
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          minHeight: 50,
        },
        windowCellLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.bold,
          color: colors.text.primary,
        },
        customWindowCell: {
          borderStyle: 'dashed',
        },
        // Inline time picker panel
        customTimePanel: {
          marginTop: SPACING.sm,
          padding: SPACING.md,
          borderRadius: RADII.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface.base,
        },
        customTimeHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: SPACING.xs,
        },
        customTimeTitle: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        customTimeCancel: {
          fontSize: FONT_SIZE.sm,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.secondary,
        },
        customTimeConfirm: {
          marginTop: SPACING.sm,
          paddingVertical: SPACING.md,
          borderRadius: RADII.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        customTimeConfirmLabel: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.bold,
        },
        // Inactive mood rows + divider
        divider: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: 0,
        },
        inactiveMoodRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: SPACING.md,
          gap: SPACING.md,
        },
        inactiveMoodLabel: {
          flex: 1,
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.regular,
          color: colors.text.primary,
        },
        // Commit button
        commitBtn: {
          marginTop: SPACING.sm,
          paddingVertical: SPACING.lg,
          borderRadius: RADII.full,
          alignItems: 'center',
          justifyContent: 'center',
        },
        commitBtnLabel: {
          fontSize: FONT_SIZE.lg,
          fontFamily: FONT_FAMILY.display.bold,
          color: colors.surface.base,
        },
        // Overlays
        loadingOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.surface.card + 'CC',
          alignItems: 'center',
          justifyContent: 'center',
        },
        successOverlay: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Set your status</Text>
          {subtitleText && subtitleDotColor && (
            <View style={styles.headerSubtitleRow}>
              <Text style={styles.headerSubtitleText}>Currently</Text>
              <View style={[styles.headerDot, { backgroundColor: subtitleDotColor }]} />
              <Text style={styles.headerSubtitleText} numberOfLines={1}>
                {subtitleText}
              </Text>
            </View>
          )}
        </View>
        {onClose && (
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </Pressable>
        )}
      </View>

      {/* Active mood row */}
      <View style={[styles.activeMoodRow, { borderColor: activeColor }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: activeColor, opacity: activeAnims[activeMood] },
          ]}
          pointerEvents="none"
        />
        <View style={styles.activeMoodInner}>
          <View style={[styles.moodDot, { backgroundColor: activeColor }]} />
          <Text style={[styles.activeMoodLabel, { color: activeColor }]}>
            {MOOD_LABELS[activeMood]}
          </Text>
          <Ionicons name={MOOD_ICONS[activeMood]} size={20} color={activeColor} />
        </View>
      </View>

      {/* Tag section */}
      <View>
        <Text style={styles.sectionLabel}>{TAG_SECTION_LABELS[activeMood]}</Text>
        <View style={styles.chipWrap}>
          {activePresets.map((preset) => {
            const isSelected = selectedTag === preset.id && !customInputOpen;
            return (
              <Pressable
                key={preset.id}
                onPress={() => handlePresetPress(preset.id)}
                disabled={saving}
                style={[
                  styles.tagChip,
                  isSelected && { backgroundColor: activeColor + '33' },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.tagChipLabel,
                    isSelected && {
                      color: activeColor,
                      fontFamily: FONT_FAMILY.body.semibold,
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Custom tag — three states */}
          {customInputOpen ? (
            <View style={[styles.customInputWrap, { borderColor: activeColor }]}>
              <TextInput
                ref={customInputRef}
                value={customDraft}
                onChangeText={(t) =>
                  setCustomDraft(t.toLowerCase().slice(0, CUSTOM_TAG_MAX_LENGTH))
                }
                onSubmitEditing={submitCustomInput}
                onBlur={submitCustomInput}
                placeholder="your own…"
                placeholderTextColor={colors.text.secondary}
                maxLength={CUSTOM_TAG_MAX_LENGTH}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                style={styles.customInput}
                accessibilityLabel="Custom tag"
              />
              <Pressable
                onPress={submitCustomInput}
                style={styles.customSubmitBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Save custom tag"
              >
                <Ionicons name="checkmark" size={18} color={activeColor} />
              </Pressable>
            </View>
          ) : isCustomTag ? (
            <Pressable
              onPress={openCustomInput}
              onLongPress={clearCustomTag}
              disabled={saving}
              style={[
                styles.tagChip,
                styles.customTagPill,
                { backgroundColor: activeColor + '33' },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Custom tag: ${selectedTag}. Tap to edit, long-press to clear.`}
              accessibilityState={{ selected: true }}
            >
              <Text
                style={[
                  styles.tagChipLabel,
                  { color: activeColor, fontFamily: FONT_FAMILY.body.semibold },
                ]}
                numberOfLines={1}
              >
                {selectedTag}
              </Text>
              <Ionicons name="pencil" size={12} color={activeColor} />
            </Pressable>
          ) : (
            <Pressable
              onPress={openCustomInput}
              disabled={saving}
              style={[styles.tagChip, styles.addTagChip, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Add custom tag"
            >
              <Ionicons name="add" size={14} color={colors.text.secondary} />
              <Text style={[styles.tagChipLabel, { color: colors.text.secondary }]}>
                custom
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Duration section */}
      <View>
        <Text style={styles.sectionLabel}>For how long?</Text>
        <View style={styles.windowGrid}>
          {windowOpts.map((opt) => {
            const selected = isWindowSelected(opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleWindowSelect(opt.id)}
                disabled={saving}
                style={[
                  styles.windowCell,
                  selected && { backgroundColor: activeColor, borderColor: activeColor },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Duration ${opt.label}`}
              >
                <Text
                  style={[
                    styles.windowCellLabel,
                    selected && { color: colors.surface.base },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Custom time cell */}
          <Pressable
            onPress={openCustomTime}
            disabled={saving}
            style={[
              styles.windowCell,
              styles.customWindowCell,
              isCustomWindowSelected && {
                backgroundColor: activeColor,
                borderColor: activeColor,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isCustomWindowSelected }}
            accessibilityLabel="Pick a custom time"
          >
            <Text
              style={[
                styles.windowCellLabel,
                isCustomWindowSelected
                  ? { color: colors.surface.base }
                  : { color: colors.text.secondary },
              ]}
            >
              {isCustomWindowSelected && selectedWindow.kind === 'custom'
                ? `Until ${formatTimeLabel(selectedWindow.expiry)}`
                : 'Custom'}
            </Text>
          </Pressable>
        </View>

        {/* Inline DateTimePicker */}
        {customTimeOpen && (
          <View style={styles.customTimePanel}>
            <View style={styles.customTimeHeader}>
              <Text style={styles.customTimeTitle}>Until {formatTimeLabel(customTime)}</Text>
              <Pressable
                onPress={cancelCustomTime}
                accessibilityRole="button"
                accessibilityLabel="Cancel custom time"
                hitSlop={8}
              >
                <Text style={styles.customTimeCancel}>Cancel</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={customTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minuteInterval={15}
              onChange={handleCustomTimeChange}
              themeVariant={isDark ? 'dark' : 'light'}
              style={Platform.OS === 'ios' ? { alignSelf: 'stretch' } : undefined}
            />
            {Platform.OS === 'ios' && (
              <Pressable
                onPress={confirmCustomTime}
                disabled={saving}
                style={[styles.customTimeConfirm, { backgroundColor: activeColor }]}
                accessibilityRole="button"
                accessibilityLabel={`Use until ${formatTimeLabel(customTime)}`}
              >
                <Text
                  style={[styles.customTimeConfirmLabel, { color: colors.surface.base }]}
                >
                  Use until {formatTimeLabel(customTime)}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Divider + collapsed inactive moods */}
      <View style={styles.divider} />
      {inactiveMoods.map((m) => {
        const color =
          m === 'free' ? colors.status.free : m === 'maybe' ? colors.status.maybe : colors.status.busy;
        return (
          <Pressable
            key={m}
            onPress={() => handleMoodPress(m)}
            disabled={saving}
            style={styles.inactiveMoodRow}
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${MOOD_LABELS[m]}`}
          >
            <View style={[styles.moodDot, { backgroundColor: color }]} />
            <Text style={styles.inactiveMoodLabel}>{MOOD_LABELS[m]}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
          </Pressable>
        );
      })}

      {/* Commit button */}
      <Pressable
        onPress={handleCommit}
        disabled={saving}
        style={[styles.commitBtn, { backgroundColor: activeColor }]}
        accessibilityRole="button"
        accessibilityLabel={commitLabel}
      >
        <Text style={styles.commitBtnLabel}>{commitLabel}</Text>
      </Pressable>

      {/* Loading overlay */}
      {saving && (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator color={colors.interactive.accent} size="large" />
        </View>
      )}

      {/* Success ✓ flash */}
      <Animated.View
        style={[styles.successOverlay, { opacity: successAnim }]}
        pointerEvents="none"
      >
        <Ionicons name="checkmark-circle" size={88} color={colors.interactive.accent} />
      </Animated.View>
    </View>
  );
}
