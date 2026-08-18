// Regenerates src/utils/brandLogos.ts from the simple-icons package.
//
// Run after adding a branded QR type:
//   node scripts/generateBrandLogos.mjs
//
// simple-icons is a devDependency and never ships: this pulls out the
// handful of marks the app draws and writes them as plain path data, so
// the app carries about two kilobytes instead of three thousand icons.
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

const entries = [];
const missing = [];

for (const [type, slug] of Object.entries(BRANDS)) {
  const icon = icons[key(slug)];
  if (!icon) {
    missing.push(`${type} (${slug})`);
    continue;
  }
  entries.push(
    `  ${type}: {\n    path: '${icon.path}',\n    color: '#${icon.hex}',\n  },`
  );
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

export interface BrandLogo {
  /** A path on the 24×24 grid every simple-icon is drawn to. */
  path: string;
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

console.log(`Wrote ${entries.length} brand marks.`);
if (missing.length > 0) {
  console.log(`No mark available for: ${missing.join(', ')}`);
}
