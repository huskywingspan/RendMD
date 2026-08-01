/**
 * Document-level undo history.
 *
 * ProseMirror has its own history, but it only covers the rendered pane, only
 * for as long as that editor instance lives. It knows nothing about edits made
 * in the source pane, and it is discarded when you switch tabs or view mode.
 * So there was no way back from a mistake made in source view — which is
 * precisely the situation that needed one.
 *
 * This sits at the document level instead: whole-text snapshots, so undo means
 * the same thing regardless of which pane made the change or how many times
 * the view has changed since.
 *
 * Full snapshots rather than diffs. A patch history is smaller but has to be
 * exactly right to be safe, and this is the mechanism people reach for *after*
 * something has already gone wrong — the last place to be clever. Markdown
 * compresses well in memory and the caps below bound the cost.
 */

/** Keep at most this many states per document. */
const MAX_ENTRIES = 200;

/** ...and at most this much text in total, so one huge file can't dominate. */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Edits closer together than this are merged into one undo step, so a run of
 * typing rewinds as a phrase rather than a character at a time.
 */
const COALESCE_MS = 500;

export interface HistoryEntry {
  text: string;
  at: number;
}

export interface DocumentHistory {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export function createHistory(text: string): DocumentHistory {
  return { past: [{ text, at: Date.now() }], future: [] };
}

export function canUndo(history: DocumentHistory): boolean {
  return history.past.length > 1;
}

export function canRedo(history: DocumentHistory): boolean {
  return history.future.length > 0;
}

/** The state the document is currently at. */
export function currentText(history: DocumentHistory): string | null {
  return history.past.at(-1)?.text ?? null;
}

/**
 * Record a new state.
 *
 * Recording anything discards the redo stack, which is the conventional
 * behaviour: once you edit after undoing, the branch you abandoned is gone.
 * (A true undo *tree* would keep it. Worth doing, but a linear history that
 * definitely works beats a tree that might not.)
 */
export function record(
  history: DocumentHistory,
  text: string,
  now: number = Date.now(),
): DocumentHistory {
  const last = history.past.at(-1);

  // Nothing changed — a selection move, or a save.
  if (last?.text === text) {
    return history.future.length > 0 ? { ...history, future: [] } : history;
  }

  let past = history.past;

  // Within the coalescing window, replace the newest entry rather than adding
  // one. The entry *before* it is still the pre-typing state, so undo steps
  // back over the whole run.
  if (last && now - last.at < COALESCE_MS && past.length > 1) {
    past = [...past.slice(0, -1), { text, at: now }];
  } else {
    past = [...past, { text, at: now }];
  }

  return { past: trim(past), future: [] };
}

/** Step back one state. Returns null when there is nothing to undo. */
export function undo(history: DocumentHistory): { history: DocumentHistory; text: string } | null {
  if (!canUndo(history)) return null;

  const past = history.past.slice(0, -1);
  const undone = history.past.at(-1) as HistoryEntry;
  const text = past.at(-1)?.text ?? '';

  return { history: { past, future: [undone, ...history.future] }, text };
}

/** Step forward one state. Returns null when there is nothing to redo. */
export function redo(history: DocumentHistory): { history: DocumentHistory; text: string } | null {
  const next = history.future[0];
  if (!next) return null;

  return {
    history: { past: trim([...history.past, next]), future: history.future.slice(1) },
    text: next.text,
  };
}

/**
 * Enforce the caps, dropping the oldest states first.
 *
 * The last entry is never dropped: it is the document's current text, and
 * losing it would break undo entirely rather than merely shorten it.
 */
function trim(past: HistoryEntry[]): HistoryEntry[] {
  let trimmed = past.length > MAX_ENTRIES ? past.slice(past.length - MAX_ENTRIES) : past;

  let bytes = trimmed.reduce((total, entry) => total + entry.text.length, 0);
  while (bytes > MAX_BYTES && trimmed.length > 2) {
    bytes -= trimmed[0].text.length;
    trimmed = trimmed.slice(1);
  }

  return trimmed;
}
