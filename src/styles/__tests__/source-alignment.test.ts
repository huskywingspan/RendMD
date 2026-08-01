import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Source-view layer alignment.
 *
 * Source view stacks a transparent textarea over a syntax-highlighted copy of
 * the same text. The caret belongs to the textarea; every visible glyph
 * belongs to the layer beneath. If their text metrics disagree, the caret sits
 * at one document offset while the text under it belongs to another — so you
 * edit a line you are not looking at, and nothing about the UI tells you.
 *
 * This is not a hypothetical failure mode. The rules were previously in a file
 * that was deleted during a refactor, and without them Shiki's <pre> kept the
 * UA default `white-space: pre` while the textarea wrapped with `pre-wrap`.
 * Every wrapped line pushed the layers a further row out of step: one wrapped
 * paragraph made backspace delete from the row above, and a long document
 * drifted by ten rows.
 *
 * So the declarations are asserted rather than trusted. A test that reads CSS
 * is unusual, but the alternative is a silent data-corruption bug returning
 * the next time someone tidies the stylesheets.
 */

const SOURCE_CSS = resolve(dirname(fileURLToPath(import.meta.url)), '../source.css');
const INDEX_CSS = resolve(dirname(fileURLToPath(import.meta.url)), '../index.css');

const css = readFileSync(SOURCE_CSS, 'utf-8');

/** Extract the declarations of the first rule whose selector list matches. */
function ruleBody(selectorFragment: string): string {
  const index = css.indexOf(selectorFragment);
  expect(index, `no rule for ${selectorFragment}`).toBeGreaterThan(-1);

  const open = css.indexOf('{', index);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

describe('the stylesheet is actually loaded', () => {
  it('is imported by the entry point', () => {
    // The whole failure was these rules existing but not being applied.
    expect(readFileSync(INDEX_CSS, 'utf-8')).toContain("@import './source.css'");
  });
});

describe('.source-metrics defines every property that affects layout', () => {
  const body = ruleBody('.source-metrics {');

  // Anything that changes where a glyph lands has to be pinned here, because
  // this class is applied to both layers and is their only shared definition.
  it.each([
    ['font-family', /font-family:/],
    ['font-size', /font-size:/],
    ['line-height', /line-height:/],
    ['letter-spacing', /letter-spacing:/],
    ['tab-size', /tab-size:/],
    ['padding', /padding:/],
    ['white-space', /white-space:/],
    ['overflow-wrap', /overflow-wrap:/],
    ['word-break', /word-break:/],
  ])('declares %s', (_name, pattern) => {
    expect(body).toMatch(pattern);
  });

  it('wraps, because the textarea always does', () => {
    // `pre` here rather than `pre-wrap` is the precise mistake that shipped.
    expect(body).toMatch(/white-space:\s*pre-wrap/);
  });
});

describe('Shiki output cannot override the shared metrics', () => {
  const body = ruleBody('.source-highlight pre,');

  it('covers pre, code and the line spans Shiki emits', () => {
    const selector = css.slice(css.indexOf('.source-highlight pre,'), css.indexOf('{', css.indexOf('.source-highlight pre,')));
    expect(selector).toContain('pre');
    expect(selector).toContain('code');
    expect(selector).toContain('.line');
  });

  it.each([
    ['white-space', /white-space:\s*inherit/],
    ['overflow-wrap', /overflow-wrap:\s*inherit/],
    ['word-break', /word-break:\s*inherit/],
    ['font-family', /font-family:\s*inherit/],
    ['font-size', /font-size:\s*inherit/],
    ['line-height', /line-height:\s*inherit/],
    ['letter-spacing', /letter-spacing:\s*inherit/],
    ['tab-size', /tab-size:\s*inherit/],
  ])('forces %s to inherit', (_name, pattern) => {
    expect(body).toMatch(pattern);
  });

  it('zeroes the margin and padding the UA gives pre', () => {
    // <pre> carries `margin: 1em 0` by default, which offsets the whole layer.
    expect(body).toMatch(/margin:\s*0/);
    expect(body).toMatch(/padding:\s*0/);
  });
});

describe('both layers carry the shared class', () => {
  const component = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../components/SourceView/SourceEditor.tsx'),
    'utf-8',
  );

  it('applies source-metrics to the highlighted layer', () => {
    expect(component).toMatch(/source-highlight source-metrics/);
  });

  it('applies source-metrics to the textarea', () => {
    expect(component).toMatch(/source-textarea source-metrics/);
  });

  it('does not set competing inline text metrics', () => {
    // Inline styles on one layer only were how the two drifted apart before.
    expect(component).not.toMatch(/fontSize:/);
    expect(component).not.toMatch(/lineHeight:/);
    expect(component).not.toMatch(/whiteSpace:/);
  });
});
