import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Durable user preferences.
 *
 * Kept separate from document state so that clearing or corrupting one cannot
 * take the other with it — a bad draft should never cost you your settings,
 * and a settings reset should never lose your work.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ReadingFamily = 'sans' | 'serif' | 'mono';
export type ReadingMeasure = 'narrow' | 'normal' | 'wide' | 'full';

/** Line lengths, in ch. Anything past ~80 gets hard to track back to. */
const MEASURE_VALUES: Record<ReadingMeasure, string> = {
  narrow: '56ch',
  normal: '68ch',
  wide: '82ch',
  full: 'none',
};

const FAMILY_VARS: Record<ReadingFamily, string> = {
  sans: 'var(--rmd-font-sans)',
  serif: 'var(--rmd-font-serif)',
  mono: 'var(--rmd-font-mono)',
};

export const MIN_READING_SIZE = 14;
export const MAX_READING_SIZE = 24;

/**
 * Offered autosave delays, in milliseconds.
 *
 * A short list rather than a slider: the difference between 1.2s and 1.4s is
 * not something anyone can feel, and offering it implies a precision that
 * isn't there. These are the steps that change the behaviour meaningfully.
 */
export const AUTOSAVE_DELAYS = [1000, 2000, 5000, 15000, 30000] as const;

/** Must be one of AUTOSAVE_DELAYS, or the control has nothing to select. */
export const DEFAULT_AUTOSAVE_DELAY = 1000;

interface SettingsState {
  theme: ThemePreference;
  readingFamily: ReadingFamily;
  readingSize: number;
  readingMeasure: ReadingMeasure;
  /** Write to disk automatically a beat after you stop typing. */
  autoSave: boolean;
  /**
   * How long after the last keystroke autosave waits, in milliseconds.
   *
   * A debounce, not an interval: the countdown restarts on every change, so a
   * longer value does not mean saving less often while you type — it means
   * waiting longer after you stop. Worth raising if a file is watched by
   * something that reacts to writes.
   */
  autoSaveDelay: number;
  /** Browser spellcheck inside the rendered editor. */
  spellcheck: boolean;
  /** Reopen the previous session's tabs on launch. */
  restoreSession: boolean;
  /**
   * Show the format toolbar above the rendered document.
   *
   * Off by default, and persisted. This is a reading tool first: the toolbar is
   * something you turn on for a writing session, not chrome that greets you
   * every time you open a file to read it.
   */
  formatToolbar: boolean;

  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  setReadingFamily: (family: ReadingFamily) => void;
  setReadingSize: (size: number) => void;
  adjustReadingSize: (delta: number) => void;
  setReadingMeasure: (measure: ReadingMeasure) => void;
  setAutoSave: (enabled: boolean) => void;
  setAutoSaveDelay: (ms: number) => void;
  setSpellcheck: (enabled: boolean) => void;
  setRestoreSession: (enabled: boolean) => void;
  setFormatToolbar: (enabled: boolean) => void;
  toggleFormatToolbar: () => void;
  resetAppearance: () => void;
}

const APPEARANCE_DEFAULTS = {
  theme: 'system' as ThemePreference,
  readingFamily: 'sans' as ReadingFamily,
  readingSize: 17,
  readingMeasure: 'normal' as ReadingMeasure,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...APPEARANCE_DEFAULTS,
      autoSave: true,
      autoSaveDelay: DEFAULT_AUTOSAVE_DELAY,
      spellcheck: true,
      restoreSession: true,
      formatToolbar: false,

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        // From 'system', flip to whichever is the opposite of what's on screen,
        // so the click always visibly changes something.
        const current = get().theme;
        if (current === 'system') {
          set({ theme: prefersDark() ? 'light' : 'dark' });
        } else {
          set({ theme: current === 'dark' ? 'light' : 'dark' });
        }
      },
      setReadingFamily: (readingFamily) => set({ readingFamily }),
      setReadingSize: (size) => set({ readingSize: clampReadingSize(size) }),
      adjustReadingSize: (delta) =>
        set((state) => ({ readingSize: clampReadingSize(state.readingSize + delta) })),
      setReadingMeasure: (readingMeasure) => set({ readingMeasure }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setAutoSaveDelay: (ms) =>
        set({
          // Persisted state is user-editable in devtools and survives version
          // changes, so an unknown value falls back rather than becoming the
          // timeout of an unbounded setTimeout.
          autoSaveDelay: (AUTOSAVE_DELAYS as readonly number[]).includes(ms)
            ? ms
            : DEFAULT_AUTOSAVE_DELAY,
        }),
      setSpellcheck: (spellcheck) => set({ spellcheck }),
      setRestoreSession: (restoreSession) => set({ restoreSession }),
      setFormatToolbar: (formatToolbar) => set({ formatToolbar }),
      toggleFormatToolbar: () => set((state) => ({ formatToolbar: !state.formatToolbar })),
      resetAppearance: () => set({ ...APPEARANCE_DEFAULTS }),
    }),
    {
      name: 'rendmd:settings',
      version: 1,
    },
  ),
);

function clampReadingSize(size: number): number {
  return Math.min(MAX_READING_SIZE, Math.max(MIN_READING_SIZE, Math.round(size)));
}

export function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolve a preference — including 'system' — to the theme actually shown. */
export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return prefersDark() ? 'dark' : 'light';
  return preference;
}

/**
 * Push settings onto the document element.
 *
 * Done imperatively rather than through React because these values belong to
 * <html>: they need to be in place before first paint (see the inline script
 * in index.html) and they have to apply to portalled content, which lives
 * outside the React tree.
 */
export function applySettingsToDocument(state: {
  theme: ThemePreference;
  readingFamily: ReadingFamily;
  readingSize: number;
  readingMeasure: ReadingMeasure;
}): void {
  const root = document.documentElement;
  const resolved = resolveTheme(state.theme);

  root.classList.toggle('theme-dark', resolved === 'dark');
  root.classList.toggle('theme-light', resolved === 'light');

  root.style.setProperty('--reading-family', FAMILY_VARS[state.readingFamily]);
  root.style.setProperty('--reading-size', `${state.readingSize}px`);
  root.style.setProperty('--reading-measure', MEASURE_VALUES[state.readingMeasure]);
}

export { MEASURE_VALUES, FAMILY_VARS };
