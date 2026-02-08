import { useState, useCallback, useMemo } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import type { TOCItem } from '@/types';
import { cn } from '@/utils/cn';
import { List, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

interface TOCPanelProps {
  onItemClick: (item: TOCItem) => void;
}

const indentClass: Record<number, string> = {
  1: 'pl-0',
  2: 'pl-4',
  3: 'pl-8',
  4: 'pl-12',
};

function getIndentClass(level: number): string {
  return indentClass[level] ?? 'pl-12';
}

function getTextClass(level: number): string {
  if (level === 1) return 'text-sm font-semibold';
  if (level === 2) return 'text-sm font-medium';
  return 'text-xs';
}

/**
 * Determine which items have children (any subsequent item at a deeper level
 * before the next item at the same or shallower level).
 */
function getParentIds(items: TOCItem[]): Set<string> {
  const parents = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const next = items[i + 1];
    if (next && next.level > items[i].level) {
      parents.add(items[i].id);
    }
  }
  return parents;
}

/**
 * Given a set of collapsed item IDs, compute the set of items that should be hidden.
 * An item is hidden if any ancestor in the flat list is collapsed.
 */
function getHiddenIds(items: TOCItem[], collapsedIds: Set<string>): Set<string> {
  const hidden = new Set<string>();
  // Stack of collapsed ancestor levels — if we're "inside" a collapsed heading,
  // everything at a deeper level is hidden until we reach same-or-shallower.
  let collapsedLevel: number | null = null;

  for (const item of items) {
    // If we hit an item at the same or shallower level as the collapsed ancestor, exit collapse
    if (collapsedLevel !== null && item.level <= collapsedLevel) {
      collapsedLevel = null;
    }

    if (collapsedLevel !== null) {
      hidden.add(item.id);
      continue;
    }

    // If this item is itself collapsed, start hiding its children
    if (collapsedIds.has(item.id)) {
      collapsedLevel = item.level;
    }
  }

  return hidden;
}

export function TOCPanel({ onItemClick }: TOCPanelProps): React.ReactElement {
  const tocItems = useEditorStore((s) => s.tocItems);
  const activeTocId = useEditorStore((s) => s.activeTocId);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const parentIds = useMemo(() => getParentIds(tocItems), [tocItems]);
  const hiddenIds = useMemo(() => getHiddenIds(tocItems, collapsedIds), [tocItems, collapsedIds]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedIds(new Set(parentIds));
  }, [parentIds]);

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  if (tocItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-[var(--theme-text-muted)]">
        <List size={24} strokeWidth={1.5} />
        <span className="text-xs">No headings found</span>
      </div>
    );
  }

  const allCollapsed = parentIds.size > 0 && parentIds.size === collapsedIds.size;

  return (
    <div className="flex flex-col gap-0.5 py-1">
      {/* Collapse/Expand all toggle */}
      {parentIds.size > 0 && (
        <button
          type="button"
          onClick={allCollapsed ? expandAll : collapseAll}
          className="flex items-center gap-1.5 px-2 py-1 mb-1 text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-colors rounded hover:bg-[var(--theme-bg-tertiary)]"
          title={allCollapsed ? 'Expand all' : 'Collapse all'}
        >
          {allCollapsed ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
          <span>{allCollapsed ? 'Expand all' : 'Collapse all'}</span>
        </button>
      )}

      <nav className="flex flex-col gap-0.5">
        {tocItems.map((item) => {
          if (hiddenIds.has(item.id)) return null;

          const isActive = item.id === activeTocId;
          const isParent = parentIds.has(item.id);
          const isCollapsed = collapsedIds.has(item.id);

          return (
            <div key={item.id} className={cn('flex items-center', getIndentClass(item.level))}>
              {/* Collapse toggle */}
              {isParent ? (
                <button
                  type="button"
                  onClick={() => toggleCollapse(item.id)}
                  className="flex-shrink-0 p-1.5 -m-0.5 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-all"
                  aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                >
                  <ChevronRight
                    size={14}
                    className={cn('transition-transform', !isCollapsed && 'rotate-90')}
                  />
                </button>
              ) : (
                <span className="w-[22px] flex-shrink-0" />
              )}

              {/* Heading label */}
              <button
                type="button"
                onClick={() => onItemClick(item)}
                className={cn(
                  'flex-1 min-w-0 text-left rounded px-1.5 py-1 transition-colors truncate',
                  getTextClass(item.level),
                  item.level === 2 && 'border-l-2 border-[var(--theme-border)]',
                  item.level >= 3 && 'border-l border-[var(--theme-text-muted)]/30',
                  isActive
                    ? 'bg-[var(--theme-accent-primary)]/15 text-[var(--theme-text-primary)]'
                    : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]'
                )}
              >
                {item.text}
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
