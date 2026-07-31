import { cn } from '@/utils/cn';
import type { OutlineItem } from '@/hooks/useOutline';

interface OutlinePanelProps {
  items: OutlineItem[];
  activeId: string | null;
  onSelect: (item: OutlineItem) => void;
}

/**
 * Document outline.
 *
 * Indentation is normalised against the shallowest heading present, so a
 * document whose top level is h2 — which most AI transcripts are, the h1 being
 * the title — doesn't render with a wasted indent step.
 */
export function OutlinePanel({ items, activeId, onSelect }: OutlinePanelProps) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-sm leading-relaxed text-ink-faint">
        No headings yet. They'll appear here as you add them.
      </p>
    );
  }

  const baseLevel = Math.min(...items.map((item) => item.level));

  return (
    <nav aria-label="Document outline" className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
      <ul role="list">
        {items.map((item) => {
          const indent = Math.min(item.level - baseLevel, 3);
          const isActive = item.id === activeId;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                aria-current={isActive ? 'location' : undefined}
                style={{ paddingLeft: `${indent * 12 + 10}px` }}
                className={cn(
                  'relative flex w-full items-center rounded-sm py-1 pr-2 text-left text-sm',
                  'transition-colors duration-[120ms]',
                  isActive
                    ? 'font-medium text-accent'
                    : indent === 0
                      ? 'text-ink hover:bg-hover'
                      : 'text-ink-muted hover:bg-hover hover:text-ink',
                )}
              >
                {isActive && (
                  <span
                    className="absolute top-1 bottom-1 left-0 w-0.5 rounded-full bg-accent"
                    aria-hidden
                  />
                )}
                <span className="truncate">{item.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
