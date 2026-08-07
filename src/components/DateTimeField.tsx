import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { BottomSheet } from './BottomSheet';
import { PillButton } from './PillButton';

interface Props {
  label: string;
  placeholder: string;
  value: Date | null;
  onChange: (date: Date) => void;
  required?: boolean;
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
 * A date + time field. Android has its own native calendar/clock dialogs
 * (DateTimePickerAndroid), so tapping just opens those back to back. iOS's
 * equivalent isn't a standalone dialog — it's a plain view you place
 * yourself — so there it's shown inline inside our own BottomSheet: an
 * actual calendar grid for the date, a scroll wheel for the hour/minute,
 * and a Done button to commit both at once.
 */
export function DateTimeField({ label, placeholder, value, onChange, required }: Props) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isOpen, setIsOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(() => value ?? new Date());
  const [draftTime, setDraftTime] = useState(() => value ?? new Date());

  const openPicker = () => {
    const initial = value ?? new Date();

    if (Platform.OS === 'android') {
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
      return;
    }

    setDraftDate(initial);
    setDraftTime(initial);
    setIsOpen(true);
  };

  const handleDone = () => {
    onChange(combineDateAndTime(draftDate, draftTime));
    setIsOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Pressable style={styles.field} onPress={openPicker}>
        <Text style={[styles.fieldText, !value && styles.placeholderText]} numberOfLines={1}>
          {value ? formatDateTime(value, i18n.language) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={16} color={colors.text} style={styles.icon} />
      </Pressable>

      {Platform.OS === 'ios' ? (
        <BottomSheet visible={isOpen} onClose={() => setIsOpen(false)} title={label}>
          <View style={styles.pickerWrap}>
            <DateTimePicker
              mode="date"
              display="inline"
              value={draftDate}
              themeVariant={mode}
              onChange={(_event, date) => date && setDraftDate(date)}
              style={styles.calendar}
            />
          </View>
          <DateTimePicker
            mode="time"
            display="spinner"
            value={draftTime}
            themeVariant={mode}
            onChange={(_event, date) => date && setDraftTime(date)}
            style={styles.timeSpinner}
          />
          <PillButton title={t('myCodes.done')} onPress={handleDone} variant="citrus" />
        </BottomSheet>
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
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
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
    pickerWrap: {
      width: '100%',
      alignItems: 'center',
    },
    calendar: {
      alignSelf: 'center',
      width: '100%',
    },
    timeSpinner: {
      alignSelf: 'center',
      marginTop: 4,
    },
  });
}
