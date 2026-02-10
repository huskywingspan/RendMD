import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AIPromptInputProps {
  onSend: (text: string) => void;
  onCancel?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
  className?: string;
}

export function AIPromptInput({
  onSend,
  onCancel,
  isStreaming = false,
  placeholder = 'Ask AI about your document...',
  className,
}: AIPromptInputProps): JSX.Element {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isStreaming && onCancel) {
          onCancel();
        } else {
          handleSend();
        }
      }
    },
    [handleSend, isStreaming, onCancel],
  );

  return (
    <div className={cn('flex items-end gap-2 p-3 border-t border-[var(--theme-border-primary)]', className)}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] px-3 py-2 text-sm text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent-primary)]"
        aria-label="Chat message input"
      />
      {isStreaming ? (
        <button
          onClick={onCancel}
          className="shrink-0 p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          aria-label="Stop generating"
          title="Stop generating"
        >
          <Square size={16} />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="shrink-0 p-2 rounded-lg bg-[var(--theme-accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Send message"
          title="Send message"
        >
          <Send size={16} />
        </button>
      )}
    </div>
  );
}
