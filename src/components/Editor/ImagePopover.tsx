import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { Trash2, Check, X, Image as ImageIcon } from 'lucide-react';

interface ImagePopoverProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  nodePos: number | null;
}

/**
 * Popover for editing images.
 * Supports editing URL, alt text, and removing the image.
 */
export function ImagePopover({ editor, isOpen, onClose, nodePos }: ImagePopoverProps) {
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const srcInputRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // Initialize from current image
  useEffect(() => {
    if (isOpen && nodePos !== null && editor) {
      const node = editor.state.doc.nodeAt(nodePos);
      if (node && node.type.name === 'image') {
        setSrc(node.attrs.src || '');
        setAlt(node.attrs.alt || '');
      }
      
      // Focus input after a tick
      setTimeout(() => {
        srcInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, nodePos, editor]);

  // Position near the image
  useEffect(() => {
    if (isOpen && nodePos !== null && editor) {
      const coords = editor.view.coordsAtPos(nodePos);
      
      refs.setReference({
        getBoundingClientRect() {
          return {
            width: 0,
            height: 0,
            x: coords.left,
            y: coords.top,
            top: coords.top,
            left: coords.left,
            right: coords.left,
            bottom: coords.top,
          };
        },
      });
    }
  }, [isOpen, nodePos, editor, refs]);

  const handleSave = useCallback(() => {
    if (!editor || nodePos === null) return;
    
    editor.chain()
      .focus()
      .setNodeSelection(nodePos)
      .updateAttributes('image', { src, alt })
      .run();
    
    onClose();
  }, [editor, nodePos, src, alt, onClose]);

  const handleRemove = useCallback(() => {
    if (!editor || nodePos === null) return;
    
    editor.chain()
      .focus()
      .setNodeSelection(nodePos)
      .deleteSelection()
      .run();
    
    onClose();
  }, [editor, nodePos, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [handleSave, onClose]);

  if (!isOpen || !editor) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- WAI-ARIA dialog is interactive; onKeyDown handles Enter-to-save and Escape-to-close
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="z-50 p-4 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg shadow-xl min-w-[320px]"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Edit image"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--theme-text-primary)]">
          <ImageIcon size={16} />
          Edit Image
        </div>
        <button
          onClick={onClose}
          className="p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] rounded"
        >
          <X size={14} />
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label htmlFor="image-popover-src" className="block text-xs text-[var(--theme-text-secondary)] mb-1">
            Image URL
          </label>
          <input
            id="image-popover-src"
            ref={srcInputRef}
            type="url"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--theme-bg-primary)] border border-[var(--theme-border)] rounded text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
            placeholder="https://example.com/image.png"
          />
        </div>
        
        <div>
          <label htmlFor="image-popover-alt" className="block text-xs text-[var(--theme-text-secondary)] mb-1">
            Alt Text
          </label>
          <input
            id="image-popover-alt"
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--theme-bg-primary)] border border-[var(--theme-border)] rounded text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
            placeholder="Describe the image"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[var(--theme-border)]">
        <button
          onClick={handleRemove}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 rounded"
        >
          <Trash2 size={14} />
          Remove
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--theme-accent)] text-white rounded hover:opacity-90"
        >
          <Check size={14} />
          Save
        </button>
      </div>
    </div>
  );
}
