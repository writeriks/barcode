import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { BottomSheet } from './BottomSheet';

export type ShareFormat = 'image' | 'pdf';

// Long enough for this sheet to be gone before the system share sheet is
// presented. Presenting one native modal while another is dismissing
// races them, and the second one loses — the same fix as everywhere else
// a sheet hands off to something native.
const DISMISS_MS = 300;

interface Props {
  visible: boolean;
  /** How many pages are being shared, for the subtitles. */
  pageCount: number;
  onClose: () => void;
  onSelect: (format: ShareFormat) => void;
}

/**
 * Asks how a document should leave the app: as its pages, or as one PDF.
 *
 * These used to be two buttons sitting next to each other, which framed a
 * file format as a second way to share. It's a property of the share, so
 * it's asked once the share has been asked for.
 */
export function ShareFormatSheet({ visible, pageCount, onClose, onSelect }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const choose = (format: ShareFormat) => {
    onClose();
    setTimeout(() => onSelect(format), DISMISS_MS);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('document.shareFormatTitle')}>
      <View style={styles.list}>
        <Option
          icon="images-outline"
          tint={colors.mintText}
          title={t('document.shareAsImages')}
          body={t('document.shareAsImagesBody', { count: pageCount })}
          onPress={() => choose('image')}
          styles={styles}
        />
        <Option
          icon="document-outline"
          tint={colors.citrusText}
          title={t('document.shareAsPdf')}
          body={t('document.shareAsPdfBody', { count: pageCount })}
          onPress={() => choose('pdf')}
          styles={styles}
        />
      </View>
    </BottomSheet>
  );
}

type Styles = ReturnType<typeof createStyles>;

function Option({
  icon,
  tint,
  title,
  body,
  onPress,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  body: string;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.iconBadge, { borderColor: tint }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    list: {
      gap: 10,
      paddingBottom: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowPressed: {
      opacity: 0.75,
    },
    iconBadge: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 15,
      color: colors.text,
    },
    rowBody: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.6,
      marginTop: 2,
    },
  });
}
