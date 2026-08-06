import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { captureAnalyticsEvent } from '../services/analytics';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  barcode: string;
  /** Positioning is left to the caller (e.g. alignSelf) since it differs
   * between a left-aligned result screen and a centered mascot screen. */
  style?: StyleProp<ViewStyle>;
}

/** Tappable barcode chip — copies the raw digits to the clipboard. Shared
 * between FoundProductScreen and MissingProductScreen so both scan
 * outcomes get the same affordance. */
export function CopyableBarcode({ barcode, style }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(barcode);
    captureAnalyticsEvent('barcode_copied');
    Alert.alert(t('qr.copied'));
  };

  return (
    <Pressable
      onPress={handleCopy}
      style={({ pressed }) => [styles.chip, style, pressed && styles.chipPressed]}
      hitSlop={6}
    >
      <Text style={styles.text}>{barcode}</Text>
      <Ionicons name="copy-outline" size={13} color={colors.text} style={styles.icon} />
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipPressed: {
      opacity: 0.7,
    },
    text: {
      fontFamily: fonts.mono,
      fontSize: 13,
      letterSpacing: 1,
      color: colors.text,
    },
    icon: {
      opacity: 0.6,
    },
  });
}
