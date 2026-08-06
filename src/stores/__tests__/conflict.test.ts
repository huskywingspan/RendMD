import { describe, expect, it, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  useSettingsStore,
  AUTOSAVE_DELAYS,
  DEFAULT_AUTOSAVE_DELAY,
} from '@/stores/settingsStore';

const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(resolve(here, relative), 'utf-8');

/**
 * Guards for writing to disk.
 *
 * The failure these protect against is not a crash — it is a save that
 * succeeds and destroys work that was never in this tab. `getLastModified`
 * existed in the file layer from the beginning, exported and documented as
 * "used to notice edits made outside RendMD", and was called by nothing at
 * all; save wrote unconditionally. Nothing reported that, because from the
 * app's point of view every save worked.
 */

describe('external change detection', () => {
  const store = read('../documentsStore.ts');

  it('tracks the mtime of every document on a handle', () => {
    expect(store).toMatch(/lastModified: number \| null/);
  });

  it('checks the file before writing', () => {
    expect(store).toMatch(/hasChangedOnDisk/);
    expect(store).toMatch(/if \(!options\.force && \(await hasChangedOnDisk\(doc\)\)\)/);
  });

  it('actually calls the file layer, rather than leaving it exported and unused', () => {
    expect(store).toMatch(/getLastModified/);
  });

  it('re-reads the mtime after its own writes', () => {
    // Otherwise the save we just performed looks like an external change and
    // every second save would raise a conflict.
    const start = store.indexOf('async save(id');
    const end = store.indexOf('async saveAs(', start);
    expect(start, 'save not found').toBeGreaterThan(-1);
    expect(end, 'saveAs not found after save').toBeGreaterThan(start);
    expect(store.slice(start, end)).toMatch(/await readMtime/);
  });

  it('treats an unknown mtime as no conflict', () => {
    // A missing baseline must not block saving, or documents restored from a
    // previous session could never be written.
    expect(store).toMatch(/if \(!doc\.handle \|\| doc\.lastModified === null\) return false/);
  });

  it('does not restore a stale mtime across sessions', () => {
    const restored = store.slice(store.indexOf('function fromPersisted'));
    expect(restored).toMatch(/lastModified: null/);
  });
});

describe('the conflict dialog', () => {
  const modal = read('../../components/Modals/ConflictModal.tsx');

  it('offers all three resolutions', () => {
    expect(modal).toMatch(/Keep mine/);
    expect(modal).toMatch(/Load theirs/);
    expect(modal).toMatch(/Save a copy/);
  });

  it('only overwrites when the user chose to', () => {
    expect(modal).toMatch(/save\(conflictId, \{ force: true \}\)/);
  });

  it('keeps the user version reachable after loading from disk', () => {
    // reloadFromDisk records the incoming text as a history step, so the edits
    // being replaced are one Ctrl+Z away rather than gone.
    const store = read('../documentsStore.ts');
    const reload = store.slice(store.indexOf('async reloadFromDisk'));
    expect(reload).toMatch(/recordHistory/);
  });
});

describe('autosave respects a pending conflict', () => {
  it('skips documents awaiting a decision', () => {
    expect(read('../../hooks/useAutoSave.ts')).toMatch(/conflictId === current\.id\) return/);
  });
});

describe('autosave delay', () => {
  beforeEach(() => {
    useSettingsStore.getState().setAutoSaveDelay(DEFAULT_AUTOSAVE_DELAY);
  });

  it('defaults to an offered value, so the control has something selected', () => {
    expect(AUTOSAVE_DELAYS as readonly number[]).toContain(DEFAULT_AUTOSAVE_DELAY);
  });

  it('accepts the offered values', () => {
    for (const ms of AUTOSAVE_DELAYS) {
      useSettingsStore.getState().setAutoSaveDelay(ms);
      expect(useSettingsStore.getState().autoSaveDelay).toBe(ms);
    }
  });

  it('falls back when given something it never offered', () => {
    // Persisted settings are user-editable and survive version changes; an
    // arbitrary value here becomes the timeout of a real setTimeout.
    useSettingsStore.getState().setAutoSaveDelay(0);
    expect(useSettingsStore.getState().autoSaveDelay).toBe(DEFAULT_AUTOSAVE_DELAY);

    useSettingsStore.getState().setAutoSaveDelay(Number.NaN);
    expect(useSettingsStore.getState().autoSaveDelay).toBe(DEFAULT_AUTOSAVE_DELAY);
  });

  it('is read by the hook rather than hardcoded', () => {
    const hook = read('../../hooks/useAutoSave.ts');
    expect(hook).toMatch(/autoSaveDelay/);
    expect(hook).not.toMatch(/AUTOSAVE_DELAY_MS/);
  });
});

describe('unhandled rejections are surfaced', () => {
  it('installs a listener before render', () => {
    expect(read('../../main.tsx')).toMatch(/installErrorReporting\(\)/);
  });

  it('ignores cancellations, which are not failures', () => {
    const source = read('../../lib/reportErrors.ts');
    expect(source).toMatch(/AbortError/);
    expect(source).toMatch(/UserCancelledError/);
  });

  it('reports a real rejection once', async () => {
    const { installErrorReporting } = await import('@/lib/reportErrors');
    const { useToastStore } = await import('@/stores/toastStore');

    useToastStore.getState().clear();
    const uninstall = installErrorReporting();

    const fire = (reason: unknown) =>
      window.dispatchEvent(
        Object.assign(new Event('unhandledrejection'), { reason, promise: Promise.resolve() }),
      );

    vi.spyOn(console, 'error').mockImplementation(() => {});
    fire(new Error('disk on fire'));
    fire(new Error('disk on fire'));

    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toContain('disk on fire');

    uninstall();
    useToastStore.getState().clear();
    vi.restoreAllMocks();
  });
});
