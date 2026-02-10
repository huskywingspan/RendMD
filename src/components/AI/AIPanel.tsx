import { useRef, useEffect, useCallback } from 'react';
import { X, Trash2, Sparkles, Settings } from 'lucide-react';
import { useAIStore } from '@/stores/aiStore';
import { useEditorStore } from '@/stores/editorStore';
import { AIChatMessageBubble } from './AIChatMessage';
import { AIPromptInput } from './AIPromptInput';
import { AIProviderPicker } from './AIProviderPicker';
import { cn } from '@/utils/cn';
import type { AIContext } from '@/services/ai/types';
import type { Editor } from '@tiptap/react';

interface AIPanelProps {
  className?: string;
  editor?: Editor | null;
  onOpenSettings?: () => void;
}

export function AIPanel({ className, editor, onOpenSettings }: AIPanelProps): JSX.Element {
  const {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    cancelStream,
    clearConversation,
    closePanel,
    apiKeys,
    activeProvider,
  } = useAIStore();

  const { content, fileName } = useEditorStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  // Auto-scroll to bottom on new messages, unless user scrolled up
  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  // Track if user has scrolled up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
    userScrolledUp.current = !isAtBottom;
  }, []);

  // Build context from current editor state
  const getContext = useCallback((): AIContext => {
    const ctx: AIContext = { documentContent: content };
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        ctx.selectedText = editor.state.doc.textBetween(from, to, '\n');
      }
      ctx.cursorPosition = from;
    }
    return ctx;
  }, [content, editor]);

  const handleSend = useCallback(
    (prompt: string) => {
      const context = getContext();
      sendMessage(prompt, context);
    },
    [sendMessage, getContext],
  );

  // Apply AI content to document
  const handleApply = useCallback(
    (text: string) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from !== to) {
        // Replace selection
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, text).run();
      } else {
        // Insert at cursor
        editor.chain().focus().insertContentAt(from, text).run();
      }
    },
    [editor],
  );

  const hasKey = Boolean(apiKeys[activeProvider]);

  return (
    <div className={cn('flex flex-col bg-[var(--theme-bg-primary)]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--theme-border-primary)]">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-[var(--theme-accent-primary)]" />
          <span className="text-sm font-semibold text-[var(--theme-text-primary)]">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <AIProviderPicker />
          <button
            onClick={clearConversation}
            className="p-1 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            <Trash2 size={14} className="text-[var(--theme-text-muted)]" />
          </button>
          <button
            onClick={closePanel}
            className="p-1 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            aria-label="Close AI panel"
            title="Close AI panel"
          >
            <X size={14} className="text-[var(--theme-text-muted)]" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-4"
      >
        {!hasKey ? (
          /* Empty state — no API key */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 gap-3">
            <Sparkles size={32} className="text-[var(--theme-text-muted)] opacity-40" />
            <p className="text-sm text-[var(--theme-text-muted)]">
              Configure an API key in Settings to get started.
            </p>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 text-xs text-[var(--theme-accent-primary)] hover:underline"
              >
                <Settings size={12} />
                Open Settings
              </button>
            )}
          </div>
        ) : messages.length === 0 && !isStreaming ? (
          /* Empty state — no messages yet */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 gap-2">
            <Sparkles size={24} className="text-[var(--theme-text-muted)] opacity-40" />
            <p className="text-sm text-[var(--theme-text-muted)]">
              Ask anything about your document{fileName ? ` "${fileName}"` : ''}.
            </p>
            <p className="text-[10px] text-[var(--theme-text-muted)]">
              Select text first for context-aware assistance.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <AIChatMessageBubble
                key={msg.id}
                message={msg}
                onApply={msg.role === 'assistant' ? handleApply : undefined}
              />
            ))}

            {/* Streaming indicator */}
            {isStreaming && streamingContent && (
              <div className="flex flex-col gap-1 items-start">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--theme-text-muted)] px-1">
                  AI
                </span>
                <div className="max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]">
                  {streamingContent}
                  <span className="inline-block w-1.5 h-4 bg-[var(--theme-accent-primary)] ml-0.5 animate-pulse" />
                </div>
              </div>
            )}

            {/* Streaming loading — before first chunk arrives */}
            {isStreaming && !streamingContent && (
              <div className="flex items-center gap-2 px-1">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] text-[var(--theme-text-muted)]">Thinking...</span>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prompt input */}
      {hasKey && (
        <AIPromptInput
          onSend={handleSend}
          onCancel={cancelStream}
          isStreaming={isStreaming}
        />
      )}
    </div>
  );
}
