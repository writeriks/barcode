import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}

/**
 * Past this many options the choices stop fitting across the width as
 * equal segments, and become a row you scroll instead.
 *
 * Two, not three, because the widest label decides: splitting the sheet
 * three ways leaves about 90pt of text per segment, and Wi-Fi's "no
 * encryption" is "Keine Verschlüsselung" in German — roughly 150pt. As a
 * row, each option is as wide as its own label instead.
 */
const SEGMENT_LIMIT = 2;

/**
 * A small, fixed choice, shown in full rather than hidden behind a picker.
 *
 * This used to open a BottomSheet. That was already a tap too many for
 * three options — and once the generator form itself became a sheet, it
 * meant presenting a modal from inside a modal, which iOS handles by
 * silently dropping one of them. Rendering the options in place removes
 * both problems at once, and a Wi-Fi security type you can read without
 * tapping is simply better than one you can't.
 *
 * The one choice with too many options to show this way is the country
 * calling code; see CountryCodeField.
 */
export function SelectField<T extends string>({ label, value, options, onChange }: Props<T>) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const asSegments = options.length <= SEGMENT_LIMIT;

  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          styles.chip,
          asSegments && styles.chipSegment,
          selected && styles.chipSelected,
          pressed && styles.chipPressed,
        ]}
      >
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={1}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {asSegments ? (
        <View style={styles.segmentRow}>{chips}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.scrollRow}
          contentContainerStyle={styles.scrollContent}
        >
          {chips}
        </ScrollView>
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
    segmentRow: {
      flexDirection: 'row',
      gap: 8,
    },
    scrollRow: {
      flexGrow: 0,
      // Cancels the form's own padding so the row can run to both edges,
      // which is what makes it read as scrollable rather than clipped.
      marginHorizontal: -20,
    },
    scrollContent: {
      gap: 8,
      paddingHorizontal: 20,
    },
    chip: {
      // Matches the app's other form controls: the cabinet colour, because
      // these sit on a panel-coloured sheet and would vanish otherwise.
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipSegment: {
      flex: 1,
      paddingHorizontal: 8,
    },
    chipSelected: {
      backgroundColor: colors.mint,
      borderColor: colors.mint,
    },
    chipPressed: {
      opacity: 0.75,
    },
    chipLabel: {
      fontSize: 14,
      color: colors.text,
    },
    chipLabelSelected: {
      fontFamily: fonts.displayBold,
      color: colors.inkOnCream,
    },
  });
}
