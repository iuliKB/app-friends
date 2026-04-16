import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADII, SPACING } from '@/theme';

// ---------------------------------------------------------------------------
// Data constants
// ---------------------------------------------------------------------------

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
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - 1 - i);
// → [currentYear-1, currentYear-2, ..., currentYear-100]

function getDaysInMonth(month: number): number {
  const days: Record<number, number> = {
    1: 31,
    2: 29,
    3: 31,
    4: 30,
    5: 31,
    6: 30,
    7: 31,
    8: 31,
    9: 30,
    10: 31,
    11: 30,
    12: 31,
  };
  return days[month] ?? 31;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BirthdayPickerProps {
  month: number | null; // 1-12 or null
  day: number | null; // 1-31 or null
  year: number | null; // 4-digit year or null
  onChange: (month: number | null, day: number | null, year: number | null) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BirthdayPicker({ month, day, year, onChange, disabled = false }: BirthdayPickerProps) {
  const [openDropdown, setOpenDropdown] = useState<'month' | 'day' | 'year' | null>(null);
  const translateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (openDropdown !== null) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(300);
    }
  }, [openDropdown, translateY]);

  function handleOpenDropdown(type: 'month' | 'day' | 'year') {
    if (disabled) return;
    Keyboard.dismiss();
    setOpenDropdown(type);
  }

  function handleCloseDropdown() {
    setOpenDropdown(null);
  }

  function handleSelectMonth(newMonth: number) {
    setOpenDropdown(null);
    // Reset day if it exceeds the max days for the newly selected month
    if (day !== null && day > getDaysInMonth(newMonth)) {
      onChange(newMonth, null, year);
    } else {
      onChange(newMonth, day, year);
    }
  }

  function handleSelectDay(newDay: number) {
    setOpenDropdown(null);
    onChange(month, newDay, year);
  }

  function handleSelectYear(newYear: number) {
    setOpenDropdown(null);
    onChange(month, day, newYear);
  }

  function handleClearBirthday() {
    onChange(null, null, null);
  }

  const monthLabel = month !== null ? MONTH_NAMES[month - 1] : null;
  const dayLabel = day !== null ? String(day) : null;

  const maxDays = month !== null ? getDaysInMonth(month) : 31;

  return (
    <View>
      {/* Two triggers side by side */}
      <View style={styles.row}>
        {/* Month trigger */}
        <TouchableOpacity
          style={[styles.trigger, disabled && styles.triggerDisabled]}
          onPress={() => handleOpenDropdown('month')}
          activeOpacity={0.7}
          disabled={disabled}
          accessibilityLabel={`Select birth month, currently ${month ? MONTH_NAMES_FULL[month - 1] : 'not set'}`}
        >
          <Text style={monthLabel ? styles.triggerTextSelected : styles.triggerTextPlaceholder}>
            {monthLabel ?? 'Month'}
          </Text>
        </TouchableOpacity>

        {/* Day trigger */}
        <TouchableOpacity
          style={[styles.trigger, disabled && styles.triggerDisabled]}
          onPress={() => handleOpenDropdown('day')}
          activeOpacity={0.7}
          disabled={disabled}
          accessibilityLabel={`Select birth day, currently ${day ? String(day) : 'not set'}`}
        >
          <Text style={dayLabel ? styles.triggerTextSelected : styles.triggerTextPlaceholder}>
            {dayLabel ?? 'Day'}
          </Text>
        </TouchableOpacity>

        {/* Year trigger — NEW */}
        <TouchableOpacity
          style={[styles.trigger, disabled && styles.triggerDisabled]}
          onPress={() => handleOpenDropdown('year')}
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

      {/* Dropdown modal */}
      <Modal
        visible={openDropdown !== null}
        transparent
        animationType="none"
        onRequestClose={handleCloseDropdown}
      >
        <TouchableWithoutFeedback onPress={handleCloseDropdown}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          <ScrollView>
            {openDropdown === 'month'
              ? MONTH_NAMES.map((name, i) => {
                  const value = i + 1;
                  const isSelected = month === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={styles.optionRow}
                      onPress={() => handleSelectMonth(value)}
                      activeOpacity={0.7}
                      accessibilityLabel={MONTH_NAMES_FULL[i]}
                    >
                      <Text
                        style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              : openDropdown === 'day'
                ? Array.from({ length: maxDays }, (_, i) => {
                    const value = i + 1;
                    const isSelected = day === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={styles.optionRow}
                        onPress={() => handleSelectDay(value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.optionText, isSelected && styles.optionTextSelected]}
                        >
                          {String(value)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                : YEARS.map((y) => {
                    const isSelected = year === y;
                    return (
                      <TouchableOpacity
                        key={y}
                        style={styles.optionRow}
                        onPress={() => handleSelectYear(y)}
                        activeOpacity={0.7}
                        accessibilityLabel={String(y)}
                      >
                        <Text
                          style={[styles.optionText, isSelected && styles.optionTextSelected]}
                        >
                          {String(y)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  trigger: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.surface.card,
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
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.secondary,
  },
  triggerTextSelected: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  clearLink: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.interactive.accent,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // eslint-disable-next-line campfire/no-hardcoded-styles
    backgroundColor: 'rgba(0,0,0,0.5)', // no exact token — modal scrim, matches FriendActionSheet
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface.card,
    borderTopLeftRadius: RADII.lg,
    borderTopRightRadius: RADII.lg,
    maxHeight: 300,
    paddingBottom: SPACING.xxl,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: RADII.xs,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  optionRow: {
    height: 48,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  optionText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.text.primary,
  },
  optionTextSelected: {
    fontWeight: FONT_WEIGHT.semibold,
  },
});
