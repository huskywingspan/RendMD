/**
 * Rasterise the PWA icon set from public/icons/*.svg.
 *
 * Run with `npm run icons` after editing either SVG. The PNGs are committed
 * because the build must not depend on sharp being installable — it ships
 * native binaries, and a CI runner that can't fetch them shouldn't take the
 * deploy down with it.
 *
 * Two sources:
 *   icon.svg           full-bleed, used for the browser tab, install prompt
 *                      and the iOS home screen.
 *   icon-maskable.svg  artwork inset to the safe zone, so Android launchers
 *                      can crop it to a circle/squircle without clipping.
 */
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const iconsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const TARGETS = [
  { source: 'icon.svg', size: 192, out: 'icon-192.png' },
  { source: 'icon.svg', size: 512, out: 'icon-512.png' },
  // Apple ignores the manifest and reads apple-touch-icon at 180x180.
  { source: 'icon.svg', size: 180, out: 'icon-180.png' },
  { source: 'icon-maskable.svg', size: 192, out: 'icon-maskable-192.png' },
  { source: 'icon-maskable.svg', size: 512, out: 'icon-maskable-512.png' },
];

const sources = new Map();

for (const { source, size, out } of TARGETS) {
  if (!sources.has(source)) {
    sources.set(source, await readFile(join(iconsDir, source)));
  }

  await sharp(sources.get(source), { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(iconsDir, out));

  console.log(`  ${out.padEnd(24)} ${size}x${size}`);
}

console.log(`\nWrote ${TARGETS.length} icons to public/icons/`);
