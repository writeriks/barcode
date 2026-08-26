// Regenerates the app icon and everything derived from it.
//
//   node scripts/generateAppIcon.mjs
//
// The icon itself is artwork, not code: assets/icon-source.png is the
// original and this script does not draw it. What it does is derive the
// pieces the stores want in other shapes — the iOS icon at 1024 with no
// alpha channel, the two Android adaptive layers on transparency, the web
// favicon — so that replacing the artwork is one file swap and one command
// rather than five images edited by hand.
//
// The mark is a QR code with its top-right corner replaced by barcode
// bars — the two things the app reads, in one shape. It is deliberately
// not scannable: a finder pattern is structural, and losing one is what
// makes this a logo rather than a QR nobody meant to publish. Four
// punch-pink corner brackets sit around it as a scanner viewfinder — the
// same frame the camera uses.
//
// Needs Python's Pillow and numpy (to cut the artwork off its background)
// and cairosvg (to rasterise the favicon). None is a dependency of the app.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Mirrors src/theme/colors.ts. */
const MINT = '#2fe6b8';
const PUNCH = '#ff3e7f';
const BACKGROUND = '#231a3a';

const SOURCE = 'assets/icon-source.png';

function python(...lines) {
  execFileSync('python3', ['-c', lines.filter(Boolean).join('\n')], { stdio: ['ignore', 'inherit', 'inherit'] });
}

/**
 * The iOS icon: the artwork at 1024, flattened.
 *
 * App Store Connect rejects an icon that carries an alpha channel, even a
 * fully opaque one, so the mode conversion is not cosmetic.
 */
function buildIosIcon(out, size) {
  python(
    'from PIL import Image',
    `im = Image.open(${JSON.stringify(SOURCE)}).convert('RGB')`,
    `im = im.resize((${size}, ${size}), Image.LANCZOS)`,
    `im.save(${JSON.stringify(out)})`
  );
}

/**
 * The Android layers: the same artwork, cut off its background.
 *
 * An adaptive icon is a foreground floating over a separately drawn
 * background, so the purple has to come away and take the glow with it —
 * which is why this measures how far each pixel has travelled from the
 * background colour rather than thresholding brightness. Brightness alone
 * would keep the mint and lose the punch pink, which is darker than it
 * looks (its luminance is barely half the mint's).
 *
 * What is left is then unblended: a glow pixel is the mark's colour mixed
 * into the background, so dividing the mix back out recovers the colour
 * and lets the alpha channel carry the falloff. Without that the glow
 * turns muddy over any background but the original.
 *
 * The launcher crops an adaptive icon to roughly its middle two thirds and
 * may round it to a circle, so the artwork is cropped to what it actually
 * draws and re-placed smaller than it sat in the square.
 */
function buildAndroidLayer(out, size, { colour = null, scale }) {
  python(
    'from PIL import Image',
    'import numpy as np',
    `im = Image.open(${JSON.stringify(SOURCE)}).convert('RGB')`,
    'a = np.asarray(im).astype(np.float32)',
    // Measured from the artwork rather than written down here, because the
    // artwork is the thing that changes. The mark never reaches the edges,
    // so a band around them is background by definition; the near-top of
    // that band is the lightest the background gets anywhere, which is the
    // level everything else has to clear.
    'edge = np.concatenate([a[:24].reshape(-1, 3), a[-24:].reshape(-1, 3), a[:, :24].reshape(-1, 3), a[:, -24:].reshape(-1, 3)])',
    'bg = np.percentile(edge, 99.0, axis=0)',
    'lift = (a - bg).max(axis=2)',
    // Fully opaque well before the mark reaches full strength, so the marks
    // stay solid and only the glow around them fades.
    'alpha = np.clip((lift - 10.0) / 110.0, 0.0, 1.0)',
    'safe = np.maximum(alpha, 1e-6)[..., None]',
    'colour_out = np.clip((a - (1.0 - safe) * bg) / safe, 0.0, 255.0)',
    colour
      ? // The monochrome layer is a stencil: the system paints it itself,
        // so only the alpha channel carries any information.
        `colour_out = np.zeros_like(colour_out) + np.array([${[1, 3, 5]
          .map((i) => parseInt(colour.slice(i, i + 2), 16))
          .join(', ')}], dtype=np.float32)`
      : '',
    'rgba = np.dstack([colour_out, alpha * 255.0]).astype(np.uint8)',
    "cut = Image.fromarray(rgba, 'RGBA')",
    // Crop to what the artwork actually draws, glow included, so the
    // margins in the source file do not decide the size on screen.
    'ys, xs = np.nonzero(alpha > 0.02)',
    'cut = cut.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))',
    `span = int(${size} * ${scale})`,
    'ratio = min(span / cut.width, span / cut.height)',
    'cut = cut.resize((max(1, round(cut.width * ratio)), max(1, round(cut.height * ratio))), Image.LANCZOS)',
    `canvas = Image.new('RGBA', (${size}, ${size}), (0, 0, 0, 0))`,
    `canvas.paste(cut, ((${size} - cut.width) // 2, (${size} - cut.height) // 2), cut)`,
    `canvas.save(${JSON.stringify(out)})`
  );
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

/** Cairo draws the SVG without a browser — headless Chrome, the historical
 *  renderer here, waits indefinitely on screenshot in this environment. */
function buildFavicon(out, size) {
  const work = mkdtempSync(join(tmpdir(), 'blippo-icon-'));
  const svgPath = join(work, 'favicon.svg');
  const shot = join(work, 'favicon.png');
  writeFileSync(svgPath, faviconSvg(512));
  python(
    'import cairosvg',
    `cairosvg.svg2png(url=${JSON.stringify(svgPath)}, write_to=${JSON.stringify(shot)}, output_width=512, output_height=512)`
  );
  python(
    'from PIL import Image',
    `Image.open(${JSON.stringify(shot)}).resize((${size}, ${size}), Image.LANCZOS).convert('RGB').save(${JSON.stringify(out)})`
  );
}

buildIosIcon('assets/icon.png', 1024);
console.log('assets/icon.png — 1024x1024');

// 0.62 keeps the frame's corners inside the circle a launcher may mask the
// icon to, which cuts at about two thirds of the layer.
buildAndroidLayer('assets/android-icon-foreground.png', 512, { scale: 0.62 });
console.log('assets/android-icon-foreground.png — 512x512');

buildAndroidLayer('assets/android-icon-monochrome.png', 432, { colour: '#ffffff', scale: 0.62 });
console.log('assets/android-icon-monochrome.png — 432x432');

// The background layer is one flat colour; there is nothing to draw.
python(
  'from PIL import Image',
  `Image.new('RGBA', (512, 512), (0x23, 0x1a, 0x3a, 255)).save('assets/android-icon-background.png')`
);
console.log('assets/android-icon-background.png — 512x512');

buildFavicon('assets/favicon.png', 48);
console.log('assets/favicon.png — 48x48');
