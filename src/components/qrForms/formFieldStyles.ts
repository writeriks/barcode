import { StyleSheet } from 'react-native';
import type { ColorTheme } from '../../theme/colors';

/** Shared field chrome for every My Codes generator form — label above a
 * bordered input, reused instead of restating the same StyleSheet in each
 * of the ten type-specific form components. */
export function createFieldStyles(colors: ColorTheme) {
  return StyleSheet.create({
    field: {
      gap: 6,
    },
    flexField: {
      flex: 1,
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
    hint: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.5,
      marginTop: -6,
    },
    input: {
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
    },
    inputMultiline: {
      minHeight: 90,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 4,
    },
    checkboxLabel: {
      fontSize: 14,
      color: colors.text,
    },
  });
}
