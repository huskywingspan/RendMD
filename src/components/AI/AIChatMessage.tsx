import { cn } from '@/utils/cn';
import type { AIChatMessage } from '@/services/ai/types';
import { Check, Copy, ClipboardPaste, RotateCcw } from 'lucide-react';
import { useState, useCallback } from 'react';

interface AIChatMessageProps {
  message: AIChatMessage;
  onApply?: (content: string) => void;
  onRetry?: () => void;
}

export function AIChatMessageBubble({ message, onApply, onRetry }: AIChatMessageProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      {/* Role label */}
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--theme-text-muted)] px-1">
        {isUser ? 'You' : 'AI'}
      </span>

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
          isUser
            ? 'bg-[var(--theme-accent-primary)] text-white'
            : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]',
        )}
      >
        {message.content}
      </div>

      {/* Actions — only for assistant messages */}
      {!isUser && (
        <div className="flex items-center gap-1 px-1">
          {onApply && (
            <button
              onClick={() => onApply(message.content)}
              className="flex items-center gap-1 text-[10px] text-[var(--theme-text-muted)] hover:text-[var(--theme-accent-primary)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--theme-bg-tertiary)]"
              title="Apply to document"
            >
              <ClipboardPaste size={12} />
              Apply
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-[var(--theme-text-muted)] hover:text-[var(--theme-accent-primary)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--theme-bg-tertiary)]"
            title="Copy to clipboard"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-[10px] text-[var(--theme-text-muted)] hover:text-[var(--theme-accent-primary)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--theme-bg-tertiary)]"
              title="Retry"
            >
              <RotateCcw size={12} />
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
