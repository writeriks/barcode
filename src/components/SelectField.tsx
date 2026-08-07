import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { BottomSheet } from './BottomSheet';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  placeholder: string;
  value: T | null;
  options: SelectOption<T>[];
  sheetTitle: string;
  onChange: (value: T) => void;
}

/** A labeled field that opens a BottomSheet with a short, fixed list of
 * options — Wi-Fi's network type, Event's reminder, V-card's version. For
 * the one field with dozens of options (country calling codes), see
 * CountryCodeField instead, which adds search. */
export function SelectField<T extends string>({ label, placeholder, value, options, sheetTitle, onChange }: Props<T>) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? placeholder;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setIsOpen(true)}>
        <Text style={styles.fieldText} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.text} style={styles.chevron} />
      </Pressable>

      <BottomSheet visible={isOpen} onClose={() => setIsOpen(false)} title={sheetTitle}>
        <View style={styles.sheetList}>
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.rowLabel}>{option.label}</Text>
                {selected ? <Text style={styles.checkmark}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
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
    chevron: {
      opacity: 0.55,
      marginLeft: 6,
    },
    sheetList: {
      gap: 10,
      paddingBottom: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowPressed: {
      opacity: 0.75,
    },
    rowLabel: {
      fontSize: 15,
      color: colors.text,
    },
    checkmark: {
      fontSize: 16,
      color: colors.mint,
    },
  });
}
