import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Contrast regression guard.
 *
 * The token file is the single place colour is decided, so this parses it
 * directly and checks the pairs that actually appear as text on a background.
 * Adjusting a lightness value by eye is easy; noticing it dropped a label
 * under 4.5:1 is not.
 *
 * OKLCH is converted to sRGB here rather than measured in a browser so the
 * check runs in CI with no display.
 */

const TOKENS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../tokens.css');

/** WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text and UI boundaries. */
const AA_NORMAL = 4.5;
const AA_LARGE = 3;

type Tokens = Record<string, string>;

function parseTheme(css: string, selector: string): Tokens {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`No ${selector} block in tokens.css`);

  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);

  const tokens: Tokens = {};
  for (const [, name, value] of body.matchAll(/(--rmd-[\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim();
  }
  return tokens;
}

/** oklch(L C H) -> sRGB 0-255. Alpha forms are rejected: they need compositing. */
function oklchToRgb(value: string): [number, number, number] {
  const match = value.match(
    /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*\)/,
  );
  if (!match) throw new Error(`Not an opaque oklch colour: ${value}`);

  const lRaw = match[1];
  const L = lRaw.endsWith('%') ? Number.parseFloat(lRaw) / 100 : Number.parseFloat(lRaw);
  const C = Number.parseFloat(match[2]);
  const H = (Number.parseFloat(match[3]) * Math.PI) / 180;

  // Oklab -> LMS
  const a = C * Math.cos(H);
  const b = C * Math.sin(H);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  // LMS -> linear sRGB
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const encode = (channel: number): number => {
    const clamped = Math.max(0, Math.min(1, channel));
    const srgb = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(srgb * 255);
  };

  return [encode(lr), encode(lg), encode(lb)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [
    relativeLuminance(oklchToRgb(foreground)),
    relativeLuminance(oklchToRgb(background)),
  ].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const css = readFileSync(TOKENS_PATH, 'utf-8');
const themes = {
  dark: parseTheme(css, ':root.theme-dark'),
  light: parseTheme(css, ':root.theme-light'),
};

/** Every pair where one token is rendered as text over the other. */
const TEXT_PAIRS: [foreground: string, background: string, minimum: number][] = [
  // Body and chrome text.
  ['--rmd-ink', '--rmd-canvas', AA_NORMAL],
  ['--rmd-ink', '--rmd-surface', AA_NORMAL],
  ['--rmd-ink', '--rmd-overlay', AA_NORMAL],
  ['--rmd-ink-muted', '--rmd-canvas', AA_NORMAL],
  ['--rmd-ink-muted', '--rmd-surface', AA_NORMAL],
  ['--rmd-ink-muted', '--rmd-overlay', AA_NORMAL],
  // ink-faint carries the status bar and hints, at 11px — normal-text rules.
  ['--rmd-ink-faint', '--rmd-canvas', AA_NORMAL],
  ['--rmd-ink-faint', '--rmd-surface', AA_NORMAL],
  ['--rmd-ink-faint', '--rmd-sunken', AA_NORMAL],

  // Links, and text sitting on an accent fill.
  ['--rmd-accent', '--rmd-canvas', AA_NORMAL],
  ['--rmd-accent', '--rmd-surface', AA_NORMAL],
  ['--rmd-accent-ink', '--rmd-accent', AA_NORMAL],

  // Status colours, used for short labels.
  ['--rmd-success', '--rmd-canvas', AA_NORMAL],
  ['--rmd-success', '--rmd-surface', AA_NORMAL],
  ['--rmd-warning', '--rmd-canvas', AA_NORMAL],
  ['--rmd-warning', '--rmd-surface', AA_NORMAL],
  ['--rmd-danger', '--rmd-canvas', AA_NORMAL],
  ['--rmd-danger', '--rmd-surface', AA_NORMAL],

  // The focus ring must be distinguishable from what it surrounds.
  ['--rmd-accent', '--rmd-sunken', AA_LARGE],
];

describe.each(Object.entries(themes))('%s theme', (themeName, tokens) => {
  it('defines every token the pairs reference', () => {
    const referenced = new Set(TEXT_PAIRS.flatMap(([fg, bg]) => [fg, bg]));
    for (const name of referenced) {
      expect(tokens[name], `${themeName} is missing ${name}`).toBeDefined();
    }
  });

  it.each(TEXT_PAIRS)('%s on %s meets %s:1', (foreground, background, minimum) => {
    const ratio = contrast(tokens[foreground], tokens[background]);
    expect(
      Number(ratio.toFixed(2)),
      `${themeName}: ${foreground} on ${background} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`,
    ).toBeGreaterThanOrEqual(minimum);
  });
});

describe('oklchToRgb', () => {
  it('converts the extremes', () => {
    expect(oklchToRgb('oklch(1 0 0)')).toEqual([255, 255, 255]);
    expect(oklchToRgb('oklch(0 0 0)')).toEqual([0, 0, 0]);
  });

  it('matches the browser on a neutral mid grey', () => {
    // Cross-checked against Chrome's own oklch parsing, which resolves
    // oklch(0.5 0 0) to rgb(99, 99, 99).
    expect(oklchToRgb('oklch(0.5 0 0)')).toEqual([99, 99, 99]);
  });

  it('matches the browser on a chromatic colour', () => {
    expect(oklchToRgb('oklch(0.94 0.004 265)')).toEqual([234, 235, 238]);
    expect(oklchToRgb('oklch(0.955 0.005 85)')).toEqual([242, 240, 236]);
  });
});
