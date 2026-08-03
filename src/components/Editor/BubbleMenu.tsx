import { useCallback, useEffect, useState } from 'react';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import type { Editor } from '@tiptap/react';
import { Bold, Code, Italic, Link as LinkIcon, Strikethrough } from 'lucide-react';
import { cn } from '@/utils/cn';
import { BlockTypeMenu, Divider, FormatButton } from './formatting';

/**
 * Selection toolbar.
 *
 * Appears over a selection and nowhere else. It is the fast path for
 * reformatting text you have already written; the format toolbar is the
 * discoverable path, and inserting blocks at a collapsed cursor is only
 * possible there, since this menu requires a selection to exist.
 *
 * Both surfaces share their controls — see ./formatting.
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
      <BlockTypeMenu editor={editor} open={blockMenuOpen} onOpenChange={setBlockMenuOpen} />

      <Divider />

      <FormatButton
        icon={<Bold size={14} />}
        label="Bold"
        shortcut="Ctrl+B"
        isActive={editor.isActive('bold')}
        onPress={() => editor.chain().focus().toggleBold().run()}
      />
      <FormatButton
        icon={<Italic size={14} />}
        label="Italic"
        shortcut="Ctrl+I"
        isActive={editor.isActive('italic')}
        onPress={() => editor.chain().focus().toggleItalic().run()}
      />
      <FormatButton
        icon={<Strikethrough size={14} />}
        label="Strikethrough"
        isActive={editor.isActive('strike')}
        onPress={() => editor.chain().focus().toggleStrike().run()}
      />
      <FormatButton
        icon={<Code size={14} />}
        label="Inline code"
        isActive={editor.isActive('code')}
        onPress={() => editor.chain().focus().toggleCode().run()}
      />

      <Divider />

      <FormatButton
        icon={<LinkIcon size={14} />}
        label="Link"
        shortcut="Ctrl+K"
        isActive={editor.isActive('link')}
        onPress={onLinkClick}
      />
    </div>
  );
}
