import { useMemo } from 'react';
import { Check, CircleAlert, HardDriveDownload } from 'lucide-react';
import { useActiveDocument, useDocumentsStore } from '@/stores/documentsStore';
import { useSettingsStore, type ReadingMeasure } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

/**
 * The status bar.
 *
 * Save state lives here rather than in a toast, so "is my work on disk?" is
 * answerable by glancing at a fixed spot instead of by having caught a
 * notification.
 */
export function StatusBar() {
  const doc = useActiveDocument();
  const save = useDocumentsStore((s) => s.save);
  const isCompact = useUIStore((s) => s.isCompact);

  const stats = useMemo(() => (doc ? countText(doc.content) : null), [doc]);

  if (!doc) return null;

  return (
    <footer
      className={cn(
        'flex h-[var(--rmd-statusbar-height)] shrink-0 items-center gap-3 px-3',
        'border-t border-line bg-surface text-2xs text-ink-faint',
      )}
    >
      <SaveState doc={doc} onSave={() => void save(doc.id)} />

      <span className="ml-auto flex items-center gap-3">
        {stats && !isCompact && (
          <>
            <span title={`${stats.characters.toLocaleString()} characters`}>
              {stats.words.toLocaleString()} words
            </span>
            <span aria-hidden className="text-ink-faint/40">
              ·
            </span>
            <span>{stats.readingMinutes} min read</span>
            <span aria-hidden className="text-ink-faint/40">
              ·
            </span>
          </>
        )}
        <MeasurePicker />
      </span>
    </footer>
  );
}

function SaveState({
  doc,
  onSave,
}: {
  doc: NonNullable<ReturnType<typeof useActiveDocument>>;
  onSave: () => void;
}) {
  if (!doc.handle) {
    return (
      <span className="flex items-center gap-1.5">
        <CircleAlert size={12} className="text-warning" aria-hidden />
        <span>Not linked to a file</span>
        <button
          type="button"
          onClick={onSave}
          className="text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          Save as…
        </button>
      </span>
    );
  }

  if (doc.isDirty) {
    return (
      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-1.5 rounded-sm px-1 text-ink-muted hover:text-ink"
      >
        <HardDriveDownload size={12} aria-hidden />
        Unsaved changes
        <kbd className="kbd">Ctrl S</kbd>
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <Check size={12} className="text-success" aria-hidden />
      {doc.lastSavedAt ? `Saved ${formatClock(doc.lastSavedAt)}` : 'Saved'}
    </span>
  );
}

const MEASURES: { id: ReadingMeasure; label: string }[] = [
  { id: 'narrow', label: 'Narrow' },
  { id: 'normal', label: 'Normal' },
  { id: 'wide', label: 'Wide' },
  { id: 'full', label: 'Full' },
];

/** Line-length control. Belongs next to the document, not buried in settings. */
function MeasurePicker() {
  const measure = useSettingsStore((s) => s.readingMeasure);
  const setMeasure = useSettingsStore((s) => s.setReadingMeasure);

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">Line width</span>
      <select
        value={measure}
        onChange={(event) => setMeasure(event.target.value as ReadingMeasure)}
        className="cursor-pointer rounded-sm bg-transparent text-2xs text-ink-faint hover:text-ink focus:text-ink"
      >
        {MEASURES.map(({ id, label }) => (
          <option key={id} value={id} className="bg-overlay text-ink">
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Words per minute for silent reading of technical prose. */
const READING_SPEED_WPM = 220;

function countText(markdown: string): {
  words: number;
  characters: number;
  readingMinutes: number;
} {
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  return {
    words,
    characters: markdown.length,
    readingMinutes: Math.max(1, Math.round(words / READING_SPEED_WPM)),
  };
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
