/** The paper a QR code is drawn on, in both themes — `colors.cream`. Every
 * contrast figure below is against this, because this is what the dark
 * modules actually sit on. */
const PAPER: RGB = [0xff, 0xf6, 0xe9];

/**
 * How much darker than the paper a code's colour has to be.
 *
 * A reader needs the dark modules to be clearly darker than the light
 * ones; the usual floor quoted for print is around 3:1 and comfortable is
 * higher. 5:1 is comfortable while still leaving every hue a colour worth
 * choosing — at 6:1 the blues go almost black.
 */
const MIN_CONTRAST = 5;

/** Fully saturated colours read as "chosen a colour" rather than "tinted
 * the black"; this is high enough to feel deliberate without going neon. */
const SATURATION = 0.72;

type RGB = [number, number, number];

function toLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]: RGB): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(a: RGB, b: RGB): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function hslToRgb(hue: number, saturation: number, lightness: number): RGB {
  const chroma = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return lightness - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)].map((v) => Math.round(v * 255)) as RGB;
}

function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The colour a hue becomes when a QR code is drawn in it.
 *
 * The slider gives away the hue and nothing else: lightness is whatever
 * that hue needs to stay readable on cream paper, found by darkening until
 * it clears MIN_CONTRAST. So the user picks freely and cannot produce a
 * code that won't scan — which is why there is no warning to show them.
 *
 * The honest consequence is that yellow arrives as olive. A yellow dark
 * enough to scan *is* olive; the alternative is a pretty code that no
 * camera can read.
 */
export function hueToQrColor(hue: number): string {
  let readable = 0.05;
  let tooLight = 0.55;
  // Twelve halvings put lightness within 0.0002 of the boundary, far finer
  // than 8-bit channels can express.
  for (let step = 0; step < 12; step += 1) {
    const middle = (readable + tooLight) / 2;
    if (contrastRatio(hslToRgb(hue, SATURATION, middle), PAPER) >= MIN_CONTRAST) readable = middle;
    else tooLight = middle;
  }
  return toHex(hslToRgb(hue, SATURATION, readable));
}

/** Where a saved colour sits on the slider. Saved codes keep their hex, so
 * this is how the slider finds its position again when one is reopened. */
export function qrColorToHue(hex: string): number {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) return 0;
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const span = max - min;
  if (span === 0) return 0;
  let hue: number;
  if (max === r) hue = ((g - b) / span) % 6;
  else if (max === g) hue = (b - r) / span + 2;
  else hue = (r - g) / span + 4;
  return (Math.round(hue * 60) + 360) % 360;
}

/** The default a code is drawn in when nothing has been chosen — the same
 * near-black ink the app has always used. */
export const DEFAULT_QR_COLOR = '#241933';
