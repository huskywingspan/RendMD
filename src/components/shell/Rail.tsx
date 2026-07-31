import { useCallback, useEffect, useRef } from 'react';
import { FolderTree, List } from 'lucide-react';
import { useUIStore, MIN_RAIL_WIDTH, MAX_RAIL_WIDTH, type RailPanel } from '@/stores/uiStore';
import { FileTree } from './FileTree';
import { OutlinePanel } from './OutlinePanel';
import { cn } from '@/utils/cn';
import type { OutlineItem } from '@/hooks/useOutline';

interface RailProps {
  outline: OutlineItem[];
  activeOutlineId: string | null;
  onOutlineSelect: (item: OutlineItem) => void;
}

const PANELS: { id: RailPanel; label: string; icon: typeof List }[] = [
  { id: 'files', label: 'Files', icon: FolderTree },
  { id: 'outline', label: 'Outline', icon: List },
];

/**
 * The left rail: workspace files and document outline.
 *
 * On desktop it is an inline column with a drag handle. Below the compact
 * breakpoint it becomes an overlay drawer, because at that width an inline
 * rail leaves nothing for the document.
 */
export function Rail({ outline, activeOutlineId, onOutlineSelect }: RailProps) {
  const railOpen = useUIStore((s) => s.railOpen);
  const railPanel = useUIStore((s) => s.railPanel);
  const railWidth = useUIStore((s) => s.railWidth);
  const isCompact = useUIStore((s) => s.isCompact);
  const setRailPanel = useUIStore((s) => s.setRailPanel);
  const setRailOpen = useUIStore((s) => s.setRailOpen);

  // Close the drawer on Escape when it's overlaying the document.
  useEffect(() => {
    if (!isCompact || !railOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRailOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCompact, railOpen, setRailOpen]);

  if (!railOpen) return null;

  const panel = (
    <aside
      style={{ width: isCompact ? undefined : railWidth }}
      className={cn(
        'relative flex min-h-0 shrink-0 flex-col border-r border-line bg-surface',
        isCompact && 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-lg',
      )}
      aria-label="Navigation"
    >
      {/* Panel switcher */}
      <div
        role="tablist"
        aria-label="Sidebar panels"
        className="flex shrink-0 items-center gap-0.5 border-b border-line px-1.5 py-1"
      >
        {PANELS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={railPanel === id}
            onClick={() => setRailPanel(id)}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-sm px-2 text-sm transition-colors',
              railPanel === id
                ? 'bg-accent-soft font-medium text-accent'
                : 'text-ink-muted hover:bg-hover hover:text-ink',
            )}
          >
            <Icon size={13} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {railPanel === 'files' ? (
        <FileTree />
      ) : (
        <OutlinePanel items={outline} activeId={activeOutlineId} onSelect={onOutlineSelect} />
      )}

      {!isCompact && <RailResizer />}
    </aside>
  );

  if (!isCompact) return panel;

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={() => setRailOpen(false)}
        className="fixed inset-0 z-40 bg-black/40 animate-[overlay-in_190ms_ease-out]"
      />
      {panel}
    </>
  );
}

/**
 * Drag handle for the rail width.
 *
 * Pointer capture keeps the drag alive when the cursor outruns the 4px handle,
 * which is otherwise very easy to do.
 */
function RailResizer() {
  const setRailWidth = useUIStore((s) => s.setRailWidth);
  const railWidth = useUIStore((s) => s.railWidth);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      setRailWidth(event.clientX);
    },
    [setRailWidth],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    draggingRef.current = false;
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step = event.shiftKey ? 40 : 12;
      const current = useUIStore.getState().railWidth;
      if (event.key === 'ArrowLeft') setRailWidth(current - step);
      else if (event.key === 'ArrowRight') setRailWidth(current + step);
      else return;
      event.preventDefault();
    },
    [setRailWidth],
  );

  return (
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions,
                      jsx-a11y/no-noninteractive-tabindex --
       A separator that exposes aria-valuenow and accepts arrow keys is a
       window splitter, which ARIA defines as a focusable widget. The rule
       treats every separator as decorative. */
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={MIN_RAIL_WIDTH}
      aria-valuemax={MAX_RAIL_WIDTH}
      aria-valuenow={railWidth}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
      className={cn(
        'absolute inset-y-0 -right-0.5 w-1 cursor-col-resize',
        'transition-colors duration-[120ms] hover:bg-accent focus-visible:bg-accent',
      )}
    />
  );
}
