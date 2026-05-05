import React, { useState, useMemo } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_DATE = new Date(CURRENT_YEAR - 100, 0, 1);
const MAX_DATE = new Date();

interface BirthdayPickerProps {
  month: number | null;
  day: number | null;
  year: number | null;
  onChange: (month: number | null, day: number | null, year: number | null) => void;
  disabled?: boolean;
}

export function BirthdayPicker({
  month,
  day,
  year,
  onChange,
  disabled = false,
}: BirthdayPickerProps) {
  const { colors } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(new Date(1990, 0, 1));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          gap: SPACING.sm,
        },
        // Flat trigger — surface.base bg contrasts against outer surface.card
        trigger: {
          flex: 1,
          height: 44,
          backgroundColor: colors.surface.base,
          borderRadius: RADII.md,
          paddingHorizontal: SPACING.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
        triggerDisabled: {
          opacity: 0.5,
        },
        triggerTextPlaceholder: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.regular,
          color: colors.text.secondary,
        },
        triggerTextSelected: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.body.semibold,
          color: colors.text.primary,
        },
        // Chip-style Clear button — small, left-aligned, icon + text
        clearChip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACING.xs,
          alignSelf: 'flex-start',
          marginTop: SPACING.sm,
          backgroundColor: colors.border + '80',
          borderRadius: RADII.full,
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
        },
        clearChipText: {
          fontSize: FONT_SIZE.xs,
          fontFamily: FONT_FAMILY.body.medium,
          color: colors.text.secondary,
        },
        // Picker modal
        modalBackdrop: {
          flex: 1,
          justifyContent: 'flex-end',
          // eslint-disable-next-line campfire/no-hardcoded-styles
          backgroundColor: 'rgba(0,0,0,0.5)',
        },
        sheet: {
          backgroundColor: colors.surface.card,
          borderTopLeftRadius: RADII.lg,
          borderTopRightRadius: RADII.lg,
          paddingBottom: SPACING.xxl,
        },
        sheetHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        sheetTitle: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.text.primary,
        },
        doneButton: {
          fontSize: FONT_SIZE.md,
          fontFamily: FONT_FAMILY.display.semibold,
          color: colors.interactive.accent,
        },
        pickerCenter: {
          alignItems: 'center',
        },
      }),
    [colors]
  );

  function handleOpenPicker() {
    if (disabled) return;
    Keyboard.dismiss();
    const d =
      month !== null && day !== null && year !== null
        ? new Date(year, month - 1, day)
        : new Date(1990, 0, 1);
    setPickerDate(d);
    setPickerVisible(true);
  }

  function handlePickerChange(_: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setPickerVisible(false);
      if (date) {
        onChange(date.getMonth() + 1, date.getDate(), date.getFullYear());
      }
    } else {
      if (date) setPickerDate(date);
    }
  }

  function handleDone() {
    setPickerVisible(false);
    onChange(pickerDate.getMonth() + 1, pickerDate.getDate(), pickerDate.getFullYear());
  }

  function handleClearBirthday() {
    onChange(null, null, null);
  }

  const monthLabel = month !== null ? MONTH_NAMES[month - 1] : null;
  const dayLabel = day !== null ? String(day) : null;

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.trigger, disabled && styles.triggerDisabled]}
          onPress={handleOpenPicker}
          activeOpacity={0.7}
          disabled={disabled}
          accessibilityLabel={`Select birth month, currently ${month ? MONTH_NAMES_FULL[month - 1] : 'not set'}`}
        >
          <Text style={monthLabel ? styles.triggerTextSelected : styles.triggerTextPlaceholder}>
            {monthLabel ?? 'Month'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.trigger, disabled && styles.triggerDisabled]}
          onPress={handleOpenPicker}
          activeOpacity={0.7}
          disabled={disabled}
          accessibilityLabel={`Select birth day, currently ${day ? String(day) : 'not set'}`}
        >
          <Text style={dayLabel ? styles.triggerTextSelected : styles.triggerTextPlaceholder}>
            {dayLabel ?? 'Day'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.trigger, disabled && styles.triggerDisabled]}
          onPress={handleOpenPicker}
          activeOpacity={0.7}
          disabled={disabled}
          accessibilityLabel={`Select birth year, currently ${year !== null ? String(year) : 'not set'}`}
        >
          <Text style={year !== null ? styles.triggerTextSelected : styles.triggerTextPlaceholder}>
            {year !== null ? String(year) : 'Year'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chip-style Clear button */}
      {month !== null && day !== null && year !== null && (
        <TouchableOpacity
          style={styles.clearChip}
          onPress={handleClearBirthday}
          accessibilityLabel="Clear birthday"
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle-outline" size={12} color={colors.text.secondary} />
          <Text style={styles.clearChipText}>Clear birthday</Text>
        </TouchableOpacity>
      )}

      {/* iOS: modal with native spinner */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={pickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerVisible(false)} />
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Birthday</Text>
                <Pressable onPress={handleDone} accessibilityLabel="Confirm birthday selection">
                  <Text style={styles.doneButton}>Done</Text>
                </Pressable>
              </View>
              <View style={styles.pickerCenter}>
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display="spinner"
                  onChange={handlePickerChange}
                  minimumDate={MIN_DATE}
                  maximumDate={MAX_DATE}
                  themeVariant="dark"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Android: inline picker */}
      {Platform.OS === 'android' && pickerVisible && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="spinner"
          onChange={handlePickerChange}
          minimumDate={MIN_DATE}
          maximumDate={MAX_DATE}
        />
      )}
    </View>
  );
}
