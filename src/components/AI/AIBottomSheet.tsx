import { useState, useRef, useCallback, useEffect } from 'react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { Sparkles, Send, Square, Trash2, Copy, Check, CornerDownLeft, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAIStore, executeQuickAction } from '@/stores/aiStore';
import { BottomSheet } from '@/components/UI/BottomSheet';
import type { BottomSheetDetent } from '@/hooks/useBottomSheet';
import type { QuickAction } from '@/services/ai/types';

const QUICK_ACTIONS: { action: QuickAction; label: string; emoji: string }[] = [
  { action: 'improve', label: 'Improve', emoji: '✨' },
  { action: 'shorten', label: 'Shorter', emoji: '📝' },
  { action: 'expand', label: 'Longer', emoji: '📖' },
  { action: 'formal', label: 'Formal', emoji: '🎩' },
  { action: 'casual', label: 'Casual', emoji: '😊' },
  { action: 'professional', label: 'Pro', emoji: '💼' },
];

const TRANSLATE_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Portuguese', 'Chinese', 'Japanese', 'Korean',
];

interface AIBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  editor: TipTapEditor | null;
  hasSelection: boolean;
  onOpenSettings: () => void;
}

export function AIBottomSheet({ isOpen, onClose, editor, hasSelection, onOpenSettings }: AIBottomSheetProps): JSX.Element {
  const {
    messages, isStreaming, streamingContent, sendMessage, cancelStream,
    clearConversation, hasApiKey, activeProvider, pendingResult,
    setPendingResult, acceptResult, rejectResult,
  } = useAIStore();

  const [prompt, setPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const detents: BottomSheetDetent[] = ['peek', 'half', 'full'];
  const defaultDetent: BottomSheetDetent = messages.length > 0 ? 'half' : 'peek';

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const getSelectedText = useCallback((): string => {
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  }, [editor]);

  const getDocContent = useCallback((): string => {
    if (!editor) return '';
    return editor.state.doc.textContent.slice(0, 2000);
  }, [editor]);

  // Quick action handler
  const handleQuickAction = useCallback(async (action: string, customInstruction?: string) => {
    const selectedText = getSelectedText();
    const docContent = getDocContent();
    if (!selectedText && action !== 'continue') return;

    try {
      let result = '';
      await executeQuickAction(action, selectedText, docContent, customInstruction, (chunk) => {
        result += chunk;
      });
      if (editor && selectedText) {
        const { from, to } = editor.state.selection;
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();
        setPendingResult({ original: selectedText, replacement: result, action });
      }
    } catch {
      // Error handled in store
    }
  }, [editor, getSelectedText, getDocContent, setPendingResult]);

  // Chat send handler
  const handleSend = useCallback(async () => {
    if (!prompt.trim() || isStreaming) return;
    const text = prompt.trim();
    setPrompt('');
    await sendMessage(text, {
      selectedText: getSelectedText() || undefined,
      documentContent: getDocContent(),
    }, editor);
  }, [prompt, isStreaming, sendMessage, getSelectedText, getDocContent]);

  // Copy message
  const handleCopy = useCallback(async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Apply AI message to document
  const handleApply = useCallback((content: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, content).run();
    } else {
      editor.chain().focus().insertContentAt(from, content).run();
    }
  }, [editor]);

  // Continue writing (mobile alternative to ghost text)
  const handleContinueWriting = useCallback(async () => {
    const docContent = getDocContent();
    try {
      let result = '';
      await executeQuickAction('continue', '', docContent, undefined, (chunk) => {
        result += chunk;
      });
      if (editor) {
        const endPos = editor.state.doc.content.size - 1;
        editor.chain().focus().insertContentAt(endPos, result).run();
      }
    } catch {
      // handled
    }
  }, [editor, getDocContent]);

  // Accept/reject pending result
  const handleAcceptPending = useCallback(() => { acceptResult(); }, [acceptResult]);
  const handleRejectPending = useCallback(() => {
    if (editor) editor.commands.undo();
    rejectResult();
  }, [editor, rejectResult]);

  const apiKeyConfigured = hasApiKey(activeProvider);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      detents={detents}
      defaultDetent={defaultDetent}
      peekHeight={200}
      showBackdrop={true}
    >
      <div className="flex flex-col h-full px-3 pb-2">
        {/* No API key state */}
        {!apiKeyConfigured && (
          <div className="text-center py-6">
            <Sparkles className="mx-auto mb-2 text-[var(--theme-text-muted)]" size={24} />
            <p className="text-sm text-[var(--theme-text-muted)] mb-3">
              Set up an API key to use AI features
            </p>
            <button
              onClick={() => { onClose(); onOpenSettings(); }}
              className="text-sm text-[var(--theme-accent-primary)] underline"
            >
              Open Settings
            </button>
          </div>
        )}

        {apiKeyConfigured && (
          <>
            {/* Quick action chips (horizontal scroll) */}
            {hasSelection && !pendingResult && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {QUICK_ACTIONS.map(({ action, label, emoji }) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    disabled={isStreaming}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap',
                      'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]',
                      'hover:bg-[var(--theme-accent-primary)]/20 active:bg-[var(--theme-accent-primary)]/30',
                      'transition-colors',
                      isStreaming && 'opacity-50',
                    )}
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </button>
                ))}

                {/* Translate button */}
                <TranslateChip
                  onSelect={(lang) => handleQuickAction(`translate:${lang}`)}
                  disabled={isStreaming}
                />
              </div>
            )}

            {/* Continue writing button (when no selection) */}
            {!hasSelection && !pendingResult && (
              <div className="pb-2">
                <button
                  onClick={handleContinueWriting}
                  disabled={isStreaming}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full',
                    'bg-[var(--theme-accent-primary)]/10 text-[var(--theme-accent-primary)]',
                    'hover:bg-[var(--theme-accent-primary)]/20 active:bg-[var(--theme-accent-primary)]/30',
                    'transition-colors',
                    isStreaming && 'opacity-50',
                  )}
                >
                  <Sparkles size={16} />
                  Continue writing
                </button>
              </div>
            )}

            {/* Pending result bar */}
            {pendingResult && (
              <div className="flex items-center gap-2 py-2 mb-2 border-b border-[var(--theme-border-primary)]">
                <span className="text-xs text-[var(--theme-text-muted)] capitalize flex-1">
                  {pendingResult.action} applied
                </span>
                <button
                  onClick={handleAcceptPending}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-500/20 text-green-600 hover:bg-green-500/30"
                >
                  <Check size={12} /> Accept
                </button>
                <button
                  onClick={handleRejectPending}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-500/20 text-red-600 hover:bg-red-500/30"
                >
                  <RotateCcw size={12} /> Revert
                </button>
              </div>
            )}

            {/* Chat messages */}
            {messages.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'text-sm rounded-lg px-3 py-2',
                      msg.role === 'user'
                        ? 'bg-[var(--theme-accent-primary)]/10 text-[var(--theme-text-primary)]'
                        : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]',
                    )}
                  >
                    <div className="text-[10px] font-medium mb-1 text-[var(--theme-text-muted)]">
                      {msg.role === 'user' ? 'You' : 'AI'}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.role === 'assistant' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleApply(msg.content)}
                          className="text-[10px] text-[var(--theme-accent-primary)] hover:underline flex items-center gap-1"
                        >
                          <CornerDownLeft size={10} /> Apply
                        </button>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="text-[10px] text-[var(--theme-text-muted)] hover:underline flex items-center gap-1"
                        >
                          {copiedId === msg.id ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Streaming indicator */}
                {isStreaming && (
                  <div className="text-sm rounded-lg px-3 py-2 bg-[var(--theme-bg-tertiary)]">
                    <div className="text-[10px] font-medium mb-1 text-[var(--theme-text-muted)]">AI</div>
                    <div className="whitespace-pre-wrap">
                      {streamingContent || (
                        <span className="inline-flex gap-1 text-[var(--theme-text-muted)]">
                          <span className="animate-bounce [animation-delay:0ms]">·</span>
                          <span className="animate-bounce [animation-delay:150ms]">·</span>
                          <span className="animate-bounce [animation-delay:300ms]">·</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}

            {/* Chat input */}
            <div className="flex items-end gap-2 pt-2 border-t border-[var(--theme-border-primary)]">
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="p-2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)] transition-colors shrink-0"
                  title="Clear conversation"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask AI anything…"
                rows={1}
                className={cn(
                  'flex-1 resize-none rounded-lg px-3 py-2 text-sm',
                  'bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]',
                  'border border-[var(--theme-border-primary)]',
                  'placeholder:text-[var(--theme-text-muted)]',
                  'focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent-primary)]',
                )}
                style={{ maxHeight: 100 }}
              />
              {isStreaming ? (
                <button
                  onClick={cancelStream}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                  title="Stop generating"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!prompt.trim()}
                  className={cn(
                    'p-2 rounded-lg transition-colors shrink-0',
                    prompt.trim()
                      ? 'text-[var(--theme-accent-primary)] hover:bg-[var(--theme-accent-primary)]/10'
                      : 'text-[var(--theme-text-muted)] opacity-50',
                  )}
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/** Translate language picker chip */
function TranslateChip({ onSelect, disabled }: { onSelect: (lang: string) => void; disabled: boolean }): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap',
          'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]',
          'hover:bg-[var(--theme-accent-primary)]/20 active:bg-[var(--theme-accent-primary)]/30',
          'transition-colors',
          disabled && 'opacity-50',
        )}
      >
        🌐 Translate
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 z-50 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg shadow-lg py-1 min-w-[120px]">
          {TRANSLATE_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => { onSelect(lang); setOpen(false); }}
              className="block w-full text-left px-3 py-1.5 text-xs text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-hover)] transition-colors"
            >
              {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
