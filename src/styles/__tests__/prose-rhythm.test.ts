import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Vertical rhythm on the reading surface.
 *
 * `.prose-surface > * + *` is the single rule that puts space between
 * top-level blocks. It is also, as written, one of the *least* specific rules
 * in the file — a bare class plus two universal selectors, (0,1,0) — so almost
 * any element-level rule can outrank it by accident.
 *
 * That is not hypothetical. `.prose-surface p { margin: 0 }` — added to clear
 * the browser's default margins, since <p> also appears nested inside list
 * items and table cells — scores (0,1,1) and silently beat it. Consecutive
 * paragraphs then rendered with a gap of exactly zero: a blank line in the
 * markdown source simply disappeared when rendered, and the document read as
 * one unbroken wall of text.
 *
 * The fix is to reset those margins inside :where(), which forces the reset to
 * zero specificity so it cannot outrank anything. These tests hold that
 * property in place, because the failure is silent: the CSS still parses, the
 * rule is still there, and nothing reports an error.
 */

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Comments are stripped and line endings normalised before anything is
 * matched. Both files document the very selectors under test in their header
 * comments, so a naive search finds the prose about a rule rather than the
 * rule.
 */
function loadCss(name: string): string {
  return readFileSync(resolve(here, `../${name}`), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\r\n/g, '\n');
}

const prose = loadCss('prose.css');
const tokens = loadCss('tokens.css');

/** Declarations of the first rule whose selector list contains the fragment. */
function ruleBody(css: string, selectorFragment: string): string {
  const index = css.indexOf(selectorFragment);
  expect(index, `no rule for ${selectorFragment}`).toBeGreaterThan(-1);
  const open = css.indexOf('{', index);
  return css.slice(open + 1, css.indexOf('}', open));
}

/**
 * A `margin` / `margin-top` / `margin-block` declaration, and specifically not
 * `scroll-margin-top`, which headings legitimately set and which has nothing
 * to do with layout.
 */
const MARGIN_DECLARATION = /(^|[\s;{])margin(-top|-block)?\s*:/;

describe('block rhythm', () => {
  it('spaces adjacent top-level blocks', () => {
    expect(ruleBody(prose, '.prose-surface > * + *')).toMatch(
      /margin-top:\s*var\(--prose-block-gap\)/,
    );
  });

  it('defines the gap token', () => {
    expect(tokens).toMatch(/--prose-block-gap:\s*[\d.]+em/);
  });

  it('gives the gap a non-zero value', () => {
    // The bug was a computed gap of 0. A token that resolves to zero would
    // reproduce it exactly while leaving every selector above still correct.
    const [, value] = /--prose-block-gap:\s*([\d.]+)em/.exec(tokens) ?? [];
    expect(Number(value)).toBeGreaterThan(0);
  });
});

describe('the margin reset cannot outrank the rhythm rule', () => {
  const reset = ':where(.prose-surface) :where(p, h1, h2, h3, h4, h5, h6, ul, ol, pre, table, figure)';

  it('clears default margins at zero specificity', () => {
    expect(prose).toContain(reset);
    expect(ruleBody(prose, reset)).toMatch(/margin:\s*0/);
  });

  it('covers paragraphs and lists, the elements that regressed', () => {
    for (const tag of ['p', 'ul', 'ol']) {
      expect(reset).toContain(tag);
    }
  });

  /**
   * The guard that matters. Any of these rules reintroducing `margin` or
   * `margin-top` outside :where() puts it at (0,1,1) — above the rhythm rule —
   * and the gap silently collapses to whatever that rule says.
   */
  it.each([
    ['paragraphs', '.prose-surface p {'],
    ['preformatted text', '.prose-surface pre {'],
    ['headings', '.prose-surface h1,'],
    ['lists', '.prose-surface ul,'],
  ])('the %s rule does not set its own margin', (_name, selector) => {
    expect(ruleBody(prose, selector)).not.toMatch(MARGIN_DECLARATION);
  });
});

describe('deliberate overrides still outrank the default gap', () => {
  // These are (0,1,1) on purpose: blocks that need more room than the base
  // rhythm. They must stay more specific than `.prose-surface > * + *`, which
  // they are by virtue of naming an element or a class.
  it.each([
    ['.prose-surface blockquote {', /margin:\s*1\.4em 0/],
    ['.prose-surface .tableWrapper {', /margin-block:/],
    ['.prose-surface .code-block-wrapper {', /margin-block:/],
  ])('%s sets its own spacing', (selector, pattern) => {
    expect(ruleBody(prose, selector)).toMatch(pattern);
  });

  it('keeps the first block flush with the top of the page', () => {
    expect(ruleBody(prose, '.prose-surface > :first-child')).toMatch(/margin-top:\s*0/);
  });
});
