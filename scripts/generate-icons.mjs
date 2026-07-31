/**
 * Rasterise the PWA icon set from public/icons/*.svg.
 *
 * Run with `npm run icons` after editing either SVG. The generated PNGs are
 * committed, so this is a maintenance tool rather than a build step.
 *
 * sharp is deliberately NOT a devDependency. It ships platform-specific native
 * binaries, and having it in the tree once produced a lockfile that installed
 * on Windows but not on Linux CI — which broke a deploy for a tool that runs
 * roughly never. Install it on demand instead:
 *
 *     npx --yes -p sharp node scripts/generate-icons.mjs
 *
 * Two sources:
 *   icon.svg           full-bleed, used for the browser tab, install prompt
 *                      and the iOS home screen.
 *   icon-maskable.svg  artwork inset to the safe zone, so Android launchers
 *                      can crop it to a circle/squircle without clipping.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.error(
    'sharp is not installed. It is kept out of devDependencies on purpose —\n' +
      'see the note at the top of this file. Run:\n\n' +
      '  npx --yes -p sharp node scripts/generate-icons.mjs\n',
  );
  process.exit(1);
}

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
