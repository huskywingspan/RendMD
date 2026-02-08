import { useEffect, useRef, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { Tooltip } from '@/components/UI/Tooltip';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Link, 
  Heading1, 
  Heading2,
  Heading3, 
  List, 
  ListOrdered,
  Quote,
  CheckSquare,
  Image,
} from 'lucide-react';

interface BubbleMenuProps {
  editor: Editor | null;
  onLinkClick: () => void;
  onImageClick?: () => void;
  forceVisible?: boolean;
}

/**
 * Custom bubble menu that appears on text selection or via Ctrl+Space.
 * Positioned above the selection/cursor using DOM measurements.
 */
export function BubbleMenu({ editor, onLinkClick, onImageClick, forceVisible = false }: BubbleMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Disable bubble menu on touch devices — toolbar covers all formatting
  const isTouchDevice = typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  if (isTouchDevice) return null;

  const updatePosition = useCallback(() => {
    if (!editor) {
      setIsVisible(false);
      return;
    }

    const { from, to } = editor.state.selection;
    
    // For force visible mode, position at cursor even without selection
    if (forceVisible) {
      const view = editor.view;
      const coords = view.coordsAtPos(from);
      const menuWidth = menuRef.current?.offsetWidth || 400;
      const left = Math.max(10, coords.left - menuWidth / 2);
      const top = coords.top - 50;
      setPosition({ top, left });
      return; // Don't set isVisible, we use shouldShow instead
    }

    // Normal mode: require text selection
    if (editor.state.selection.empty || from === to) {
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
  }, [editor, forceVisible]);

  // Update position when forceVisible changes
  useEffect(() => {
    if (forceVisible && editor) {
      updatePosition();
    }
  }, [forceVisible, editor, updatePosition]);

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

  // Show if forced visible (Ctrl+Space) or has text selection
  const shouldShow = forceVisible || isVisible;
  if (!editor || !shouldShow) return null;

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
      <Tooltip content="Bold (Ctrl+B)" position="top">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={buttonClass(editor.isActive('bold'))}
          aria-label="Bold (Ctrl+B)"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Bold size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Italic (Ctrl+I)" position="top">
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={buttonClass(editor.isActive('italic'))}
          aria-label="Italic (Ctrl+I)"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Italic size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Strikethrough" position="top">
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={buttonClass(editor.isActive('strike'))}
          aria-label="Strikethrough"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Strikethrough size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Inline Code (Ctrl+`)" position="top">
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
      <Tooltip content="Heading 1 (Ctrl+1)" position="top">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 1 }))}
          aria-label="Heading 1"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Heading1 size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Heading 2 (Ctrl+2)" position="top">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={buttonClass(editor.isActive('heading', { level: 2 }))}
          aria-label="Heading 2"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Heading2 size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Heading 3 (Ctrl+3)" position="top">
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
      <Tooltip content="Bullet List" position="top">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={buttonClass(editor.isActive('bulletList'))}
          aria-label="Bullet List"
          onMouseDown={(e) => e.preventDefault()}
        >
          <List size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Numbered List" position="top">
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={buttonClass(editor.isActive('orderedList'))}
          aria-label="Numbered List"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ListOrdered size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Task List (Ctrl+Shift+X)" position="top">
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
      <Tooltip content="Blockquote" position="top">
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
      <Tooltip content="Add Link (Ctrl+K)" position="top">
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
        <Tooltip content="Insert Image (Ctrl+Shift+I)" position="top">
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
    </div>
  );
}
