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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme, FONT_FAMILY, FONT_SIZE, RADII, SPACING } from '@/theme';

// ---------------------------------------------------------------------------
// Data constants
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_DATE = new Date(CURRENT_YEAR - 100, 0, 1);
const MAX_DATE = new Date();

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BirthdayPickerProps {
  month: number | null; // 1-12 or null
  day: number | null;   // 1-31 or null
  year: number | null;  // 4-digit year or null
  onChange: (month: number | null, day: number | null, year: number | null) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BirthdayPicker({ month, day, year, onChange, disabled = false }: BirthdayPickerProps) {
  const { colors } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(new Date(1990, 0, 1));

  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    trigger: {
      flex: 1,
      height: 52,
      backgroundColor: colors.surface.card,
      borderRadius: RADII.lg,
      paddingHorizontal: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    triggerDisabled: {
      opacity: 0.5,
    },
    triggerTextPlaceholder: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.secondary,
    },
    triggerTextSelected: {
      fontSize: FONT_SIZE.lg,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.text.primary,
    },
    clearLink: {
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.body.regular,
      color: colors.interactive.accent,
      textAlign: 'right',
      marginTop: SPACING.xs,
    },
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
  }), [colors]);

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
      {/* Three triggers side by side — all open the same native picker */}
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

      {/* Clear Birthday link — shown only when all three are set */}
      {month !== null && day !== null && year !== null && (
        <TouchableOpacity
          onPress={handleClearBirthday}
          accessibilityLabel="Clear birthday"
          activeOpacity={0.7}
        >
          <Text style={styles.clearLink}>Clear Birthday</Text>
        </TouchableOpacity>
      )}

      {/* iOS: modal with native spinner + Done button */}
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

      {/* Android: native picker shown inline (has built-in OK/Cancel) */}
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
