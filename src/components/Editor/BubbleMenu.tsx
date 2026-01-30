import { useEffect, useRef, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Link, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  Quote,
  CheckSquare,
} from 'lucide-react';

interface BubbleMenuProps {
  editor: Editor | null;
  onLinkClick: () => void;
}

/**
 * Custom bubble menu that appears on text selection.
 * Positioned above the selection using DOM measurements.
 */
export function BubbleMenu({ editor, onLinkClick }: BubbleMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!editor || editor.state.selection.empty) {
      setIsVisible(false);
      return;
    }

    const { from, to } = editor.state.selection;
    
    // Don't show for node selections (images, etc.)
    if (from === to) {
      setIsVisible(false);
      return;
    }

    // Get the DOM coordinates of the selection
    const view = editor.view;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    // Position menu above the selection, centered
    const menuWidth = menuRef.current?.offsetWidth || 400;
    const left = Math.max(10, (start.left + end.left) / 2 - menuWidth / 2);
    const top = start.top - 50; // 50px above selection

    setPosition({ top, left });
    setIsVisible(true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    // Update on selection change
    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', () => setIsVisible(false));

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('blur', () => setIsVisible(false));
    };
  }, [editor, updatePosition]);

  if (!editor || !isVisible) return null;

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors ${
      isActive 
        ? 'bg-[var(--theme-accent)] text-white' 
        : 'text-[var(--theme-text-secondary)]'
    }`;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 50,
      }}
      className="flex items-center gap-1 p-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg shadow-lg"
    >
      {/* Text formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive('bold'))}
        title="Bold (Ctrl+B)"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive('italic'))}
        title="Italic (Ctrl+I)"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={buttonClass(editor.isActive('strike'))}
        title="Strikethrough"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Strikethrough size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={buttonClass(editor.isActive('code'))}
        title="Inline Code (Ctrl+`)"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Code size={16} />
      </button>
      
      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />
      
      {/* Headings */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 1 }))}
        title="Heading 1 (Ctrl+1)"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Heading1 size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 2 }))}
        title="Heading 2 (Ctrl+2)"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Heading2 size={16} />
      </button>
      
      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />
      
      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive('bulletList'))}
        title="Bullet List"
        onMouseDown={(e) => e.preventDefault()}
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor.isActive('orderedList'))}
        title="Numbered List"
        onMouseDown={(e) => e.preventDefault()}
      >
        <ListOrdered size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={buttonClass(editor.isActive('taskList'))}
        title="Task List (Ctrl+Shift+X)"
        onMouseDown={(e) => e.preventDefault()}
      >
        <CheckSquare size={16} />
      </button>
      
      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />
      
      {/* Blockquote */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={buttonClass(editor.isActive('blockquote'))}
        title="Blockquote"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Quote size={16} />
      </button>
      
      <div className="w-px h-6 bg-[var(--theme-border)] mx-1" />
      
      {/* Link */}
      <button
        onClick={onLinkClick}
        className={buttonClass(editor.isActive('link'))}
        title="Add Link (Ctrl+K)"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Link size={16} />
      </button>
    </div>
  );
}
