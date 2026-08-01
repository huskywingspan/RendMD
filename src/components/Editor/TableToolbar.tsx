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

export function TableToolbar({ editor }: TableToolbarProps) {
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const sync = useCallback(() => {
    setVisible(editor.isActive('table') && editor.view.hasFocus());
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
  // stays put while moving between cells.
  useEffect(() => {
    if (!visible || !toolbar) return;

    const reference = {
      getBoundingClientRect: () => {
        const node = editor.view.domAtPos(editor.state.selection.from).node;
        const element = node instanceof HTMLElement ? node : node.parentElement;
        const table = element?.closest('table');
        return (table ?? editor.view.dom).getBoundingClientRect();
      },
    };

    const update = () => {
      void computePosition(reference, toolbar, {
        placement: 'top-start',
        middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        toolbar.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      });
    };

    update();
    return autoUpdate(editor.view.dom, toolbar, update);
  }, [visible, toolbar, editor]);

  if (!visible) return null;

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
