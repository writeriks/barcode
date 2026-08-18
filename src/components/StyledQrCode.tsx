import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { buildQrMatrix } from '../utils/qrMatrix';
import { DEFAULT_QR_COLOR } from '../utils/qrColor';

export interface QrSvgRef {
  toDataURL: (callback: (base64: string) => void) => void;
}

interface Props {
  value: string;
  /** Side length in points, of the paper — not of the code inside it. */
  size: number;
  /** The colour of the dark modules. Always dark enough to scan; see
   *  utils/qrColor.ts, which is the only thing that should produce one. */
  color?: string;
  /** A short line under the code, on the same paper. */
  caption?: string;
  /** Drawn over the middle of the code. Ignored unless the content fitted
   *  at level 'H' — see the note on the constant below. */
  logoPath?: string;
  logoColor?: string;
  getRef?: (ref: QrSvgRef | null) => void;
}

/** How much of the code's width the logo plate takes. A QR at level 'H'
 * can lose about 30% of itself and still be rebuilt; a fifth leaves room
 * for the reader to have a bad angle as well. */
const LOGO_FRACTION = 0.2;

/** The margin every reader needs to find the code's edges. Measured in
 * modules, which is how the spec defines it — four is the minimum. */
const QUIET_MODULES = 4;

/** Caption height, as a share of the paper's width. */
const CAPTION_BAND = 0.16;

/**
 * Every QR code the app draws, as one SVG.
 *
 * One element, not a code with things layered over it, because the shared
 * PNG is captured from this element: anything drawn outside it — a caption
 * in a React Native `<Text>`, a logo in an `<Image>` — would be on screen
 * and missing from the file. Composing inside the SVG is what keeps the
 * preview and the export the same picture.
 *
 * Content too long to encode at any level draws a placeholder instead.
 * That is close to unreachable — saving rejects such content — but a saved
 * code from before that guard existed would otherwise take the screen down
 * with it.
 */
export function StyledQrCode({ value, size, color, caption, logoPath, logoColor, getRef }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const matrix = useMemo(() => buildQrMatrix(value), [value]);
  const trimmedCaption = caption?.trim();

  if (!matrix) {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}>
        <Ionicons name="alert-circle-outline" size={size * 0.18} color={colors.coralText} />
        <Text style={styles.fallbackText}>{t('qr.tooLongToRender')}</Text>
      </View>
    );
  }

  // Everything is laid out in module units so the SVG scales to any size
  // without a second set of numbers to keep in step.
  const codeSpan = matrix.size + QUIET_MODULES * 2;
  const captionSpan = trimmedCaption ? codeSpan * CAPTION_BAND : 0;
  const height = size * ((codeSpan + captionSpan) / codeSpan);

  const logoSpan = matrix.size * LOGO_FRACTION;
  const plateSpan = logoSpan * 1.28;
  const centre = codeSpan / 2;

  // A logo covers modules the code has to rebuild from its error
  // correction, and only 'H' carries enough of it. Long content drops to a
  // weaker level, and there the logo has to go — a code that looks right
  // and doesn't scan is worse than one without a logo.
  const showLogo = Boolean(logoPath) && matrix.level === 'H';

  return (
    <Svg
      width={size}
      height={height}
      viewBox={`0 0 ${codeSpan} ${codeSpan + captionSpan}`}
      ref={getRef as never}
    >
      <Rect x={0} y={0} width={codeSpan} height={codeSpan + captionSpan} fill={colors.cream} />
      <Path
        d={matrix.path}
        transform={`translate(${QUIET_MODULES} ${QUIET_MODULES})`}
        fill={color ?? DEFAULT_QR_COLOR}
      />

      {showLogo ? (
        <>
          {/* The plate is the paper colour rather than white so it
              disappears into the code's background instead of sitting on
              it as a second surface. */}
          <Rect
            x={centre - plateSpan / 2}
            y={centre - plateSpan / 2}
            width={plateSpan}
            height={plateSpan}
            rx={plateSpan * 0.22}
            fill={colors.cream}
          />
          <Path
            d={logoPath}
            fill={logoColor ?? color ?? DEFAULT_QR_COLOR}
            // Brand marks are drawn on a 24-unit grid; scale that onto the
            // plate and move it to the middle of the code.
            transform={`translate(${centre - logoSpan / 2} ${centre - logoSpan / 2}) scale(${logoSpan / 24})`}
          />
        </>
      ) : null}

      {trimmedCaption ? (
        <SvgText
          x={centre}
          y={codeSpan + captionSpan * 0.68}
          fontSize={captionSpan * 0.62}
          fontFamily={fonts.displayBold}
          fill={colors.inkOnCream}
          textAnchor="middle"
        >
          {trimmedCaption}
        </SvgText>
      ) : null}
    </Svg>
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
      backgroundColor: colors.cream,
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
