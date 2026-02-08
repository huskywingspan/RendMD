import { useCallback, useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link,
  Image,
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
  AlignRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/UI/Tooltip';
import { TableGridPicker } from './TableGridPicker';

export interface EditorToolbarProps {
  editor: Editor | null;
  onLinkClick: () => void;
  onImageClick?: () => void;
}

/** Reusable toolbar icon button */
function ToolbarButton({
  onClick,
  icon,
  label,
  disabled = false,
  variant = 'default',
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
        disabled && 'opacity-40 cursor-not-allowed',
        variant === 'danger'
          ? 'text-red-500 hover:bg-red-500/10 hover:text-red-600'
          : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-hover)] hover:text-[var(--theme-text-primary)]',
      )}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** Check if cursor is inside a table header cell */
function isInHeaderCell(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth >= 0; depth--) {
    if ($from.node(depth).type.name === 'tableHeader') return true;
  }
  return false;
}

/** Get column count for the current table */
function getTableColumnCount(editor: Editor): number {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'table') {
      const firstRow = node.firstChild;
      return firstRow ? firstRow.childCount : 0;
    }
  }
  return 0;
}

export function EditorToolbar({ editor, onLinkClick, onImageClick }: EditorToolbarProps): JSX.Element | null {
  if (!editor) return null;

  // ── Formatting button active state helper ──────────────────────
  const buttonClass = (isActive: boolean): string =>
    cn(
      'p-2 rounded transition-colors',
      isActive
        ? 'bg-[var(--theme-accent)] text-white'
        : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]',
    );

  const isInTable = editor.isActive('table');

  if (isInTable) {
    return <TableControls editor={editor} />;
  }

  return (
    <div className="editor-toolbar flex items-center gap-1 overflow-x-auto scrollbar-none md:flex-wrap md:overflow-x-visible">
      {/* Text formatting */}
      <Tooltip content="Bold (Ctrl+B)" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive('bold'))}
          aria-label="Bold (Ctrl+B)"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Bold size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Italic (Ctrl+I)" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive('italic'))}
          aria-label="Italic (Ctrl+I)"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Italic size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Strikethrough" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={buttonClass(editor.isActive('strike'))}
          aria-label="Strikethrough"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Strikethrough size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Inline Code (Ctrl+`)" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={buttonClass(editor.isActive('code'))}
          aria-label="Inline Code"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Code size={16} />
        </button>
      </Tooltip>

      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />

      {/* Headings */}
      <Tooltip content="Heading 1 (Ctrl+1)" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 1 }))}
          aria-label="Heading 1"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Heading1 size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Heading 2 (Ctrl+2)" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 2 }))}
          aria-label="Heading 2"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Heading2 size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Heading 3 (Ctrl+3)" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 3 }))}
          aria-label="Heading 3"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Heading3 size={16} />
        </button>
      </Tooltip>

      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />

      {/* Lists */}
      <Tooltip content="Bullet List" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass(editor.isActive('bulletList'))}
          aria-label="Bullet List"
          onMouseDown={(e) => e.preventDefault()}
        >
          <List size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Numbered List" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass(editor.isActive('orderedList'))}
          aria-label="Numbered List"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ListOrdered size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Task List (Ctrl+Shift+X)" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={buttonClass(editor.isActive('taskList'))}
          aria-label="Task List"
          onMouseDown={(e) => e.preventDefault()}
        >
          <CheckSquare size={16} />
        </button>
      </Tooltip>

      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />

      {/* Blockquote */}
      <Tooltip content="Blockquote" position="bottom">
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={buttonClass(editor.isActive('blockquote'))}
          aria-label="Blockquote"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Quote size={16} />
        </button>
      </Tooltip>

      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />

      {/* Link */}
      <Tooltip content="Add Link (Ctrl+K)" position="bottom">
        <button
          onClick={onLinkClick}
          className={buttonClass(editor.isActive('link'))}
          aria-label="Add Link"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Link size={16} />
        </button>
      </Tooltip>

      {/* Image */}
      {onImageClick && (
        <Tooltip content="Insert Image (Ctrl+Shift+I)" position="bottom">
          <button
            onClick={onImageClick}
            className={buttonClass(false)}
            aria-label="Insert Image"
            onMouseDown={(e) => e.preventDefault()}
          >
            <Image size={16} />
          </button>
        </Tooltip>
      )}

      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />

      {/* Table insert */}
      <TableInsertButton editor={editor} />

      {/* Hint — hidden on touch devices */}
      <span className="hidden md:inline-flex ml-auto text-xs text-[var(--theme-text-muted)] select-none">
        Ctrl+Space for inline menu
      </span>
    </div>
  );
}

// ── Table insert button with grid picker ──────────────────────────

function TableInsertButton({ editor }: { editor: Editor }): JSX.Element {
  const [showGridPicker, setShowGridPicker] = useState(false);
  const gridPickerButtonRef = useRef<HTMLButtonElement>(null);

  const handleGridSelect = useCallback(
    (rows: number, cols: number) => {
      editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      setShowGridPicker(false);
    },
    [editor],
  );

  const handleGridClose = useCallback(() => setShowGridPicker(false), []);

  // Close grid picker on outside click
  useEffect(() => {
    if (!showGridPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (
        gridPickerButtonRef.current &&
        !gridPickerButtonRef.current.contains(e.target as Node)
      ) {
        setShowGridPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showGridPicker]);

  return (
    <div className="relative">
      <Tooltip content="Insert Table" position="bottom">
        <button
          ref={gridPickerButtonRef}
          onClick={() => setShowGridPicker(!showGridPicker)}
          className={cn(
            'flex items-center gap-1 p-2 rounded transition-colors',
            'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]',
            showGridPicker && 'bg-[var(--theme-bg-tertiary)]',
          )}
          aria-label="Insert Table"
          aria-expanded={showGridPicker}
          aria-haspopup="true"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Table2 size={16} />
          <ChevronDown
            size={12}
            className={cn('transition-transform', showGridPicker && 'rotate-180')}
          />
        </button>
      </Tooltip>

      {showGridPicker && (
        <div className="absolute top-full mt-1 z-50 right-0 sm:left-0 sm:right-auto">
          <TableGridPicker onSelect={handleGridSelect} onClose={handleGridClose} />
        </div>
      )}
    </div>
  );
}

// ── Table editing controls (shown when cursor is inside a table) ──

function TableControls({ editor }: { editor: Editor }): JSX.Element {
  // Force re-render on selection/transaction changes
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    editor.on('selectionUpdate', handler);
    editor.on('transaction', handler);
    return () => {
      editor.off('selectionUpdate', handler);
      editor.off('transaction', handler);
    };
  }, [editor]);

  const addRowBefore = useCallback(() => editor.chain().focus().addRowBefore().run(), [editor]);
  const addRowAfter = useCallback(() => editor.chain().focus().addRowAfter().run(), [editor]);
  const deleteRow = useCallback(() => editor.chain().focus().deleteRow().run(), [editor]);
  const addColumnBefore = useCallback(() => editor.chain().focus().addColumnBefore().run(), [editor]);
  const addColumnAfter = useCallback(() => editor.chain().focus().addColumnAfter().run(), [editor]);
  const deleteColumn = useCallback(() => editor.chain().focus().deleteColumn().run(), [editor]);
  const deleteTable = useCallback(() => editor.chain().focus().deleteTable().run(), [editor]);

  const setColumnAlignment = useCallback(
    (align: 'left' | 'center' | 'right') => {
      editor.chain().focus().setCellAttribute('textAlign', align).run();
    },
    [editor],
  );

  const getColumnAlignment = useCallback((): string => {
    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth >= 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        return (node.attrs.textAlign as string) || 'left';
      }
    }
    return 'left';
  }, [editor]);

  const inHeaderCell = isInHeaderCell(editor);
  const columnCount = getTableColumnCount(editor);
  const canDeleteRow = editor.can().deleteRow() && !inHeaderCell;
  const canDeleteColumn = editor.can().deleteColumn() && columnCount > 1;
  const canAddRowBefore = !inHeaderCell;

  return (
    <div className="editor-toolbar flex items-center gap-1 flex-wrap">
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
            'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
            getColumnAlignment() === 'left'
              ? 'bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]'
              : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-hover)] hover:text-[var(--theme-text-primary)]',
          )}
          title="Align Left"
          onMouseDown={(e) => e.preventDefault()}
        >
          <AlignLeft size={14} />
        </button>
        <button
          onClick={() => setColumnAlignment('center')}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
            getColumnAlignment() === 'center'
              ? 'bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]'
              : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-hover)] hover:text-[var(--theme-text-primary)]',
          )}
          title="Align Center"
          onMouseDown={(e) => e.preventDefault()}
        >
          <AlignCenter size={14} />
        </button>
        <button
          onClick={() => setColumnAlignment('right')}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
            getColumnAlignment() === 'right'
              ? 'bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]'
              : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-hover)] hover:text-[var(--theme-text-primary)]',
          )}
          title="Align Right"
          onMouseDown={(e) => e.preventDefault()}
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
