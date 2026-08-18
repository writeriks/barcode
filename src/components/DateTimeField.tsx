import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';

interface Props {
  label: string;
  placeholder: string;
  value: Date | null;
  onChange: (date: Date) => void;
  required?: boolean;
  /** Whether this field's picker is expanded. Owned by the form so that
   *  opening one date field collapses the other — two calendars unfurled
   *  at once is a scrolling puzzle, and it isn't how Calendar behaves. */
  isOpen: boolean;
  onToggle: () => void;
}

function combineDateAndTime(date: Date, time: Date): Date {
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
}

function formatDateTime(date: Date, locale: string): string {
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * A date + time field.
 *
 * Android has its own native calendar/clock dialogs (DateTimePickerAndroid),
 * so tapping just opens those back to back. iOS's equivalent isn't a dialog
 * at all — it's a plain view you place yourself — so there the picker
 * unfolds directly beneath the field, the way Calendar's own event editor
 * does it.
 *
 * It used to unfold inside a BottomSheet, which stopped working once the
 * generator form became a sheet itself: iOS drops one of two modals
 * presented over each other. Inline has no modal to lose, and it also
 * removes the Done button that the sheet needed — a pick applies as it is
 * made, so there is nothing left to confirm.
 */
export function DateTimeField({ label, placeholder, value, onChange, required, isOpen, onToggle }: Props) {
  const { i18n } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // What the pickers show before anything has been chosen. Held in a ref so
  // it can't drift between renders and make the calendar jump under a
  // finger that hasn't picked anything yet.
  const fallback = useRef(new Date()).current;
  const current = value ?? fallback;

  const handlePress = () => {
    if (Platform.OS !== 'android') {
      onToggle();
      return;
    }
    const initial = value ?? new Date();
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'date',
      onChange: (_dateEvent, pickedDate) => {
        if (!pickedDate) return;
        DateTimePickerAndroid.open({
          value: initial,
          mode: 'time',
          onChange: (_timeEvent, pickedTime) => {
            if (!pickedTime) return;
            onChange(combineDateAndTime(pickedDate, pickedTime));
          },
        });
      },
    });
  };

  const expanded = isOpen && Platform.OS === 'ios';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable
        style={[styles.field, expanded && styles.fieldExpanded]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={[styles.fieldText, !value && styles.placeholderText]} numberOfLines={1}>
          {value ? formatDateTime(value, i18n.language) : placeholder}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'calendar-outline'}
          size={16}
          color={expanded ? colors.mint : colors.text}
          style={styles.icon}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.picker}>
          <DateTimePicker
            mode="date"
            display="inline"
            value={current}
            themeVariant={mode}
            onChange={(_event, date) => date && onChange(combineDateAndTime(date, current))}
            style={styles.calendar}
          />
          <View style={styles.divider} />
          <DateTimePicker
            mode="time"
            display="spinner"
            value={current}
            themeVariant={mode}
            onChange={(_event, date) => date && onChange(combineDateAndTime(current, date))}
            style={styles.timeSpinner}
          />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 6,
    },
    label: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.65,
    },
    required: {
      color: colors.coralText,
      opacity: 1,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    fieldExpanded: {
      borderColor: colors.mint,
    },
    fieldText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },
    placeholderText: {
      opacity: 0.4,
    },
    icon: {
      opacity: 0.55,
      marginLeft: 8,
    },
    picker: {
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    calendar: {
      alignSelf: 'center',
      width: '100%',
    },
    divider: {
      height: 1,
      backgroundColor: colors.panelLine,
      marginHorizontal: 10,
    },
    timeSpinner: {
      alignSelf: 'center',
    },
  });
}
