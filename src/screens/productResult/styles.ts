import { StyleSheet } from 'react-native';
import type { ColorTheme } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export function createProductResultStyles(colors: ColorTheme) {
  return StyleSheet.create({
    productCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 14,
    },
    image: {
      width: 64,
      height: 64,
      borderRadius: 12,
    },
    productText: {
      flex: 1,
    },
    name: {
      fontFamily: fonts.displayBold,
      fontSize: 16,
      color: colors.text,
    },
    brand: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.6,
      marginTop: 2,
    },
    verdict: {
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.mintText,
      marginTop: 5,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 14,
    },
    scoreLabelWrap: {
      flex: 1,
    },
    scoreLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.text,
    },
    scoreSub: {
      fontSize: 12,
      color: colors.text,
      opacity: 0.55,
      marginTop: 2,
    },
    card: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 16,
      gap: 8,
    },
    sectionTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.text,
    },
    body: {
      fontSize: 13.5,
      lineHeight: 20,
      color: colors.text,
      opacity: 0.75,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.coralText,
      backgroundColor: 'rgba(255,90,90,0.12)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    chipText: {
      fontFamily: fonts.mono,
      fontSize: 10.5,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.coralText,
    },
    nutrimentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.panelLine,
      paddingBottom: 6,
    },
    amount: {
      fontFamily: fonts.mono,
      fontSize: 13,
      color: colors.text,
      opacity: 0.65,
    },
    attribution: {
      fontSize: 11,
      color: colors.text,
      opacity: 0.45,
      marginTop: 4,
    },
  });
}

export type ProductResultStyles = ReturnType<typeof createProductResultStyles>;
