import { describe, expect, it } from 'vitest';
import {
  createHistory,
  record,
  undo,
  redo,
  canUndo,
  canRedo,
  currentText,
} from '../history';

/**
 * Undo is the mechanism people reach for after something has already gone
 * wrong, so it has to be right in exactly the situations that are hardest to
 * reproduce by hand. Hence a test rather than a click-through.
 */

describe('a fresh history', () => {
  it('holds the initial text and offers nothing to undo', () => {
    const history = createHistory('hello');

    expect(currentText(history)).toBe('hello');
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });
});

describe('recording', () => {
  it('makes the new text current and undoable', () => {
    let history = createHistory('a');
    history = record(history, 'ab', 1000);

    expect(currentText(history)).toBe('ab');
    expect(canUndo(history)).toBe(true);
  });

  it('ignores a re-record of identical text', () => {
    let history = createHistory('a');
    history = record(history, 'ab', 1000);
    const before = history;
    history = record(history, 'ab', 5000);

    expect(history).toBe(before);
  });

  it('merges edits inside the coalescing window into one step', () => {
    let history = createHistory('');
    // A burst of typing, 100ms apart.
    history = record(history, 'h', 1000);
    history = record(history, 'he', 1100);
    history = record(history, 'hel', 1200);
    history = record(history, 'hell', 1300);
    history = record(history, 'hello', 1400);

    expect(currentText(history)).toBe('hello');
    // One step back reaches the state before the burst, not 'hell'.
    expect(undo(history)?.text).toBe('');
  });

  it('keeps edits separated by a pause as distinct steps', () => {
    let history = createHistory('');
    history = record(history, 'first', 1000);
    history = record(history, 'first second', 9000);

    const once = undo(history);
    expect(once?.text).toBe('first');
    expect(undo(once!.history)?.text).toBe('');
  });
});

describe('undo and redo', () => {
  it('walks backwards and forwards over the same states', () => {
    let history = createHistory('v0');
    history = record(history, 'v1', 1000);
    history = record(history, 'v2', 9000);

    const back1 = undo(history)!;
    expect(back1.text).toBe('v1');

    const back2 = undo(back1.history)!;
    expect(back2.text).toBe('v0');
    expect(canUndo(back2.history)).toBe(false);

    const forward1 = redo(back2.history)!;
    expect(forward1.text).toBe('v1');

    const forward2 = redo(forward1.history)!;
    expect(forward2.text).toBe('v2');
    expect(canRedo(forward2.history)).toBe(false);
  });

  it('returns null rather than throwing at either end', () => {
    const history = createHistory('only');
    expect(undo(history)).toBeNull();
    expect(redo(history)).toBeNull();
  });

  it('discards the redo branch once you edit after undoing', () => {
    let history = createHistory('v0');
    history = record(history, 'v1', 1000);
    history = record(history, 'v2', 9000);

    const back = undo(history)!;
    expect(canRedo(back.history)).toBe(true);

    const branched = record(back.history, 'different', 17000);
    expect(canRedo(branched)).toBe(false);
    expect(undo(branched)?.text).toBe('v1');
  });

  it('recovers the text that a destructive edit removed', () => {
    // The case that motivated all of this: a long document, most of it
    // deleted, and the user needing it back.
    const original = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n');

    let history = createHistory(original);
    history = record(history, 'line 0\nline 1', 20000);

    expect(undo(history)?.text).toBe(original);
  });
});

describe('bounds', () => {
  it('caps the number of retained states', () => {
    let history = createHistory('start');
    // Well past the 200-entry cap, each outside the coalescing window.
    for (let i = 1; i <= 400; i += 1) {
      history = record(history, `state ${i}`, i * 10_000);
    }

    expect(history.past.length).toBeLessThanOrEqual(200);
    // The most recent state is always intact.
    expect(currentText(history)).toBe('state 400');
    expect(canUndo(history)).toBe(true);
  });

  it('caps total retained text, keeping undo working', () => {
    const large = 'x'.repeat(1024 * 1024);

    let history = createHistory(large + '0');
    for (let i = 1; i <= 20; i += 1) {
      history = record(history, large + i, i * 10_000);
    }

    const bytes = history.past.reduce((total, entry) => total + entry.text.length, 0);
    expect(bytes).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(canUndo(history)).toBe(true);
    expect(currentText(history)).toBe(large + '20');
  });
});
