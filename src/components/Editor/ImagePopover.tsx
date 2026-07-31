import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { Trash2, Check, X, Image as ImageIcon } from 'lucide-react';

interface ImagePopoverProps {
  editor: Editor;
  onClose: () => void;
  nodePos: number;
}

/**
 * Popover for editing images.
 *
 * Mounted only while open (the parent renders it conditionally), so src and
 * alt seed from lazy initialisers rather than being written in by an effect
 * that would render once showing the previously-selected image.
 */
export function ImagePopover({ editor, onClose, nodePos }: ImagePopoverProps) {
  const attrs = editor.state.doc.nodeAt(nodePos)?.attrs;
  const [src, setSrc] = useState<string>(() => attrs?.src ?? '');
  const [alt, setAlt] = useState<string>(() => attrs?.alt ?? '');
  const srcInputRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles } = useFloating({
    open: true,
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    srcInputRef.current?.focus();
  }, []);

  // Position near the image
  useEffect(() => {
    {
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
  }, [nodePos, editor, refs]);

  const handleSave = useCallback(() => {
    
    editor.chain()
      .focus()
      .setNodeSelection(nodePos)
      .updateAttributes('image', { src, alt })
      .run();
    
    onClose();
  }, [editor, nodePos, src, alt, onClose]);

  const handleRemove = useCallback(() => {
    
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

  return (
    // role="dialog" is interactive, and onKeyDown below handles Enter-to-save
    // and Escape-to-close.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      // `refs` is Floating UI's handle object, not a React ref: setFloating is
      // a stable callback and reading it in render is the documented usage.
      // eslint-disable-next-line react-hooks/refs
      ref={refs.setFloating}
      style={floatingStyles}
      className="z-50 p-4 bg-surface border border-line rounded-lg shadow-xl min-w-[320px]"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Edit image"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          <ImageIcon size={16} />
          Edit Image
        </div>
        <button
          onClick={onClose}
          className="p-1 text-ink-muted hover:text-ink rounded"
        >
          <X size={14} />
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label htmlFor="image-popover-src" className="block text-xs text-ink-muted mb-1">
            Image URL
          </label>
          <input
            id="image-popover-src"
            ref={srcInputRef}
            type="url"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            className="w-full px-3 py-2 bg-canvas border border-line rounded text-sm text-ink focus:outline-none focus:border-[var(--rmd-accent)]"
            placeholder="https://example.com/image.png"
          />
        </div>
        
        <div>
          <label htmlFor="image-popover-alt" className="block text-xs text-ink-muted mb-1">
            Alt Text
          </label>
          <input
            id="image-popover-alt"
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="w-full px-3 py-2 bg-canvas border border-line rounded text-sm text-ink focus:outline-none focus:border-[var(--rmd-accent)]"
            placeholder="Describe the image"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-line">
        <button
          onClick={handleRemove}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 rounded"
        >
          <Trash2 size={14} />
          Remove
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--rmd-accent)] text-white rounded hover:opacity-90"
        >
          <Check size={14} />
          Save
        </button>
      </div>
    </div>
  );
}
