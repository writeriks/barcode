import QRCode from 'qrcode';
import { bestErrorCorrectionLevel } from './qrCapacity';

export interface QrMatrix {
  /** Modules per side, including the code's own finder patterns. */
  size: number;
  /** One SVG path covering every dark module, in a coordinate space where
   *  a module is exactly 1×1. Scale it by setting the viewBox. */
  path: string;
  /** The level the content actually fitted into — 'H' for nearly
   *  everything, lower for payloads too big for it. A logo is only safe
   *  at 'H'; see StyledQrCode. */
  level: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Builds the drawing instructions for a QR code.
 *
 * Owned here rather than taken from a component library because the app
 * draws the code, its logo, and its caption into a *single* SVG: that's
 * what makes the shared PNG identical to the on-screen preview, since both
 * come out of the same element. A library that renders its own SVG root
 * can't have anything composed into it.
 *
 * Returns null when the content can't be encoded at any level — the
 * caller shows a placeholder rather than an empty box.
 */
export function buildQrMatrix(value: string): QrMatrix | null {
  const level = bestErrorCorrectionLevel(value);
  if (!level) return null;

  const created = QRCode.create(value, { errorCorrectionLevel: level });
  const size = created.modules.size;
  const data = created.modules.data;

  // One `M…h1v1h-1z` per dark module. Runs of adjacent modules could be
  // merged into wider rectangles, but the path is built once per value and
  // handed straight to the renderer, so the shorter string isn't worth the
  // extra pass.
  let path = '';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y * size + x]) path += `M${x} ${y}h1v1h-1z`;
    }
  }

  return { size, path, level };
}
