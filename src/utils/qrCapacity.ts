/** The four error correction levels a QR symbol can carry, weakest first.
 * Higher levels survive more damage — and leave room to cover part of the
 * code with a logo — but hold less data in the same symbol. */
export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/** Byte-mode capacity of the largest QR symbol there is (version 40) at
 * each error correction level, per ISO/IEC 18004. Nothing can encode more
 * than the first number here, whatever the level. */
const VERSION_40_BYTE_CAPACITY: Record<QrErrorCorrectionLevel, number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273,
};

/** Levels from the most redundant down, which is the order we want to try
 * them in — take the sturdiest code the content still fits into. */
const LEVELS_STRONGEST_FIRST: QrErrorCorrectionLevel[] = ['H', 'Q', 'M', 'L'];

/** UTF-8 byte length, which is what a QR actually encodes — `String.length`
 * counts UTF-16 units and undercounts every emoji and most non-Latin text.
 * `for...of` walks code points, so a surrogate pair is counted once. */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

/**
 * The strongest error correction this content still fits into, or `null`
 * when it doesn't fit in a QR code at all.
 *
 * Encoding is the one place this app can hand a user input straight to a
 * library that throws: react-native-qrcode-svg builds its matrix during
 * render, so an over-capacity value would throw *while rendering* and take
 * the screen down with it. Asking this first means we only ever render
 * codes we know can be built.
 *
 * Content is measured as bytes even when it's all digits or uppercase
 * letters, which QR can pack more tightly — a deliberate underestimate,
 * since the alternative is guessing at the encoder's mode selection.
 */
export function bestErrorCorrectionLevel(value: string): QrErrorCorrectionLevel | null {
  const bytes = utf8ByteLength(value);
  return LEVELS_STRONGEST_FIRST.find((level) => bytes <= VERSION_40_BYTE_CAPACITY[level]) ?? null;
}

/** Whether this content can be turned into a QR code at all. */
export function isQrEncodable(value: string): boolean {
  return value.length > 0 && bestErrorCorrectionLevel(value) !== null;
}

/** The most a QR code can hold, for telling someone how far over they are. */
export const QR_MAX_CONTENT_BYTES = VERSION_40_BYTE_CAPACITY.L;
