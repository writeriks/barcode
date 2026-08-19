// Regenerates src/utils/brandLogos.ts from two icon packages.
//
// Run after adding a branded QR type:
//   node scripts/generateBrandLogos.mjs
//
// Both packages are devDependencies and neither ships: this pulls out the
// handful of marks the app draws and writes them as plain path data, so
// the app carries a few kilobytes instead of five thousand icons.
//
// @iconify-json/logos is gilbarbara's SVG Logos — full-colour marks, the
// real ones, several paths and a gradient where the brand has one. It is
// the source for everything it covers. simple-icons fills the gaps, in a
// single colour, and supplies the brand's documented hex either way.
//
// Both sets are CC0. The marks themselves are the brands' trademarks, used
// here only to label a code that points at that brand's own service.
import logoSet from '@iconify-json/logos/icons.json' with { type: 'json' };
import * as simpleIcons from 'simple-icons';
import { writeFileSync } from 'node:fs';

/**
 * QR content type → where its mark comes from.
 *
 * `logos` names an icon in the full-colour set; the `-icon` variants are
 * the square glyphs, since the wordmarks are four times wider than they
 * are tall and would come out as a stripe in the middle of a code.
 * `simple` is the monochrome fallback for brands that set doesn't carry.
 *
 * Every entry also names a simple-icons slug, because that package is
 * where the brand's own hex comes from, and that colour is what a code
 * carrying the mark is tinted with.
 */
const BRANDS = {
  facebook: { simple: 'facebook', logos: 'facebook' },
  instagram: { simple: 'instagram', logos: 'instagram-icon', gradient: 'instagram' },
  twitter: { simple: 'x', logos: 'x' },
  spotify: { simple: 'spotify', logos: 'spotify-icon' },
  // Not in the colour set. Viber's mark is one purple anyway, so the
  // monochrome glyph is the real thing rather than a stand-in for it.
  viber: { simple: 'viber' },
  paypal: { simple: 'paypal', logos: 'paypal' },
  tiktok: { simple: 'tiktok', logos: 'tiktok-icon' },
  youtube: { simple: 'youtube', logos: 'youtube-icon' },
  telegram: { simple: 'telegram', logos: 'telegram' },
  pinterest: { simple: 'pinterest', logos: 'pinterest' },
  whatsapp: { simple: 'whatsapp', logos: 'whatsapp-icon' },
  appstore: { simple: 'appstore', logos: 'apple-app-store' },
  drive: { simple: 'googledrive', logos: 'google-drive' },
  dropbox: { simple: 'dropbox', logos: 'dropbox' },
  zoom: { simple: 'zoom', logos: 'zoom-icon' },
};

/**
 * The one mark the colour set has only in monochrome.
 *
 * Instagram's glyph outline is sourced like all the others; these stops
 * are not. They are the widely-used approximation of Instagram's gradient
 * rather than a published specification of it, and they are here because a
 * flat near-black Instagram glyph looks like a mistake.
 */
const GRADIENT_OVERRIDES = {
  instagram: {
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
};

const simpleIconFor = (slug) => simpleIcons[`si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`];

/** '50%' → 0.5, '0.5' → 0.5. Gradients in this set are all in the default
 *  objectBoundingBox units, so everything lands in 0–1 either way. */
function ratio(value, attribute) {
  const text = String(value).trim();
  const number = Number(text.endsWith('%') ? Number(text.slice(0, -1)) / 100 : text);
  if (!Number.isFinite(number)) throw new Error(`Unreadable ${attribute}: ${value}`);
  return Number(number.toFixed(4));
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? match[1] : null;
}

/**
 * Turns one iconify body into parts and gradients on the 24 grid.
 *
 * Deliberately strict rather than best-effort. It understands exactly what
 * these fifteen icons are made of — paths, and linear gradients declared
 * in a defs block — and throws on anything else, because the failure mode
 * of a lenient parser here is a logo that silently draws wrong.
 */
function normalize(type, name) {
  const icon = logoSet.icons[name];
  if (!icon) throw new Error(`${type}: no icon named "${name}" in @iconify-json/logos`);
  const width = icon.width ?? logoSet.width;
  const height = icon.height ?? logoSet.height;
  let body = icon.body;

  const unsupported = body.match(/<(?!path|defs|\/defs|linearGradient|\/linearGradient|stop)[a-zA-Z]+/g);
  if (unsupported) throw new Error(`${type}: unsupported element(s) ${[...new Set(unsupported)].join(', ')}`);
  if (/gradientUnits=/.test(body)) throw new Error(`${type}: gradientUnits is not handled`);
  if (/gradientTransform=|transform=/.test(body)) throw new Error(`${type}: transforms are not handled`);

  // Gradients first, so the paths can be pointed at them by a local name.
  const gradients = [];
  const idAlias = new Map();
  const defs = body.match(/<defs>([\s\S]*?)<\/defs>/);
  if (defs) {
    const declarations = defs[1].match(/<linearGradient[\s\S]*?<\/linearGradient>/g) ?? [];
    for (const declaration of declarations) {
      const open = declaration.slice(0, declaration.indexOf('>') + 1);
      const sourceId = attribute(open, 'id');
      const alias = `${type}${gradients.length}`;
      idAlias.set(sourceId, alias);
      gradients.push({
        id: alias,
        x1: ratio(attribute(open, 'x1') ?? '0', 'x1'),
        y1: ratio(attribute(open, 'y1') ?? '0', 'y1'),
        x2: ratio(attribute(open, 'x2') ?? '1', 'x2'),
        y2: ratio(attribute(open, 'y2') ?? '0', 'y2'),
        stops: (declaration.match(/<stop[^>]*>/g) ?? []).map((stop) => [
          ratio(attribute(stop, 'offset') ?? '0', 'offset'),
          attribute(stop, 'stop-color') ?? '#000000',
        ]),
      });
    }
    body = body.replace(defs[0], '');
  }

  const parts = (body.match(/<path[^>]*>/g) ?? []).map((tag) => {
    const d = attribute(tag, 'd');
    if (!d) throw new Error(`${type}: a path with no d`);
    // No fill attribute means black, which is what SVG says and what the
    // X mark relies on.
    let fill = attribute(tag, 'fill') ?? '#000000';
    const reference = fill.match(/^url\(#(.+)\)$/);
    if (reference) {
      const alias = idAlias.get(reference[1]);
      if (!alias) throw new Error(`${type}: path points at unknown gradient ${reference[1]}`);
      fill = `@${alias}`;
    }
    return { d, fill };
  });
  if (parts.length === 0) throw new Error(`${type}: no paths`);

  // Fit the icon's own box inside the 24 grid without distorting it, and
  // centre what's left over.
  const scale = 24 / Math.max(width, height);
  const tx = (24 - width * scale) / 2;
  const ty = (24 - height * scale) / 2;
  const transform = `translate(${tx.toFixed(4)} ${ty.toFixed(4)}) scale(${scale.toFixed(6)})`;

  return { parts, gradients, transform };
}

const quote = (value) => `'${value}'`;

function render(type, mark, hex) {
  const lines = [`  ${type}: {`, '    parts: ['];
  for (const part of mark.parts) {
    lines.push(`      { d: ${quote(part.d)}, fill: ${quote(part.fill)} },`);
  }
  lines.push('    ],');
  if (mark.transform) lines.push(`    transform: ${quote(mark.transform)},`);
  if (mark.gradients.length > 0) {
    lines.push('    gradients: [');
    for (const gradient of mark.gradients) {
      const stops = gradient.stops.map(([offset, color]) => `{ offset: ${offset}, color: ${quote(color)} }`);
      lines.push(
        `      { id: ${quote(gradient.id)}, x1: ${gradient.x1}, y1: ${gradient.y1}, ` +
          `x2: ${gradient.x2}, y2: ${gradient.y2}, stops: [${stops.join(', ')}] },`
      );
    }
    lines.push('    ],');
  }
  lines.push(`    color: '#${hex}',`, '  },');
  return lines.join('\n');
}

const entries = [];
const summary = [];

for (const [type, source] of Object.entries(BRANDS)) {
  const icon = simpleIconFor(source.simple);
  if (!icon) throw new Error(`${type}: no simple-icons slug "${source.simple}"`);

  let mark;
  if (source.logos) {
    mark = normalize(type, source.logos);
    const override = GRADIENT_OVERRIDES[source.gradient];
    if (override) {
      // Recolour a monochrome glyph rather than trusting its flat fill.
      const alias = `${type}0`;
      mark.gradients = [{ id: alias, ...override }];
      mark.parts = mark.parts.map((part) => ({ ...part, fill: `@${alias}` }));
    }
    summary.push(
      `${type}: logos/${source.logos} — ${mark.parts.length} part(s)` +
        (mark.gradients.length ? `, ${mark.gradients.length} gradient(s)` : '') +
        (override ? ' (gradient approximated)' : '')
    );
  } else {
    mark = { parts: [{ d: icon.path, fill: `#${icon.hex}` }], gradients: [] };
    summary.push(`${type}: simple-icons/${source.simple} — monochrome`);
  }

  entries.push(render(type, mark, icon.hex));
}

writeFileSync(
  'src/utils/brandLogos.ts',
  `// Generated file — do not edit by hand.
//
// The brand marks drawn in the middle of a generated QR code. Taken at
// build time from @iconify-json/logos (gilbarbara's SVG Logos — the real,
// full-colour marks) with simple-icons filling the gaps and supplying each
// brand's documented hex, so the app ships a few kilobytes rather than
// five thousand icons.
//
// Both sets are CC0; the marks are the brands' own trademarks, drawn here
// only on a code that points at that brand's service.
//
// Regenerate with:
//   node scripts/generateBrandLogos.mjs
import type { QrContentType } from './classifyQrContent';

/** One filled shape of a mark, on the 24×24 grid the mark's transform maps
 *  its own artboard onto. */
export interface BrandLogoPart {
  d: string;
  /** A colour, or '@' followed by the id of one of the mark's gradients. */
  fill: string;
}

/** Coordinates rather than an angle because that is what
 *  react-native-svg's LinearGradient takes; 0–1 across the filled shape. */
export interface BrandLogoGradient {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: { offset: number; color: string }[];
}

export interface BrandLogo {
  parts: BrandLogoPart[];
  /** Maps the artwork's own box onto the 24 grid, centred and undistorted. */
  transform?: string;
  gradients?: BrandLogoGradient[];
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

console.log(summary.join('\n'));
console.log(`\nWrote ${entries.length} brand marks.`);
