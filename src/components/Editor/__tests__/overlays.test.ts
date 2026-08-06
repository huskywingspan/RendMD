import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { useUIStore } from '@/stores/uiStore';

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(resolve(here, relative), 'utf-8');

/**
 * Comments are stripped before matching. These files explain the bugs they
 * fix, which means the old broken expression is quoted in prose directly above
 * the correct one — a plain search finds the explanation, not the code.
 */
const readCode = (relative: string) =>
  read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/**
 * Two floating surfaces that were reachable but not dismissible, and one that
 * pointed at the wrong thing.
 */

describe('the table toolbar follows the cursor between tables', () => {
  const source = readCode('../TableToolbar.tsx');

  it('resolves the table through the node hierarchy, not closest()', () => {
    // domAtPos resolves ambiguously at a node boundary — the start of a table
    // is one — so closest('table') could climb to the table *before* the
    // cursor. That is how the toolbar came to be drawn over the wrong table.
    expect(source).toMatch(/nodeDOM/);
    expect(source).not.toMatch(/closest\('table'\)/);
  });

  it('repositions when the anchored table changes', () => {
    // The effect used to depend on a boolean that stays true while moving from
    // one table to another, so it never re-ran and the position went stale.
    expect(source).toMatch(/\}, \[table, toolbar\]\)/);
  });

  it('observes the table rather than the editor', () => {
    // Watching the editor element meant only a scroll ever triggered a
    // recompute, which is why a misplaced toolbar righted itself on scroll.
    expect(source).toMatch(/autoUpdate\(table, toolbar, update\)/);
    expect(source).not.toMatch(/autoUpdate\(editor\.view\.dom/);
  });

  it('hides when there is no table to anchor to', () => {
    expect(source).toMatch(/if \(!table\) return null/);
  });
});

describe('find and replace can be closed', () => {
  it('closes on Escape from anywhere, not only from its inputs', () => {
    const shortcuts = read('../../../hooks/useGlobalShortcuts.ts');
    expect(shortcuts).toMatch(/event\.key === 'Escape'/);
    expect(shortcuts).toMatch(/closeFind\(\)/);
  });

  it('does not steal Escape from an open overlay', () => {
    const shortcuts = read('../../../hooks/useGlobalShortcuts.ts');
    const guard = shortcuts.slice(shortcuts.indexOf("event.key === 'Escape'"));
    expect(guard).toMatch(/overlay === null/);
  });

  it('clears its highlights on every close path', () => {
    // Including the global one, which knows nothing about editor state.
    const bar = read('../SearchBar.tsx');
    expect(bar).toMatch(/return \(\) => \{\s*editor\.commands\.clearSearch\(\);/);
  });

  it('re-focuses the field when the shortcut is pressed again', () => {
    expect(read('../SearchBar.tsx')).toMatch(/\[findNonce\]/);
  });
});

describe('openFind', () => {
  it('bumps the nonce even when already open', () => {
    const before = useUIStore.getState().findNonce;

    useUIStore.getState().openFind(false);
    const afterFirst = useUIStore.getState().findNonce;
    expect(afterFirst).toBeGreaterThan(before);

    // The bar is open now; pressing the shortcut again used to do nothing.
    useUIStore.getState().openFind(false);
    expect(useUIStore.getState().findNonce).toBeGreaterThan(afterFirst);

    useUIStore.getState().closeFind();
  });

  it('carries the replace mode through', () => {
    useUIStore.getState().openFind(true);
    expect(useUIStore.getState().findReplaceMode).toBe(true);
    expect(useUIStore.getState().findOpen).toBe(true);

    useUIStore.getState().closeFind();
    expect(useUIStore.getState().findOpen).toBe(false);
  });
});
