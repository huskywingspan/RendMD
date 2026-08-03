import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { BLOCK_TYPES, type BlockTypeId } from '../blockTypes';
import { COMMANDS } from '@/lib/commands';
import { useSettingsStore } from '@/stores/settingsStore';

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(resolve(here, relative), 'utf-8');

describe('block types are defined once', () => {
  it('offers every heading level', () => {
    const ids = BLOCK_TYPES.map((type) => type.id);
    for (const level of [1, 2, 3, 4, 5, 6]) {
      expect(ids).toContain(`h${level}` as BlockTypeId);
    }
  });

  it('has no duplicate ids', () => {
    const ids = BLOCK_TYPES.map((type) => type.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels every entry', () => {
    for (const type of BLOCK_TYPES) {
      expect(type.label.trim()).not.toBe('');
    }
  });

  /**
   * The reason this module exists. Both surfaces previously carried their own
   * copy of this list; the point of extracting it was that neither can now
   * define one privately and drift.
   */
  it.each(['../BubbleMenu.tsx', '../FormatToolbar.tsx'])(
    '%s imports the shared list rather than declaring its own',
    (file) => {
      const source = read(file);
      expect(source).toMatch(/from '\.\/formatting'/);
      expect(source).not.toMatch(/const BLOCK_TYPES/);
    },
  );
});

describe('the format toolbar is opt-in', () => {
  it('defaults to off', () => {
    // A reading tool should open with no editing chrome at all.
    expect(useSettingsStore.getState().formatToolbar).toBe(false);
  });

  it('toggles', () => {
    const { toggleFormatToolbar, setFormatToolbar } = useSettingsStore.getState();

    toggleFormatToolbar();
    expect(useSettingsStore.getState().formatToolbar).toBe(true);
    toggleFormatToolbar();
    expect(useSettingsStore.getState().formatToolbar).toBe(false);

    setFormatToolbar(true);
    expect(useSettingsStore.getState().formatToolbar).toBe(true);
    setFormatToolbar(false);
  });

  it('renders nothing while off, rather than a collapsed strip', () => {
    // The promise is that the reading surface is untouched when the toolbar is
    // off — not merely thinner.
    expect(read('../FormatToolbar.tsx')).toMatch(/if \(!enabled \|\| focusMode \|\| !state\) return null/);
  });

  it('hides in focus mode along with the rest of the chrome', () => {
    expect(read('../FormatToolbar.tsx')).toMatch(/focusMode/);
  });
});

describe('the toolbar is reachable', () => {
  const command = COMMANDS.find((entry) => entry.id === 'view.formatToolbar');

  it('has a palette command', () => {
    expect(command).toBeDefined();
    expect(command?.group).toBe('View');
  });

  it('has a shortcut, which the shortcuts modal reads from the registry', () => {
    expect(command?.shortcut).toBe('Ctrl+Shift+B');
  });

  it('does not collide with another binding', () => {
    const shortcuts = COMMANDS.map((entry) => entry.shortcut).filter(Boolean);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  it('has a visible toggle in the title bar', () => {
    const titleBar = read('../../shell/TitleBar.tsx');
    expect(titleBar).toMatch(/toggleFormatToolbar/);
    expect(titleBar).toMatch(/format toolbar/i);
  });
});

describe('the toolbar belongs to the rendered pane', () => {
  it('is rendered by Editor, not by the app shell', () => {
    // In split view it drives the ProseMirror document, so it has to sit in the
    // pane it can act on; in source-only view it is then absent rather than
    // present and inert.
    expect(read('../Editor.tsx')).toMatch(/<FormatToolbar/);
    expect(read('../../../App.tsx')).not.toMatch(/FormatToolbar/);
  });

  it('does not duplicate the contextual table controls', () => {
    // Row and column operations live in TableToolbar, which appears only when
    // the cursor is inside a table.
    const source = read('../FormatToolbar.tsx');
    expect(source).toMatch(/insertTable/);
    expect(source).not.toMatch(/addRowAfter|deleteRow|addColumnAfter|deleteColumn/);
  });
});
