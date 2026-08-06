import { useCallback, useEffect, useState } from 'react';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import type { Editor } from '@tiptap/react';
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Combine,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Table controls, shown while the cursor is inside a table.
 *
 * The overhaul removed the permanent table toolbar on the reasoning that
 * commands belong in the palette. That was wrong for tables specifically:
 * "delete this row" is a *spatial* action about the cell you are in, and
 * searching for it by name breaks the gesture. The first thing a user tried to
 * do with a table was remove a row, and there was no way to do it at all.
 *
 * So it comes back — but contextually, appearing only over the table being
 * edited rather than occupying the chrome permanently.
 */

interface TableToolbarProps {
  editor: Editor;
}

/**
 * The DOM element of the table containing the selection, or null.
 *
 * Resolved by walking the ProseMirror node hierarchy rather than by taking
 * `domAtPos().node.closest('table')`. At a node boundary — the very start of a
 * table is one — `domAtPos` can resolve to the parent container with an
 * offset, or to the preceding sibling, so `closest` would climb to whichever
 * table happened to be *before* the cursor. That is precisely how the toolbar
 * ended up drawn over the table above the one being edited.
 */
function tableElementAt(editor: Editor): HTMLTableElement | null {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name !== 'table') continue;

    const dom = editor.view.nodeDOM($from.before(depth));
    if (!(dom instanceof HTMLElement)) return null;
    // TipTap wraps tables in a scrolling div, so the node DOM may be either.
    return dom instanceof HTMLTableElement ? dom : dom.querySelector('table');
  }

  return null;
}

export function TableToolbar({ editor }: TableToolbarProps) {
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  /**
   * The anchor, held as state rather than derived at position time.
   *
   * This is what makes moving between two tables reposition the toolbar. The
   * effect below previously depended only on a boolean `visible`, which does
   * not change when the cursor leaves one table for another — so the position
   * was computed once and never revisited, and the toolbar stayed behind on
   * the first table until some unrelated event forced a recompute.
   */
  const [table, setTable] = useState<HTMLTableElement | null>(null);

  const sync = useCallback(() => {
    const active = editor.isActive('table') && editor.view.hasFocus();
    const next = active ? tableElementAt(editor) : null;
    // Compared by identity: React bails out when the element is the same, so
    // moving between cells of one table costs nothing.
    setTable(next);
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', sync);
    editor.on('transaction', sync);
    editor.on('focus', sync);
    editor.on('blur', sync);

    return () => {
      editor.off('selectionUpdate', sync);
      editor.off('transaction', sync);
      editor.off('focus', sync);
      editor.off('blur', sync);
    };
  }, [editor, sync]);

  // Anchor to the table element itself rather than the caret, so the toolbar
  // stays put while moving between cells of the same table.
  useEffect(() => {
    if (!table || !toolbar) return;

    const update = () => {
      void computePosition(table, toolbar, {
        placement: 'top-start',
        middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        toolbar.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      });
    };

    update();
    // Watch the table, not the editor. Observing the editor element meant the
    // only thing that ever triggered a recompute was a scroll event — which is
    // why a mispositioned toolbar appeared to fix itself when the page moved.
    return autoUpdate(table, toolbar, update);
  }, [table, toolbar]);

  if (!table) return null;

  return (
    <div
      ref={setToolbar}
      role="toolbar"
      aria-label="Table"
      // Keep focus in the document; losing it would collapse the cell
      // selection these buttons act on.
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        'fixed top-0 left-0 z-[60] flex items-center gap-0.5 rounded-lg',
        'border border-line bg-overlay p-1 shadow-lg',
        'animate-[menu-in_120ms_ease-out]',
      )}
    >
      <Action
        icon={<ArrowUpToLine size={14} />}
        label="Insert row above"
        onPress={() => editor.chain().focus().addRowBefore().run()}
      />
      <Action
        icon={<ArrowDownToLine size={14} />}
        label="Insert row below"
        onPress={() => editor.chain().focus().addRowAfter().run()}
      />
      <Action
        icon={<Trash2 size={14} />}
        label="Delete row"
        onPress={() => editor.chain().focus().deleteRow().run()}
        danger
      />

      <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />

      <Action
        icon={<ArrowLeftToLine size={14} />}
        label="Insert column left"
        onPress={() => editor.chain().focus().addColumnBefore().run()}
      />
      <Action
        icon={<ArrowRightToLine size={14} />}
        label="Insert column right"
        onPress={() => editor.chain().focus().addColumnAfter().run()}
      />
      <Action
        icon={<Trash2 size={14} className="rotate-90" />}
        label="Delete column"
        onPress={() => editor.chain().focus().deleteColumn().run()}
        danger
      />

      <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />

      <Action
        icon={<Combine size={14} />}
        label="Merge or split cells"
        onPress={() => editor.chain().focus().mergeOrSplit().run()}
      />
      <Action
        icon={<Trash2 size={14} />}
        label="Delete table"
        onPress={() => editor.chain().focus().deleteTable().run()}
        danger
      />
    </div>
  );
}

function Action({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-7 place-items-center rounded-sm transition-colors',
        danger
          ? 'text-ink-muted hover:bg-danger-soft hover:text-danger'
          : 'text-ink-muted hover:bg-hover hover:text-ink',
      )}
    >
      {icon}
    </button>
  );
}
