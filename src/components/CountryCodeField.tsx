import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { COUNTRY_CALLING_CODES, type CountryCallingCode } from '../utils/countryCallingCodes';
import { BottomSheet, useSheetStep } from './BottomSheet';

interface Props {
  label: string;
  value: CountryCallingCode | null;
  onChange: (country: CountryCallingCode) => void;
}

/** The searchable list itself, kept separate so its search text lives in
 * its own state — the sheet re-renders around it and this survives. */
function CountryList({
  selected,
  onSelect,
}: {
  selected: CountryCallingCode | null;
  onSelect: (country: CountryCallingCode) => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return COUNTRY_CALLING_CODES;
    return COUNTRY_CALLING_CODES.filter(
      (country) => country.name.toLowerCase().includes(trimmed) || country.dialCode.includes(trimmed)
    );
  }, [query]);

  return (
    <>
      <TextInput
        style={styles.search}
        placeholder={t('myCodes.searchCountryPlaceholder')}
        placeholderTextColor={placeholderColor}
        value={query}
        onChangeText={setQuery}
        autoFocus
      />
      <FlatList
        data={filtered}
        keyExtractor={(country) => country.iso2}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isSelected = item.iso2 === selected?.iso2;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={styles.rowName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.rowDialCode, isSelected && styles.rowDialCodeSelected]}>{item.dialCode}</Text>
            </Pressable>
          );
        }}
      />
    </>
  );
}

/**
 * A labeled field that opens a searchable list of E.164 calling codes —
 * used by the Phone/SMS generator forms, next to the number input.
 *
 * Two hundred countries and a search box are too much to unfold inside a
 * form, which is why this is the one picker here that still takes over a
 * whole surface. Inside a sheet it takes over *that* sheet for a step
 * rather than opening a second one on top of it; only when there is no
 * sheet to borrow does it present one of its own.
 */
export function CountryCodeField({ label, value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sheetStep = useSheetStep();
  const [isOwnSheetOpen, setIsOwnSheetOpen] = useState(false);

  const handleOpen = () => {
    if (!sheetStep) {
      setIsOwnSheetOpen(true);
      return;
    }
    // `value` and `onChange` are captured as they are now, which is safe:
    // the form is behind the step and can't be edited while it shows.
    sheetStep.open({
      title: t('myCodes.countryCodeLabel'),
      render: () => (
        <CountryList
          selected={value}
          onSelect={(country) => {
            onChange(country);
            sheetStep.close();
          }}
        />
      ),
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={handleOpen}>
        <Text style={styles.fieldText}>{value ? value.dialCode : t('myCodes.countryCodePlaceholder')}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.text} style={styles.chevron} />
      </Pressable>

      <BottomSheet
        visible={isOwnSheetOpen}
        onClose={() => setIsOwnSheetOpen(false)}
        title={t('myCodes.countryCodeLabel')}
      >
        <CountryList
          selected={value}
          onSelect={(country) => {
            onChange(country);
            setIsOwnSheetOpen(false);
          }}
        />
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
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minWidth: 88,
    },
    fieldText: {
      color: colors.text,
      fontSize: 14,
    },
    chevron: {
      opacity: 0.55,
      marginLeft: 6,
    },
    search: {
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
      marginBottom: 10,
    },
    list: {
      maxHeight: 380,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 13,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.panelLine,
    },
    rowPressed: {
      opacity: 0.6,
    },
    rowName: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    rowDialCode: {
      fontFamily: fonts.mono,
      fontSize: 13,
      color: colors.text,
      opacity: 0.6,
    },
    rowDialCodeSelected: {
      color: colors.mintText,
      opacity: 1,
    },
  });
}
