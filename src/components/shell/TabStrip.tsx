import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useDocumentsStore } from '@/stores/documentsStore';
import { cn } from '@/utils/cn';

/**
 * Open documents, one tab each.
 *
 * Tabs are draggable to reorder using the native HTML drag events — they are
 * the only mechanism that gets keyboard and assistive-tech behaviour for free,
 * and reordering tabs does not need the precision that would justify a custom
 * pointer implementation.
 *
 * The close button doubles as the unsaved indicator: a dot at rest, an ×
 * on hover. That keeps one target in one place instead of two competing for
 * the same corner.
 */
export function TabStrip() {
  const documents = useDocumentsStore((s) => s.documents);
  const activeId = useDocumentsStore((s) => s.activeId);
  const setActive = useDocumentsStore((s) => s.setActive);
  const close = useDocumentsStore((s) => s.close);
  const moveTab = useDocumentsStore((s) => s.moveTab);
  const newDocument = useDocumentsStore((s) => s.newDocument);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Keep the focused tab on screen when it changes via keyboard or the palette.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  if (documents.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Open documents"
      className="flex h-[var(--rmd-tabbar-height)] shrink-0 items-stretch border-b border-line bg-surface"
    >
      <div className="scrollbar-none flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {documents.map((doc, index) => {
          const isActive = doc.id === activeId;

          return (
            // The tab and its close control are siblings inside this wrapper
            // rather than nested. A button inside a button is invalid HTML and
            // leaves the inner control unreachable by keyboard.
            <div
              key={doc.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(event) => {
                if (dragIndex === null || dragIndex === index) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex === null || dragIndex === index) return;
                moveTab(dragIndex, index);
                setDragIndex(null);
              }}
              onAuxClick={(event) => {
                // Middle-click closes, as in every other tabbed app.
                if (event.button === 1) {
                  event.preventDefault();
                  void close(doc.id);
                }
              }}
              className={cn(
                'group relative flex max-w-52 min-w-0 items-center border-r border-line',
                'text-sm transition-colors duration-[120ms]',
                isActive ? 'bg-canvas text-ink' : 'text-ink-muted hover:bg-hover',
                dragIndex === index && 'opacity-50',
              )}
            >
              {/* Active marker rides the top edge so it reads as a tab, not a button. */}
              {isActive && <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" aria-hidden />}

              <button
                ref={isActive ? activeRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                title={doc.path}
                onClick={() => setActive(doc.id)}
                className="min-w-0 flex-1 truncate py-1.5 pr-1 pl-3 text-left"
              >
                {doc.name}
              </button>

              <button
                type="button"
                aria-label={`Close ${doc.name}`}
                onClick={() => void close(doc.id)}
                className={cn(
                  'mr-1.5 grid size-4 shrink-0 place-items-center rounded-sm',
                  'text-ink-faint hover:bg-hover hover:text-ink',
                )}
              >
                {doc.isDirty ? (
                  <>
                    {/* The dot doubles as the unsaved indicator until hover,
                        keeping one target where two would compete. */}
                    <span className="size-1.5 rounded-full bg-accent group-hover:hidden" />
                    <X size={12} className="hidden group-hover:block" />
                  </>
                ) : (
                  <X size={12} className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => newDocument()}
        aria-label="New document"
        className="grid w-9 shrink-0 place-items-center border-l border-line text-ink-faint hover:bg-hover hover:text-ink"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
