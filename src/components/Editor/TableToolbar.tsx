import { useCallback, useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Table2, 
  Plus, 
  Minus, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Trash2 
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface TableToolbarProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

function ToolbarButton({ onClick, icon, label, disabled, variant = 'default' }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === 'danger' 
          ? "text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
          : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-hover)] hover:text-[var(--theme-text-primary)]"
      )}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * Check if the cursor is in a header cell by walking up the DOM
 * This is more reliable than isActive('tableHeader') which can be inconsistent
 */
function isInHeaderCell(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  
  // Walk up to find if we're in a tableHeader node
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'tableHeader') {
      return true;
    }
    if (node.type.name === 'tableCell') {
      return false;
    }
  }
  return false;
}

/**
 * Get the number of columns in the current table
 */
function getTableColumnCount(editor: Editor): number {
  const { $from } = editor.state.selection;
  
  // Find the table node
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'table') {
      // Get the first row to count columns
      const firstRow = node.firstChild;
      if (firstRow && firstRow.type.name === 'tableRow') {
        return firstRow.childCount;
      }
      return 0;
    }
  }
  return 0;
}

/**
 * TableToolbar - Contextual toolbar for table operations
 * 
 * Shows "Insert Table" when not in a table.
 * Shows row/column operations when cursor is in a table.
 */
export function TableToolbar({ editor }: TableToolbarProps): JSX.Element | null {
  // Force re-render on editor selection/transaction changes
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    if (!editor) return;
    
    // Subscribe to selection and transaction updates
    const handleUpdate = () => {
      forceUpdate(n => n + 1);
    };
    
    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);
    
    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('transaction', handleUpdate);
    };
  }, [editor]);

  // All hooks must be called unconditionally (before any early returns)
  const insertTable = useCallback(() => {
    // Don't insert nested tables - GFM doesn't support them
    if (editor && !editor.isActive('table')) {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    }
  }, [editor]);

  const addRowBefore = useCallback(() => {
    editor?.chain().focus().addRowBefore().run();
  }, [editor]);

  const addRowAfter = useCallback(() => {
    editor?.chain().focus().addRowAfter().run();
  }, [editor]);

  const deleteRow = useCallback(() => {
    if (!editor) return;
    
    // Don't delete if we're in header row - GFM tables require a header
    if (isInHeaderCell(editor)) return;
    
    // Check if we can safely delete
    if (editor.can().deleteRow()) {
      editor.chain().focus().deleteRow().fixTables().run();
    }
  }, [editor]);

  const addColumnBefore = useCallback(() => {
    editor?.chain().focus().addColumnBefore().run();
  }, [editor]);

  const addColumnAfter = useCallback(() => {
    editor?.chain().focus().addColumnAfter().run();
  }, [editor]);

  const deleteColumn = useCallback(() => {
    // Check if we can safely delete (need more than 1 column)
    if (editor?.can().deleteColumn()) {
      // Delete column and fix any table inconsistencies
      editor.chain().focus().deleteColumn().fixTables().run();
    }
  }, [editor]);

  const deleteTable = useCallback(() => {
    editor?.chain().focus().deleteTable().run();
  }, [editor]);

  // Early return after hooks
  if (!editor) return null;

  // Compute table state fresh on every render (we're now re-rendering on selection change)
  const isInTable = editor.isActive('table');
  const inHeaderCell = isInTable && isInHeaderCell(editor);
  const columnCount = isInTable ? getTableColumnCount(editor) : 0;
  const canDeleteRow = isInTable && editor.can().deleteRow() && !inHeaderCell;
  // Need more than 1 column to delete
  const canDeleteColumn = isInTable && editor.can().deleteColumn() && columnCount > 1;
  // Can't add row above header - GFM requires header to be first row
  const canAddRowBefore = isInTable && !inHeaderCell;

  // When not in a table, show insert button
  if (!isInTable) {
    return (
      <div className="table-toolbar flex items-center gap-1 p-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg">
        <ToolbarButton
          onClick={insertTable}
          icon={<Table2 size={14} />}
          label="Insert Table"
        />
      </div>
    );
  }

  // When in a table, show editing controls
  return (
    <div className="table-toolbar flex items-center gap-1 p-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg flex-wrap">
      {/* Row operations */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-[var(--theme-border-primary)]">
        <span className="text-xs text-[var(--theme-text-muted)] px-1">Row:</span>
        <ToolbarButton
          onClick={addRowBefore}
          icon={<><Plus size={12} /><ArrowUp size={12} /></>}
          label="Add Above"
          disabled={!canAddRowBefore}
        />
        <ToolbarButton
          onClick={addRowAfter}
          icon={<><Plus size={12} /><ArrowDown size={12} /></>}
          label="Add Below"
        />
        <ToolbarButton
          onClick={deleteRow}
          icon={<Minus size={14} />}
          label="Delete Row"
          variant="danger"
          disabled={!canDeleteRow}
        />
      </div>

      {/* Column operations */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-[var(--theme-border-primary)]">
        <span className="text-xs text-[var(--theme-text-muted)] px-1">Column:</span>
        <ToolbarButton
          onClick={addColumnBefore}
          icon={<><Plus size={12} /><ArrowLeft size={12} /></>}
          label="Add Left"
        />
        <ToolbarButton
          onClick={addColumnAfter}
          icon={<><Plus size={12} /><ArrowRight size={12} /></>}
          label="Add Right"
        />
        <ToolbarButton
          onClick={deleteColumn}
          icon={<Minus size={14} />}
          label="Delete Column"
          variant="danger"
          disabled={!canDeleteColumn}
        />
      </div>

      {/* Table operations */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={deleteTable}
          icon={<Trash2 size={14} />}
          label="Delete Table"
          variant="danger"
        />
      </div>
    </div>
  );
}
