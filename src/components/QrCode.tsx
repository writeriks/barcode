import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import BaseQRCode from 'react-native-qrcode-svg';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { bestErrorCorrectionLevel } from '../utils/qrCapacity';

interface Props {
  value: string;
  size: number;
  color: string;
  backgroundColor: string;
  quietZone?: number;
  getRef?: (ref: { toDataURL: (callback: (base64: string) => void) => void } | null) => void;
}

/**
 * Every QR the app draws goes through here, for two reasons.
 *
 * The first is that react-native-qrcode-svg builds its matrix *during
 * render* and rethrows whatever the encoder throws unless an `onError`
 * handler is passed. Content too big for a QR code therefore doesn't
 * render an empty box — it takes down the screen that drew it, and a
 * saved code that can't be drawn would take that screen down on every
 * visit. Choosing the error correction level from the content's size
 * means we never hand the encoder something it can't build, and the
 * `onError` below is the backstop for whatever that arithmetic misses.
 *
 * The second is the level itself. 'H' is what leaves room to put a logo
 * over the middle of a code, so it's what we want everywhere — but it
 * also holds the least data, so a long scanned payload steps down to
 * whichever level still fits rather than refusing to draw.
 */
export function QrCode({ value, size, color, backgroundColor, quietZone, getRef }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const level = bestErrorCorrectionLevel(value);

  if (!level) {
    return (
      <View style={[styles.fallback, { width: size, height: size, backgroundColor }]}>
        <Ionicons name="alert-circle-outline" size={size * 0.18} color={colors.coralText} />
        <Text style={styles.fallbackText}>{t('qr.tooLongToRender')}</Text>
      </View>
    );
  }

  return (
    <BaseQRCode
      value={value}
      size={size}
      ecl={level}
      quietZone={quietZone}
      color={color}
      backgroundColor={backgroundColor}
      getRef={getRef}
      // Never reached while `level` is chosen from the content's own size,
      // but passing a handler at all is what stops the library rethrowing
      // out of render — with one, an unbuildable code draws nothing.
      onError={() => undefined}
    />
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    fallback: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      gap: 8,
      padding: 16,
    },
    fallbackText: {
      fontFamily: fonts.displayBold,
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
      color: colors.inkOnCream,
      opacity: 0.7,
    },
  });
}
