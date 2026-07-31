import { useCallback, useEffect, useState } from 'react';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Pilcrow,
  Quote,
  SquareCode,
  Strikethrough,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Selection toolbar.
 *
 * With the persistent formatting toolbar gone, this is where formatting lives:
 * it appears over a selection and nowhere else, so the chrome above the
 * document stays empty while you read.
 *
 * Positioned with Floating UI against a virtual reference derived from the
 * selection rectangle. The previous implementation subtracted a hardcoded
 * 50px, which put the menu off-screen for a selection near the top of the
 * viewport; `flip` handles that case properly.
 */

interface BubbleMenuProps {
  editor: Editor;
  onLinkClick: () => void;
}

export function BubbleMenu({ editor, onLinkClick }: BubbleMenuProps) {
  const [menu, setMenu] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);

  const sync = useCallback(() => {
    const { state, view } = editor;
    const { empty, from, to } = state.selection;

    // Hide for an empty selection, and inside code blocks where none of these
    // marks apply.
    if (empty || from === to || !view.hasFocus() || editor.isActive('codeBlock')) {
      setVisible(false);
      setBlockMenuOpen(false);
      return;
    }

    setVisible(true);
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', sync);
    editor.on('transaction', sync);
    editor.on('blur', sync);
    editor.on('focus', sync);

    return () => {
      editor.off('selectionUpdate', sync);
      editor.off('transaction', sync);
      editor.off('blur', sync);
      editor.off('focus', sync);
    };
  }, [editor, sync]);

  // Track the selection rectangle while visible.
  useEffect(() => {
    if (!visible || !menu) return;

    const reference = {
      getBoundingClientRect: () => {
        const { from, to } = editor.state.selection;
        const start = editor.view.coordsAtPos(from);
        const end = editor.view.coordsAtPos(to);
        const top = Math.min(start.top, end.top);
        const bottom = Math.max(start.bottom, end.bottom);
        const left = Math.min(start.left, end.left);
        const right = Math.max(start.right, end.right);
        return new DOMRect(left, top, right - left, bottom - top);
      },
    };

    const update = () => {
      void computePosition(reference, menu, {
        placement: 'top',
        middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        menu.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      });
    };

    update();
    return autoUpdate(editor.view.dom, menu, update);
  }, [visible, menu, editor]);

  if (!visible) return null;

  return (
    <div
      ref={setMenu}
      role="toolbar"
      aria-label="Formatting"
      // Keep focus in the document: losing it would collapse the selection
      // these buttons are about to act on.
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        'fixed top-0 left-0 z-[60] flex items-center gap-0.5 rounded-lg',
        'border border-line bg-overlay p-1 shadow-lg',
        'animate-[menu-in_120ms_ease-out]',
      )}
    >
      <BlockTypeMenu
        editor={editor}
        open={blockMenuOpen}
        onOpenChange={setBlockMenuOpen}
      />

      <Divider />

      <MarkButton
        editor={editor}
        icon={<Bold size={14} />}
        label="Bold"
        shortcut="Ctrl+B"
        isActive={editor.isActive('bold')}
        onPress={() => editor.chain().focus().toggleBold().run()}
      />
      <MarkButton
        editor={editor}
        icon={<Italic size={14} />}
        label="Italic"
        shortcut="Ctrl+I"
        isActive={editor.isActive('italic')}
        onPress={() => editor.chain().focus().toggleItalic().run()}
      />
      <MarkButton
        editor={editor}
        icon={<Strikethrough size={14} />}
        label="Strikethrough"
        isActive={editor.isActive('strike')}
        onPress={() => editor.chain().focus().toggleStrike().run()}
      />
      <MarkButton
        editor={editor}
        icon={<Code size={14} />}
        label="Inline code"
        isActive={editor.isActive('code')}
        onPress={() => editor.chain().focus().toggleCode().run()}
      />

      <Divider />

      <MarkButton
        editor={editor}
        icon={<LinkIcon size={14} />}
        label="Link"
        shortcut="Ctrl+K"
        isActive={editor.isActive('link')}
        onPress={onLinkClick}
      />
    </div>
  );
}

/* ── Block type ──────────────────────────────────────────────────────────── */

const BLOCK_TYPES = [
  { id: 'paragraph', label: 'Text', icon: Pilcrow },
  { id: 'h1', label: 'Heading 1', icon: Heading1 },
  { id: 'h2', label: 'Heading 2', icon: Heading2 },
  { id: 'h3', label: 'Heading 3', icon: Heading3 },
  { id: 'bulletList', label: 'Bullet list', icon: List },
  { id: 'orderedList', label: 'Numbered list', icon: ListOrdered },
  { id: 'taskList', label: 'Task list', icon: ListChecks },
  { id: 'blockquote', label: 'Quote', icon: Quote },
  { id: 'codeBlock', label: 'Code block', icon: SquareCode },
] as const;

type BlockTypeId = (typeof BLOCK_TYPES)[number]['id'];

function BlockTypeMenu({
  editor,
  open,
  onOpenChange,
}: {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const current = currentBlockType(editor);
  const active = BLOCK_TYPES.find((type) => type.id === current) ?? BLOCK_TYPES[0];
  const Icon = active.icon;

  const apply = (id: BlockTypeId): void => {
    const chain = editor.chain().focus();
    switch (id) {
      case 'paragraph':
        chain.setParagraph().run();
        break;
      case 'h1':
        chain.toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        chain.toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        chain.toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        chain.toggleBulletList().run();
        break;
      case 'orderedList':
        chain.toggleOrderedList().run();
        break;
      case 'taskList':
        chain.toggleTaskList().run();
        break;
      case 'blockquote':
        chain.toggleBlockquote().run();
        break;
      case 'codeBlock':
        chain.toggleCodeBlock().run();
        break;
    }
    onOpenChange(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-7 items-center gap-1 rounded-sm px-1.5 text-sm text-ink-muted hover:bg-hover hover:text-ink"
      >
        <Icon size={14} aria-hidden />
        <span className="max-w-24 truncate">{active.label}</span>
        <ChevronDown size={11} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full left-0 z-10 mt-1 w-44 rounded-lg border border-line',
            'bg-overlay py-1 shadow-lg animate-[menu-in_120ms_ease-out]',
          )}
        >
          {BLOCK_TYPES.map(({ id, label, icon: ItemIcon }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => apply(id)}
              className={cn(
                'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm',
                id === current ? 'text-accent' : 'text-ink-muted hover:bg-hover hover:text-ink',
              )}
            >
              <ItemIcon size={13} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function currentBlockType(editor: Editor): BlockTypeId {
  if (editor.isActive('heading', { level: 1 })) return 'h1';
  if (editor.isActive('heading', { level: 2 })) return 'h2';
  if (editor.isActive('heading', { level: 3 })) return 'h3';
  if (editor.isActive('taskList')) return 'taskList';
  if (editor.isActive('bulletList')) return 'bulletList';
  if (editor.isActive('orderedList')) return 'orderedList';
  if (editor.isActive('blockquote')) return 'blockquote';
  if (editor.isActive('codeBlock')) return 'codeBlock';
  return 'paragraph';
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function MarkButton({
  icon,
  label,
  shortcut,
  isActive,
  onPress,
}: {
  editor: Editor;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={isActive}
      title={shortcut ? `${label} — ${shortcut}` : label}
      className={cn(
        'grid size-7 place-items-center rounded-sm transition-colors',
        isActive ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-hover hover:text-ink',
      )}
    >
      {icon}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />;
}
