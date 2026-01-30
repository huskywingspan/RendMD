import { useCallback, useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Table2, 
  Plus, 
  Minus, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Trash2,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { TableGridPicker } from './TableGridPicker';

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
  const [showGridPicker, setShowGridPicker] = useState(false);
  const gridPickerButtonRef = useRef<HTMLButtonElement>(null);
  
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
  const insertTable = useCallback((rows: number = 3, cols: number = 3) => {
    // Don't insert nested tables - GFM doesn't support them
    if (editor && !editor.isActive('table')) {
      editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
    }
    setShowGridPicker(false);
  }, [editor]);

  const handleGridSelect = useCallback((rows: number, cols: number) => {
    insertTable(rows, cols);
  }, [insertTable]);

  const handleGridClose = useCallback(() => {
    setShowGridPicker(false);
  }, []);

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

  // Column alignment controls
  const setColumnAlignment = useCallback((align: 'left' | 'center' | 'right') => {
    if (!editor) return;
    editor.chain().focus().setCellAttribute('textAlign', align).run();
  }, [editor]);

  const getColumnAlignment = useCallback((): 'left' | 'center' | 'right' | null => {
    if (!editor) return null;
    // Check both tableCell and tableHeader attributes since cursor could be in either
    const cellAttrs = editor.getAttributes('tableCell');
    const headerAttrs = editor.getAttributes('tableHeader');
    return cellAttrs?.textAlign || headerAttrs?.textAlign || 'left';
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

  // When not in a table, show insert button with grid picker
  if (!isInTable) {
    return (
      <div className="table-toolbar flex items-center gap-1 p-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg relative">
        <button
          ref={gridPickerButtonRef}
          onClick={() => setShowGridPicker(!showGridPicker)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors",
            "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-hover)] hover:text-[var(--theme-text-primary)]",
            showGridPicker && "bg-[var(--theme-bg-hover)] text-[var(--theme-text-primary)]"
          )}
          title="Insert Table"
          aria-expanded={showGridPicker}
          aria-haspopup="true"
        >
          <Table2 size={14} />
          <span className="hidden sm:inline">Insert Table</span>
          <ChevronDown 
            size={12} 
            className={cn(
              "transition-transform",
              showGridPicker && "rotate-180"
            )}
          />
        </button>
        
        {showGridPicker && (
          <div className="absolute top-full left-0 mt-1 z-50">
            <TableGridPicker
              onSelect={handleGridSelect}
              onClose={handleGridClose}
            />
          </div>
        )}
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

      {/* Alignment operations */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-[var(--theme-border-primary)]">
        <span className="text-xs text-[var(--theme-text-muted)] px-1">Align:</span>
        <button
          onClick={() => setColumnAlignment('left')}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors",
            getColumnAlignment() === 'left'
              ? "bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]"
              : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-hover)] hover:text-[var(--theme-text-primary)]"
          )}
          title="Align Left"
        >
          <AlignLeft size={14} />
        </button>
        <button
          onClick={() => setColumnAlignment('center')}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors",
            getColumnAlignment() === 'center'
              ? "bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]"
              : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-hover)] hover:text-[var(--theme-text-primary)]"
          )}
          title="Align Center"
        >
          <AlignCenter size={14} />
        </button>
        <button
          onClick={() => setColumnAlignment('right')}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors",
            getColumnAlignment() === 'right'
              ? "bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]"
              : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-hover)] hover:text-[var(--theme-text-primary)]"
          )}
          title="Align Right"
        >
          <AlignRight size={14} />
        </button>
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
