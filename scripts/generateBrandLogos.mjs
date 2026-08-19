// Regenerates src/utils/brandLogos.ts from the simple-icons package.
//
// Run after adding a branded QR type:
//   node scripts/generateBrandLogos.mjs
//
// simple-icons is a devDependency and never ships: this pulls out the
// handful of marks the app draws and writes them as plain path data, so
// the app carries a few kilobytes instead of three thousand icons.
//
// The path data is CC0. The marks themselves are the brands' trademarks,
// used here only to label a code that points at that brand's own service.
import * as icons from 'simple-icons';
import { writeFileSync } from 'node:fs';

/** QR content type → simple-icons slug. Types absent from this map draw
 *  no logo, which is the right answer for anything without a brand. */
const BRANDS = {
  facebook: 'facebook',
  instagram: 'instagram',
  twitter: 'x',
  spotify: 'spotify',
  viber: 'viber',
  paypal: 'paypal',
  tiktok: 'tiktok',
  youtube: 'youtube',
  telegram: 'telegram',
  pinterest: 'pinterest',
  whatsapp: 'whatsapp',
  appstore: 'appstore',
  drive: 'googledrive',
  dropbox: 'dropbox',
  zoom: 'zoom',
};

const key = (slug) => `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
const iconFor = (slug) => icons[key(slug)];

/**
 * Drive's six-piece geometry — the whole point of this mark, since it is
 * three colours meeting at two folds and a single-colour silhouette of it
 * is just a triangle. On Drive's own 87.3×80 box; the transform below maps
 * that onto the 24 grid everything else uses.
 *
 * Reproduced rather than taken from a file: it was written out here and
 * then checked by rendering it against the real logo, not downloaded from
 * Google. It draws correctly — wrong path data would be visibly wrong
 * rather than subtly off — but nobody has diffed it against the official
 * asset. Replace it with that asset if exactness ever matters.
 */
const DRIVE_PARTS = [
  ['#0066da', 'm6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z'],
  ['#00ac47', 'm43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z'],
  ['#ea4335', 'm73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z'],
  ['#00832d', 'm43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z'],
  ['#2684fc', 'm59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z'],
  ['#ffba00', 'm73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z'],
];
const DRIVE_SCALE = 24 / 87.3;
const DRIVE_TRANSFORM = `translate(0 ${((24 - 80 * DRIVE_SCALE) / 2).toFixed(3)}) scale(${DRIVE_SCALE.toFixed(5)})`;

/** A rounded square filling the 24 grid, for marks that are an app icon
 *  rather than a glyph. 5.4 is Apple's corner radius at this size. */
const SQUIRCLE =
  'M5.4 0H18.6A5.4 5.4 0 0 1 24 5.4V18.6A5.4 5.4 0 0 1 18.6 24H5.4A5.4 5.4 0 0 1 0 18.6V5.4A5.4 5.4 0 0 1 5.4 0Z';

/**
 * The marks whose real form isn't one shape in one colour.
 *
 * Everything else in BRANDS is genuinely monochrome — WhatsApp, Spotify,
 * Dropbox and the rest are one colour by their own design, and drawing
 * them from simple-icons in the brand's own hex is already the real mark.
 * These five are the ones where that loses something.
 *
 * PayPal is deliberately absent. Its mark is two tones, but the two P's
 * are a single merged outline in the source art, and the seam between them
 * doesn't fall on a straight line — every way of splitting it cuts the
 * front P's stem in half, which reads as a rendering fault rather than a
 * logo. The official monochrome navy is the better of the two wrongs. Drop
 * a real two-path PayPal in here and it will just work.
 */
const OVERRIDES = {
  // Three colours, offset — the fringe is the logo.
  tiktok: (path) => ({
    parts: [
      { d: path, fill: '#25F4EE', transform: 'translate(-0.9 -0.5)' },
      { d: path, fill: '#FE2C55', transform: 'translate(0.9 0.5)' },
      { d: path, fill: '#000000' },
    ],
  }),
  // The same simple-icons glyph, filled with a gradient instead of a flat
  // colour. The stops are the widely-used approximation of Instagram's
  // gradient, not a specification of it.
  instagram: (path) => ({
    parts: [{ d: path, fill: 'gradient' }],
    gradient: {
      x1: 0,
      y1: 1,
      x2: 1,
      y2: 0,
      stops: [
        [0, '#FEDA75'],
        [0.25, '#FA7E1E'],
        [0.5, '#D62976'],
        [0.75, '#962FBF'],
        [1, '#4F5BD5'],
      ],
    },
  }),
  // simple-icons draws the "A" alone; the App Store's mark is that "A"
  // reversed out of the blue tile, and the tile is most of what people
  // recognise. The tile, its corner radius and the two gradient stops were
  // all set by eye against the real icon.
  appstore: (path) => ({
    parts: [
      { d: SQUIRCLE, fill: 'gradient' },
      { d: path, fill: '#FFFFFF', transform: 'translate(12 12) scale(0.6) translate(-12 -12)' },
    ],
    gradient: { x1: 0, y1: 0, x2: 0, y2: 1, stops: [[0, '#17C9FB'], [1, '#1A74E8']] },
  }),
  drive: () => ({
    parts: DRIVE_PARTS.map(([fill, d]) => ({ d, fill })),
    transform: DRIVE_TRANSFORM,
  }),
};

const quote = (value) => `'${value}'`;

function renderPart({ d, fill, transform }) {
  const fields = [`d: ${quote(d)}`, `fill: ${quote(fill)}`];
  if (transform) fields.push(`transform: ${quote(transform)}`);
  return `      { ${fields.join(', ')} },`;
}

function renderGradient({ x1, y1, x2, y2, stops }) {
  const rendered = stops.map(([offset, color]) => `{ offset: ${offset}, color: ${quote(color)} }`);
  return (
    `    gradient: {\n      x1: ${x1},\n      y1: ${y1},\n      x2: ${x2},\n      y2: ${y2},\n` +
    `      stops: [${rendered.join(', ')}],\n    },`
  );
}

const entries = [];
const missing = [];

for (const [type, slug] of Object.entries(BRANDS)) {
  const icon = iconFor(slug);
  if (!icon) {
    missing.push(`${type} (${slug})`);
    continue;
  }
  const override = OVERRIDES[type]?.(icon.path);
  const mark = override ?? { parts: [{ d: icon.path, fill: `#${icon.hex}` }] };

  const lines = [`  ${type}: {`, '    parts: ['];
  lines.push(...mark.parts.map(renderPart));
  lines.push('    ],');
  if (mark.transform) lines.push(`    transform: ${quote(mark.transform)},`);
  if (mark.gradient) lines.push(renderGradient(mark.gradient));
  lines.push(`    color: '#${icon.hex}',`, '  },');
  entries.push(lines.join('\n'));
}

writeFileSync(
  'src/utils/brandLogos.ts',
  `// Generated file — do not edit by hand.
//
// The brand marks drawn in the middle of a generated QR code, taken from
// the simple-icons package at build time so the app doesn't ship three
// thousand icons to use fifteen.
//
// Path data is CC0; the marks are the brands' own trademarks, drawn here
// only on a code that points at that brand's service.
//
// Regenerate with:
//   node scripts/generateBrandLogos.mjs
import type { QrContentType } from './classifyQrContent';

/** One filled shape of a mark. Drawn on a 24×24 grid, like every
 *  simple-icon, unless the mark carries a transform of its own. */
export interface BrandLogoPart {
  d: string;
  /** A hex colour, or the literal 'gradient' for the mark's own. */
  fill: string;
  transform?: string;
}

/** Left as coordinates rather than an angle because that is what
 *  react-native-svg's LinearGradient takes; 0–1 across the shape's box. */
export interface BrandLogoGradient {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: { offset: number; color: string }[];
}

export interface BrandLogo {
  parts: BrandLogoPart[];
  /** Applied to the whole mark, for art drawn on a box other than 24×24. */
  transform?: string;
  gradient?: BrandLogoGradient;
  /** The brand's own colour, used as the code's colour by default. */
  color: string;
}

const BRAND_LOGOS: Partial<Record<QrContentType, BrandLogo>> = {
${entries.join('\n')}
};

/** The mark for a content type, or null for types that have no brand —
 * and for brands with no mark we can source. */
export function brandLogoFor(type: QrContentType): BrandLogo | null {
  return BRAND_LOGOS[type] ?? null;
}
`
);

const coloured = entries.filter((entry) => entry.split('d:').length > 2 || entry.includes('gradient:')).length;
console.log(`Wrote ${entries.length} brand marks, ${coloured} of them multi-colour.`);
if (missing.length > 0) {
  console.log(`No mark available for: ${missing.join(', ')}`);
}
