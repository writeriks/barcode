// Regenerates the app icon and everything derived from it.
//
//   node scripts/generateAppIcon.mjs
//
// Writes assets/icon.png, the three Android adaptive-icon layers and the
// web favicon, all from the same mark and from the app's own colours, so
// a change to the palette is one edit here rather than five files redrawn
// by hand.
//
// The mark is a QR code with its top-right finder pattern replaced by
// barcode bars — the two things the app reads, in one shape. It is
// deliberately not a scannable code: a finder pattern is structural, and
// removing one is what makes this a logo rather than a QR nobody meant to
// publish. Four punch-pink corner brackets sit around it as a scanner
// viewfinder — the same frame the camera uses.
//
// Needs Python's cairosvg (to rasterise) and Pillow (to resize). Neither
// is a dependency of the app.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import QRCode from 'qrcode';

/** Mirrors src/theme/colors.ts. */
const MINT = '#2fe6b8';
const PUNCH = '#ff3e7f';
const BACKGROUND = '#231a3a';

const qr = QRCode.create('https://blippo.app', { errorCorrectionLevel: 'H' });
const SIZE = qr.modules.size;
const isDark = (x, y) => qr.modules.data[y * SIZE + x] === 1;

/** The top-right finder pattern and its separator, plus a row beneath, so
 *  the bars sit above a clean band rather than straight on the code. */
const ZONE = { x0: SIZE - 8, y0: 0, x1: SIZE - 1, y1: 8 };
const inZone = (x, y) => x >= ZONE.x0 && x <= ZONE.x1 && y >= ZONE.y0 && y <= ZONE.y1;

/** Widths and lengths vary the way a real barcode's do; an even comb reads
 *  as a hatch pattern instead. */
const BARS = [
  { x: 0.2, width: 0.6, height: 7.0 },
  { x: 1.35, width: 0.6, height: 6.55 },
  { x: 2.5, width: 0.6, height: 7.0 },
  { x: 3.65, width: 1.25, height: 6.55 },
  { x: 5.4, width: 0.6, height: 7.0 },
  { x: 6.55, width: 1.25, height: 6.55 },
];

function markGroup(size, colour, inset) {
  let cells = '';
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // A hair over one unit so neighbouring modules meet without a seam.
      if (isDark(x, y) && !inZone(x, y)) cells += `<rect x="${x}" y="${y}" width="1.03" height="1.03"/>`;
    }
  }
  let bars = '';
  for (const bar of BARS) {
    const x = (ZONE.x0 + bar.x).toFixed(2);
    bars += `<rect x="${x}" y="0.20" width="${bar.width}" height="${bar.height}" rx="${(bar.width / 2).toFixed(3)}"/>`;
  }
  const span = size * (1 - inset * 2);
  return `<g fill="${colour}" shape-rendering="crispEdges" transform="translate(${size * inset} ${size * inset}) scale(${span / SIZE})">
    ${cells}${bars}
  </g>`;
}

/** Four L-shaped corners — a camera viewfinder around the mark. */
function frameGroup(size, colour, { pad, arm, stroke }) {
  const p = (size * pad).toFixed(2);
  const a = (size * arm).toFixed(2);
  const w = (size * stroke).toFixed(2);
  const far = (size * (1 - pad)).toFixed(2);
  const pPlus = (size * pad + size * arm).toFixed(2);
  const farMinus = (size * (1 - pad) - size * arm).toFixed(2);
  const paths = [
    `M ${pPlus} ${p} H ${p} V ${pPlus}`,
    `M ${farMinus} ${p} H ${far} V ${pPlus}`,
    `M ${p} ${farMinus} V ${far} H ${pPlus}`,
    `M ${far} ${farMinus} V ${far} H ${farMinus}`,
  ];
  return `<g fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">
    ${paths.map((d) => `<path d="${d}"/>`).join('')}
  </g>`;
}

function glowFilter(id, blur) {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="blur"/>
    <feMerge>
      <feMergeNode in="blur"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>`;
}

function iconSvg(size, { background, markColour, frameColour, markInset, frame, glow }) {
  const defs = glow
    ? `<defs>${glowFilter('markGlow', size * 0.006)}${glowFilter('frameGlow', size * 0.012)}</defs>`
    : '';
  const mark = `<g ${glow ? 'filter="url(#markGlow)"' : ''}>${markGroup(size, markColour, markInset)}</g>`;
  const frameLayer = frame
    ? `<g ${glow ? 'filter="url(#frameGlow)"' : ''}>${frameGroup(size, frameColour, frame)}</g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${defs}
  ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
  ${mark}
  ${frameLayer}
</svg>`;
}

/**
 * The favicon is not the icon shrunk.
 *
 * Twenty-nine modules across forty-eight pixels is under a pixel and a
 * half each, which resolves to a smudge. So it keeps the two ideas the
 * mark is made of — a finder pattern and the bars — at a size where both
 * survive, plus the four corner ticks so it still reads as a scanner.
 */
function faviconSvg(size) {
  const unit = size / 16;
  const bar = (x, width) =>
    `<rect x="${(x * unit).toFixed(2)}" y="${(3 * unit).toFixed(2)}" width="${(width * unit).toFixed(2)}" height="${(10 * unit).toFixed(2)}" rx="${((width * unit) / 2).toFixed(2)}"/>`;
  const tick = (d) => `<path d="${d}" fill="none" stroke="${PUNCH}" stroke-width="${0.9 * unit}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const p = 1.1 * unit;
  const a = 2.4 * unit;
  const far = size - p;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BACKGROUND}"/>
  <g fill="${MINT}">
    <path d="M${3 * unit} ${3 * unit}h${6 * unit}v${6 * unit}h${-6 * unit}z" fill="none" stroke="${MINT}" stroke-width="${1.5 * unit}"/>
    <rect x="${5.25 * unit}" y="${5.25 * unit}" width="${1.5 * unit}" height="${1.5 * unit}"/>
    ${bar(10.6, 1)}${bar(12.4, 1.6)}
  </g>
  ${tick(`M ${p + a} ${p} H ${p} V ${p + a}`)}
  ${tick(`M ${far - a} ${p} H ${far} V ${p + a}`)}
  ${tick(`M ${p} ${far - a} V ${far} H ${p + a}`)}
  ${tick(`M ${far} ${far - a} V ${far} H ${far - a}`)}
</svg>`;
}

const work = mkdtempSync(join(tmpdir(), 'blippo-icon-'));

/** Rasterise SVG with cairosvg. Chromium is the historical renderer, but
 *  headless Chrome in this environment waits indefinitely on screenshot;
 *  Cairo draws the same SVG without a browser. */
function rasterise(name, svg, size) {
  const svgPath = join(work, `${name}.svg`);
  const shot = join(work, `${name}.png`);
  writeFileSync(svgPath, svg);
  execFileSync('python3', [
    '-c',
    [
      'import cairosvg',
      `cairosvg.svg2png(url=${JSON.stringify(svgPath)}, write_to=${JSON.stringify(shot)}, output_width=${size}, output_height=${size})`,
    ].join('\n'),
  ]);
  return { shot };
}

/** Resize and, for the iOS icon, drop the alpha channel — App Store
 *  Connect rejects an icon that has one, even a fully opaque one. */
function finish(shot, out, size, { flatten = false } = {}) {
  execFileSync('python3', [
    '-c',
    [
      'from PIL import Image',
      `im = Image.open(${JSON.stringify(shot)})`,
      `im = im.resize((${size}, ${size}), Image.LANCZOS)`,
      flatten ? "im = im.convert('RGB')" : '',
      `im.save(${JSON.stringify(out)})`,
    ]
      .filter(Boolean)
      .join('\n'),
  ]);
}

const iosFrame = { pad: 0.1, arm: 0.155, stroke: 0.03 };
const androidFrame = { pad: 0.2, arm: 0.135, stroke: 0.034 };

const jobs = [
  {
    out: 'assets/icon.png',
    size: 1024,
    svg: iconSvg(1024, {
      background: BACKGROUND,
      markColour: MINT,
      frameColour: PUNCH,
      markInset: 0.2,
      frame: iosFrame,
      glow: true,
    }),
    flatten: true,
  },
  {
    // Adaptive icons are cropped to roughly the middle two thirds, so the
    // foreground sits further in than the iOS icon does.
    out: 'assets/android-icon-foreground.png',
    size: 512,
    svg: iconSvg(512, {
      background: null,
      markColour: MINT,
      frameColour: PUNCH,
      markInset: 0.28,
      frame: androidFrame,
      glow: true,
    }),
    transparent: true,
  },
  {
    out: 'assets/android-icon-monochrome.png',
    size: 432,
    svg: iconSvg(432, {
      background: null,
      markColour: '#ffffff',
      frameColour: '#ffffff',
      markInset: 0.28,
      frame: androidFrame,
      glow: false,
    }),
    transparent: true,
  },
  { out: 'assets/favicon.png', size: 48, svg: faviconSvg(512), flatten: true },
];

for (const job of jobs) {
  const renderSize = Math.max(job.size, 512);
  const { shot } = rasterise(job.out.replace(/\W/g, '_'), job.svg, renderSize);
  finish(shot, job.out, job.size, { flatten: job.flatten });
  console.log(`${job.out} — ${job.size}x${job.size}`);
}

// The background layer is one flat colour; there is nothing to draw.
execFileSync('python3', [
  '-c',
  `from PIL import Image\nImage.new('RGBA', (512, 512), (0x23, 0x1a, 0x3a, 255)).save('assets/android-icon-background.png')`,
]);
console.log('assets/android-icon-background.png — 512x512');
