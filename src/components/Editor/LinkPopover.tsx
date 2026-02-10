import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { ExternalLink, Trash2, Check, X } from 'lucide-react';

interface LinkPopoverProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Popover for editing links.
 * Supports editing URL, removing link, and opening in new tab.
 */
export function LinkPopover({ editor, isOpen, onClose }: LinkPopoverProps) {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // Initialize URL from current link or selection
  useEffect(() => {
    if (isOpen && editor) {
      const { href } = editor.getAttributes('link');
      setUrl(href || '');
      
      // Focus input after a tick
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, editor]);

  // Position the floating element near the selection
  useEffect(() => {
    if (isOpen && editor) {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      
      // Create a virtual reference element at the selection position
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
  }, [isOpen, editor, refs]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    onClose();
  }, [editor, url, onClose]);

  const handleRemove = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    onClose();
  }, [editor, onClose]);

  const handleOpen = useCallback(() => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [url]);

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
      aria-label="Edit link"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[var(--theme-text-primary)]">
          Edit Link
        </span>
        <button
          onClick={onClose}
          className="p-1 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] rounded"
        >
          <X size={14} />
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label htmlFor="link-popover-url" className="block text-xs text-[var(--theme-text-secondary)] mb-1">
            URL
          </label>
          <input
            id="link-popover-url"
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--theme-bg-primary)] border border-[var(--theme-border)] rounded text-sm text-[var(--theme-text-primary)] focus:outline-none focus:border-[var(--theme-accent)]"
            placeholder="https://example.com"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--theme-border)]">
        <button
          onClick={handleOpen}
          disabled={!url}
          className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ExternalLink size={14} />
          Open
        </button>
        
        <div className="flex items-center gap-2">
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
    </div>
  );
}
