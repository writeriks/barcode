// Regenerates the app icon and everything derived from it.
//
//   node scripts/generateAppIcon.mjs
//
// Writes assets/icon.png, the three Android adaptive-icon layers and the
// web favicon, all from the same mark and from the app's own two colours,
// so a change to the palette is one edit here rather than five files
// redrawn by hand.
//
// The mark is a QR code with its top-right finder pattern replaced by
// barcode bars — the two things the app reads, in one shape. It is
// deliberately not a scannable code: a finder pattern is structural, and
// removing one is what makes this a logo rather than a QR nobody meant to
// publish.
//
// Needs Chromium to rasterise and Python's Pillow to resize. Both are
// present in the dev container; neither is a dependency of the app.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import QRCode from 'qrcode';

/** Mirrors src/theme/colors.ts. */
const MINT = '#2fe6b8';
const BACKGROUND = '#231a3a';

const CHROME =
  process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/** Chromium refuses to open a window below roughly a hundred pixels and
 *  screenshots the corner of a larger page instead, which comes out as
 *  plain background. Anything smaller than this is rendered big and scaled
 *  down afterwards. */
const MIN_RENDER = 512;

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

function markSvg(size, { background, colour, inset }) {
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
  <g fill="${colour}" shape-rendering="crispEdges" transform="translate(${size * inset} ${size * inset}) scale(${span / SIZE})">
    ${cells}${bars}
  </g>
</svg>`;
}

/**
 * The favicon is not the icon shrunk.
 *
 * Twenty-nine modules across forty-eight pixels is under a pixel and a
 * half each, which resolves to a smudge. So it keeps the two ideas the
 * mark is made of — a finder pattern and the bars — at a size where both
 * survive.
 */
function faviconSvg(size) {
  const unit = size / 16;
  const bar = (x, width) =>
    `<rect x="${(x * unit).toFixed(2)}" y="${(3 * unit).toFixed(2)}" width="${(width * unit).toFixed(2)}" height="${(10 * unit).toFixed(2)}" rx="${((width * unit) / 2).toFixed(2)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BACKGROUND}"/>
  <g fill="${MINT}">
    <path d="M${3 * unit} ${3 * unit}h${6 * unit}v${6 * unit}h${-6 * unit}z" fill="none" stroke="${MINT}" stroke-width="${1.5 * unit}"/>
    <rect x="${5.25 * unit}" y="${5.25 * unit}" width="${1.5 * unit}" height="${1.5 * unit}"/>
    ${bar(10.6, 1)}${bar(12.4, 1.6)}
  </g>
</svg>`;
}

const work = mkdtempSync(join(tmpdir(), 'blippo-icon-'));

function rasterise(name, svg, size, { transparent = false } = {}) {
  const renderAt = Math.max(size, MIN_RENDER);
  const page = join(work, `${name}.html`);
  const shot = join(work, `${name}.png`);
  writeFileSync(
    page,
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:${
      transparent ? 'transparent' : BACKGROUND
    }}</style>${svg.replace(/width="\d+" height="\d+"/, `width="${renderAt}" height="${renderAt}"`)}`
  );
  execFileSync(CHROME, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${renderAt},${renderAt}`,
    ...(transparent ? ['--default-background-color=00000000'] : []),
    `--screenshot=${shot}`,
    `file://${page}`,
    // Chromium in a container has no session bus and says so, at length,
    // for every launch. None of it bears on the screenshot.
  ], { stdio: 'ignore' });
  return { shot, renderAt };
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

const jobs = [
  {
    out: 'assets/icon.png',
    size: 1024,
    svg: markSvg(1024, { background: BACKGROUND, colour: MINT, inset: 0.165 }),
    flatten: true,
  },
  {
    // Adaptive icons are cropped to roughly the middle two thirds, so the
    // foreground sits further in than the iOS icon does.
    out: 'assets/android-icon-foreground.png',
    size: 512,
    svg: markSvg(512, { background: null, colour: MINT, inset: 0.26 }),
    transparent: true,
  },
  {
    out: 'assets/android-icon-monochrome.png',
    size: 432,
    svg: markSvg(432, { background: null, colour: '#ffffff', inset: 0.26 }),
    transparent: true,
  },
  { out: 'assets/favicon.png', size: 48, svg: faviconSvg(512), flatten: true },
];

for (const job of jobs) {
  const { shot } = rasterise(job.out.replace(/\W/g, '_'), job.svg, job.size, {
    transparent: job.transparent,
  });
  finish(shot, job.out, job.size, { flatten: job.flatten });
  console.log(`${job.out} — ${job.size}x${job.size}`);
}

// The background layer is one flat colour; there is nothing to draw.
execFileSync('python3', [
  '-c',
  `from PIL import Image\nImage.new('RGBA', (512, 512), (0x23, 0x1a, 0x3a, 255)).save('assets/android-icon-background.png')`,
]);
console.log('assets/android-icon-background.png — 512x512');
