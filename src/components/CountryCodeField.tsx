import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { COUNTRY_CALLING_CODES, type CountryCallingCode } from '../utils/countryCallingCodes';
import { localizedCountryName } from '../utils/countryNames';

/** Tall enough for a few countries either side of the selected one. */
const WHEEL_HEIGHT = 190;

interface FieldProps {
  label: string;
  value: CountryCallingCode | null;
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
}

/**
 * The compact button half of the country picker — a dial code and a
 * chevron, narrow enough to sit beside a phone number.
 *
 * The wheel it opens is a separate component on purpose. This button
 * lives in a row next to the number field, which leaves it about 88
 * points wide; a search box and a list of ninety countries rendered
 * inside that column were squeezed down to one letter per row. The form
 * places CountryCodePanel below the whole row instead, where it has the
 * full width.
 */
export function CountryCodeField({ label, value, isOpen, onToggle, onClear }: FieldProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.field, isOpen && styles.fieldExpanded]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={styles.fieldText}>{value ? value.dialCode : t('myCodes.countryCodePlaceholder')}</Text>
        {value ? (
          <Pressable onPress={onClear} hitSlop={10} accessibilityLabel={t('a11y.clearSearch')}>
            <Ionicons name="close-circle" size={15} color={colors.text} style={styles.clear} />
          </Pressable>
        ) : (
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={isOpen ? colors.mint : colors.text}
            style={styles.chevron}
          />
        )}
      </Pressable>
    </View>
  );
}

interface PanelProps {
  value: CountryCallingCode | null;
  onChange: (country: CountryCallingCode) => void;
}

/**
 * The searchable wheel, placed by the form at full width.
 *
 * A wheel rather than a list because ninety countries need their own
 * scrolling, and a scrolling list nested in the sheet's ScrollView fights
 * it for every drag. `Picker` renders a native UIPickerView on iOS — the
 * same kind of component as the time spinner next door — so the gesture is
 * resolved natively, at a fixed height that never pushes the form around.
 *
 * The search box narrows what the wheel holds rather than replacing it,
 * since flicking past ninety entries is its own kind of tedious.
 */
export function CountryCodePanel({ value, onChange }: PanelProps) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';
  const [query, setQuery] = useState('');
  const language = i18n.language;

  // Named and ordered in the reader's own language: a Turkish list that
  // says "Germany" between "Georgia" and "Ghana" is sorted for someone
  // else. `name` keeps the English original, which search also matches so
  // that typing "Germany" still finds Almanya.
  const countries = useMemo(
    () =>
      COUNTRY_CALLING_CODES.map((country) => ({
        ...country,
        displayName: localizedCountryName(country.iso2, language, country.name),
      })).sort((a, b) => a.displayName.localeCompare(b.displayName, language)),
    [language]
  );

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return countries;
    return countries.filter(
      (country) =>
        country.displayName.toLowerCase().includes(trimmed) ||
        country.name.toLowerCase().includes(trimmed) ||
        country.dialCode.includes(trimmed)
    );
  }, [countries, query]);

  // A wheel's whole promise is that the row in the middle is the chosen
  // one. Searching used to break that: the results narrowed, the wheel
  // showed Türkiye, and the field above still said +48 because nothing had
  // been scrolled. Selecting the top result keeps the promise.
  useEffect(() => {
    const top = filtered[0];
    if (!top) return;
    if (filtered.some((country) => country.iso2 === value?.iso2)) return;
    onChange(top);
    // Only when the visible results change — `onChange` is rebuilt every
    // render by the forms that own this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const handleSelect = (iso2: string) => {
    const country = COUNTRY_CALLING_CODES.find((candidate) => candidate.iso2 === iso2);
    if (country) onChange(country);
  };

  return (
    <View style={styles.panel}>
      <TextInput
        style={styles.search}
        placeholder={t('myCodes.searchCountryPlaceholder')}
        placeholderTextColor={placeholderColor}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      {filtered.length > 0 ? (
        <Picker
          selectedValue={value?.iso2}
          onValueChange={handleSelect}
          // iOS-only styling; on Android the same component is a dropdown
          // opening the system list, which is that platform's convention
          // and needs none of this.
          itemStyle={styles.wheelItem}
          selectionColor={colors.panelLine}
          dropdownIconColor={colors.text}
          style={styles.wheel}
        >
          {filtered.map((country) => (
            <Picker.Item
              key={country.iso2}
              label={`${country.displayName}  ${country.dialCode}`}
              value={country.iso2}
              color={colors.text}
            />
          ))}
        </Picker>
      ) : (
        <Text style={styles.empty}>{t('history.noResults')}</Text>
      )}
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
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minWidth: 92,
    },
    fieldExpanded: {
      borderColor: colors.mint,
    },
    fieldText: {
      color: colors.text,
      fontSize: 14,
    },
    chevron: {
      opacity: 0.55,
      marginLeft: 6,
    },
    clear: {
      opacity: 0.5,
      marginLeft: 6,
    },
    panel: {
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      padding: 10,
      gap: 8,
    },
    search: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 14,
    },
    wheel: {
      height: WHEEL_HEIGHT,
    },
    wheelItem: {
      fontSize: 17,
      height: WHEEL_HEIGHT / 3,
      color: colors.text,
    },
    empty: {
      fontSize: 13,
      color: colors.text,
      opacity: 0.6,
      textAlign: 'center',
      paddingVertical: 24,
    },
  });
}
