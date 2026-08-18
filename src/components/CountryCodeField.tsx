import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { COUNTRY_CALLING_CODES, type CountryCallingCode } from '../utils/countryCallingCodes';

interface Props {
  label: string;
  value: CountryCallingCode | null;
  onChange: (country: CountryCallingCode) => void;
}

// Tall enough to show a few countries either side of the selected one,
// short enough to leave the form around it visible.
const WHEEL_HEIGHT = 180;

/**
 * A labeled field that unfolds a wheel of E.164 calling codes, with a
 * search box above it — used by the Phone/SMS generator forms, next to
 * the number input.
 *
 * The wheel is what makes this fit inside a form at all. Ninety-one
 * countries need their own scrolling, and a scrolling list nested in the
 * sheet's own ScrollView fights it for every drag. `Picker` renders a
 * native UIPickerView on iOS — the same kind of component as the time
 * spinner next door — so the gesture is resolved natively and the two
 * scrollers coexist, at a fixed height that never pushes the form around.
 *
 * A wheel alone would still mean flicking past ninety entries, hence the
 * search box: it narrows what the wheel holds rather than replacing it.
 *
 * The field is only ever opened by someone whose country isn't already
 * right — the device's region is filled in from the start.
 */
export function CountryCodeField({ label, value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return COUNTRY_CALLING_CODES;
    return COUNTRY_CALLING_CODES.filter(
      (country) => country.name.toLowerCase().includes(trimmed) || country.dialCode.includes(trimmed)
    );
  }, [query]);

  const handleSelect = (iso2: string) => {
    const country = COUNTRY_CALLING_CODES.find((candidate) => candidate.iso2 === iso2);
    if (country) onChange(country);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.field, isOpen && styles.fieldExpanded]}
        onPress={() => setIsOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
      >
        <Text style={styles.fieldText}>{value ? value.dialCode : t('myCodes.countryCodePlaceholder')}</Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={isOpen ? colors.mint : colors.text}
          style={styles.chevron}
        />
      </Pressable>

      {isOpen ? (
        <View style={styles.picker}>
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
              // iOS-only styling props; on Android the same component is a
              // dropdown that opens the system list, which is the platform's
              // own convention there and needs none of this.
              itemStyle={[styles.wheelItem, Platform.OS === 'ios' && { height: WHEEL_HEIGHT / 3 }]}
              selectionColor={colors.panelLine}
              dropdownIconColor={colors.text}
              style={styles.wheel}
            >
              {filtered.map((country) => (
                <Picker.Item
                  key={country.iso2}
                  label={`${country.name}  ${country.dialCode}`}
                  value={country.iso2}
                  color={colors.text}
                />
              ))}
            </Picker>
          ) : (
            <Text style={styles.empty}>{t('history.noResults')}</Text>
          )}
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
      minWidth: 88,
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
    picker: {
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      padding: 10,
      gap: 6,
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
      fontSize: 16,
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
