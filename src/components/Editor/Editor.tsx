import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { useEditorStore, useIsDark } from '@/stores/editorStore';
import { useAIStore, executeQuickAction } from '@/stores/aiStore';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import { DebugPanel } from './DebugPanel';
import { BubbleMenu } from './BubbleMenu';
import { LinkPopover } from './LinkPopover';
import { ImagePopover } from './ImagePopover';
import { EditorToolbar } from './EditorToolbar';
import { createEditorExtensions } from './extensions';
import type { EditorExtensionOptions } from './extensions';
import { isImageFile } from '@/utils/imageHelpers';
import { AIQuickActions } from '@/components/AI/AIQuickActions';
import { AIResultPreview } from '@/components/AI/AIResultPreview';
import './editor-styles.css';

const INITIAL_CONTENT = `# Welcome to RendMD

**The thinking person's markdown editor.**

> *Intelligent. Elegant. Your data. Open source.*

Start typing to edit this document. This is a **rendered-first** editor, which means you're editing the beautiful output directly—not raw markdown.

## Features

- **Bold** and *italic* text
- [Links](https://example.com)
- Lists and more

### Try it out!

1. Click anywhere to start editing
2. Select text to see formatting options
3. Use keyboard shortcuts (Ctrl+B for bold, etc.)

---

*Built with ❤️ for writers, developers, and thinkers everywhere.*
`;

/**
 * Helper to get markdown from editor storage
 */
function getMarkdownFromEditor(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = editor.storage as any;
  return storage.markdown?.getMarkdown?.() ?? '';
}

export interface EditorProps {
  /** Callback when the TipTap editor instance is ready */
  onEditorReady?: (editor: TipTapEditor) => void;
  /** Callback when an image file is dropped or pasted */
  onImageFile?: (file: File) => void;
  /** Callback ref for the scroll container (for split-view scroll sync) */
  scrollContainerRef?: (el: HTMLElement | null) => void;
  /** Scroll event handler for scroll sync */
  onScrollSync?: () => void;
  /** Callback to open AI bottom sheet (mobile) */
  onAIClick?: () => void;
}

export function Editor({ onEditorReady, onImageFile, scrollContainerRef, onScrollSync, onAIClick }: EditorProps): JSX.Element {
  const { content, setContent, fileName } = useEditorStore();
  const { toolbarCollapsed, toggleToolbar } = useEditorStore();
  const isDark = useIsDark();
  
  // Track original input for debug comparison
  const [inputMarkdown, setInputMarkdown] = useState(INITIAL_CONTENT);
  const [outputMarkdown, setOutputMarkdown] = useState('');
  
  // Link popover state
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  
  // Image popover state
  const [imagePopoverOpen, setImagePopoverOpen] = useState(false);
  const [selectedImagePos, setSelectedImagePos] = useState<number | null>(null);
  
  // Bubble menu force-visible state (for Ctrl+Space)
  const [bubbleMenuForced, setBubbleMenuForced] = useState(false);

  // AI quick actions state
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiMenuPos, setAiMenuPos] = useState({ top: 0, left: 0 });
  const [aiCustomPromptOpen, setAiCustomPromptOpen] = useState(false);
  const [aiCustomPromptText, setAiCustomPromptText] = useState('');
  const { pendingResult, setPendingResult, acceptResult, rejectResult, hasApiKey, activeProvider, isStreaming } = useAIStore();
  
  // Hidden image input ref
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Ghost text AI suggestion callback
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const { ghostTextEnabled, apiKeys: aiApiKeys, activeProvider: aiProvider } = useAIStore();
  const ghostEnabled = ghostTextEnabled && !isTouchDevice && Boolean(aiApiKeys[aiProvider]);

  const getGhostSuggestion = useCallback(async (precedingText: string, signal: AbortSignal): Promise<string> => {
    const encryptedKey = useAIStore.getState().apiKeys[useAIStore.getState().activeProvider];
    if (!encryptedKey) return '';
    const { streamCompletion } = await import('@/services/ai/AIService');
    const messages = [
      { role: 'system' as const, content: 'Continue writing from where the text ends. Match the style, tone, and topic. Write 1-2 sentences only. Return only the continuation — do not repeat existing text.' },
      { role: 'user' as const, content: precedingText },
    ];
    let result = '';
    const stream = streamCompletion(useAIStore.getState().activeProvider, encryptedKey, {
      messages,
      model: useAIStore.getState().activeModel,
      temperature: 0.7,
      maxTokens: 100,
      signal,
    });
    for await (const chunk of stream) {
      result += chunk;
    }
    return result;
  }, []);

  // Create extensions with theme awareness + ghost text
  const extensions = useMemo(() => {
    const opts: EditorExtensionOptions = {
      isDark,
      ghostTextEnabled: ghostEnabled,
      getGhostSuggestion: ghostEnabled ? getGhostSuggestion : undefined,
    };
    return createEditorExtensions(opts);
  }, [isDark, ghostEnabled, getGhostSuggestion]);

  const editor = useEditor({
    extensions,
    content: content || INITIAL_CONTENT,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-full',
      },
    },
    onCreate: ({ editor }) => {
      // Initialize store with markdown on editor creation
      // This ensures source view has content even before user edits
      const markdown = getMarkdownFromEditor(editor);
      if (markdown && !content) {
        setContent(markdown);
      }
      setOutputMarkdown(markdown);
      onEditorReady?.(editor);
    },
    onUpdate: ({ editor }) => {
      const markdown = getMarkdownFromEditor(editor);
      setContent(markdown);
      setOutputMarkdown(markdown);
    },
  });

  // Load test markdown and track input/output
  const loadTestMarkdown = useCallback((markdown: string) => {
    if (!editor) return;
    setInputMarkdown(markdown);
    editor.commands.setContent(markdown);
    // After a tick, capture the output
    setTimeout(() => {
      setOutputMarkdown(getMarkdownFromEditor(editor));
    }, 100);
  }, [editor]);

  // Expose helpers on window for dev testing
  useEffect(() => {
    if (import.meta.env.DEV && editor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).loadTestMarkdown = loadTestMarkdown;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).editor = editor;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).getMarkdown = () => getMarkdownFromEditor(editor);
    }
  }, [editor, loadTestMarkdown]);

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && content) {
      const currentMarkdown = getMarkdownFromEditor(editor);
      if (currentMarkdown !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  // Initialize outputMarkdown on first render
  useEffect(() => {
    if (editor) {
      setOutputMarkdown(getMarkdownFromEditor(editor));
    }
  }, [editor]);

  // Open image picker from bubble menu
  const openImagePicker = useCallback(() => {
    if (!imageInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      imageInputRef.current = input;
    }
    
    const input = imageInputRef.current;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file && onImageFile) {
        onImageFile(file);
      }
      input.value = ''; // Reset for next use
      setBubbleMenuForced(false);
    };
    input.click();
  }, [onImageFile]);

  // Ctrl+Space to toggle bubble menu at cursor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
        e.preventDefault();
        setBubbleMenuForced(prev => !prev);
      }
      // Close bubble menu on Escape
      if (e.key === 'Escape' && bubbleMenuForced) {
        setBubbleMenuForced(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bubbleMenuForced]);

  // Open AI quick actions from BubbleMenu sparkle button
  const openAIMenu = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      // No selection — open AI panel instead
      useAIStore.getState().openPanel();
      return;
    }
    const coords = editor.view.coordsAtPos(from);
    setAiMenuPos({ top: coords.top + 30, left: coords.left });
    setAiMenuOpen(true);
  }, [editor]);

  // Execute an AI quick action on the current selection
  const handleQuickAction = useCallback(async (action: string, customInstruction?: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, '\n');
    if (!selectedText) return;

    const docContent = getMarkdownFromEditor(editor);

    try {
      const result = await executeQuickAction(action, selectedText, docContent, customInstruction);
      if (result) {
        // Store original and replacement
        setPendingResult({ original: selectedText, replacement: result, action });
        // Replace selection with AI result (can be reverted)
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, result).run();
      }
    } catch {
      // Error is handled inside executeQuickAction (shows in store)
    }
  }, [editor, setPendingResult]);

  // Accept AI result (already applied, just clear pending)
  const handleAcceptAI = useCallback(() => {
    acceptResult();
  }, [acceptResult]);

  // Revert AI result
  const handleRejectAI = useCallback(() => {
    if (!editor || !pendingResult) return;
    // Undo the AI change
    editor.commands.undo();
    rejectResult();
  }, [editor, pendingResult, rejectResult]);

  // Retry the same action
  const handleRetryAI = useCallback(() => {
    if (!pendingResult) return;
    // Undo first, then re-run
    editor?.commands.undo();
    rejectResult();
    handleQuickAction(pendingResult.action);
  }, [editor, pendingResult, rejectResult, handleQuickAction]);

  // Ctrl+J shortcut for quick actions
  useEffect(() => {
    const handleCtrlJ = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        openAIMenu();
      }
    };
    window.addEventListener('keydown', handleCtrlJ);
    return () => window.removeEventListener('keydown', handleCtrlJ);
  }, [openAIMenu]);

  // Handle link and image clicks
  const handleEditorClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    
    // Handle link clicks: click to edit, Ctrl+click to open
    const link = target.closest('a');
    if (link && editor) {
      event.preventDefault();
      
      if (event.ctrlKey || event.metaKey) {
        // Ctrl+Click opens link in new tab
        window.open(link.href, '_blank', 'noopener,noreferrer');
      } else {
        // Regular click opens link popover
        const linkPos = editor.view.posAtDOM(link, 0);
        editor.chain().focus().setTextSelection(linkPos).run();
        setLinkPopoverOpen(true);
      }
      return;
    }
    
    // Handle image clicks
    const img = target.closest('img');
    if (img && editor) {
      event.preventDefault();
      const imgPos = editor.view.posAtDOM(img, 0);
      setSelectedImagePos(imgPos);
      setImagePopoverOpen(true);
    }
  }, [editor]);

  // Handle image drops onto editor
  const handleDrop = useCallback((event: React.DragEvent) => {
    const files = event.dataTransfer?.files;
    if (!files?.length || !onImageFile) return;

    for (const file of Array.from(files)) {
      if (isImageFile(file)) {
        event.preventDefault();
        event.stopPropagation();
        onImageFile(file);
        return; // Handle one at a time
      }
    }
  }, [onImageFile]);

  // Handle image paste from clipboard
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items || !onImageFile) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          onImageFile(file);
          return;
        }
      }
    }
  }, [onImageFile]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Bubble menu for text selection or Ctrl+Space */}
      {editor && (
        <BubbleMenu 
          editor={editor} 
          onLinkClick={() => setLinkPopoverOpen(true)}
          onImageClick={openImagePicker}
          onAIClick={hasApiKey(activeProvider) ? openAIMenu : () => {
            // No API key — open settings (via panel which shows setup hint)
            useAIStore.getState().openPanel();
          }}
          aiKeyConfigured={hasApiKey(activeProvider)}
          forceVisible={bubbleMenuForced}
        />
      )}

      {/* AI Quick Actions floating menu */}
      {aiMenuOpen && (
        <AIQuickActions
          onAction={(action) => handleQuickAction(action)}
          onCustomPrompt={() => setAiCustomPromptOpen(true)}
          onClose={() => setAiMenuOpen(false)}
          position={aiMenuPos}
        />
      )}

      {/* AI custom prompt input */}
      {aiCustomPromptOpen && (
        <div
          style={{ position: 'fixed', top: `${aiMenuPos.top}px`, left: `${aiMenuPos.left}px`, zIndex: 50 }}
          className="flex items-center gap-2 p-2 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg shadow-xl"
        >
          <input
            type="text"
            value={aiCustomPromptText}
            onChange={(e) => setAiCustomPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && aiCustomPromptText.trim()) {
                handleQuickAction('custom', aiCustomPromptText.trim());
                setAiCustomPromptOpen(false);
                setAiCustomPromptText('');
              } else if (e.key === 'Escape') {
                setAiCustomPromptOpen(false);
                setAiCustomPromptText('');
              }
            }}
            ref={(el) => el?.focus()}
            placeholder="Custom instruction..."
            className="w-64 px-2 py-1 text-sm rounded border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent-primary)]"
          />
        </div>
      )}

      {/* AI result accept/reject bar */}
      {pendingResult && !isStreaming && (
        <div style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
          <AIResultPreview
            onAccept={handleAcceptAI}
            onReject={handleRejectAI}
            onRetry={handleRetryAI}
            action={pendingResult.action}
          />
        </div>
      )}
      
      {/* Link popover */}
      <LinkPopover
        editor={editor}
        isOpen={linkPopoverOpen}
        onClose={() => setLinkPopoverOpen(false)}
      />
      
      {/* Image popover */}
      <ImagePopover
        editor={editor}
        isOpen={imagePopoverOpen}
        onClose={() => {
          setImagePopoverOpen(false);
          setSelectedImagePos(null);
        }}
        nodePos={selectedImagePos}
      />

      {/* Rendered editor */}
      <div className="w-full flex flex-col overflow-hidden">
        {/* Editor toolbar - formatting + table controls (collapsible) */}
        {editor && (
          <div className="sticky top-0 z-10 bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-primary)]">
            <div className="flex items-center">
              {!toolbarCollapsed && (
                <div className="flex-1 p-2">
                  <EditorToolbar editor={editor} onLinkClick={() => setLinkPopoverOpen(true)} onImageClick={openImagePicker} onAIClick={onAIClick} />
                </div>
              )}
              <button
                onClick={toggleToolbar}
                className="px-2 py-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)] transition-colors"
                aria-label={toolbarCollapsed ? 'Show toolbar' : 'Hide toolbar'}
                title={toolbarCollapsed ? 'Show toolbar' : 'Hide toolbar'}
              >
                <ChevronUp size={14} className={cn('transition-transform', toolbarCollapsed && 'rotate-180')} />
              </button>
            </div>
          </div>
        )}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- region wraps ProseMirror which handles its own keyboard input; onKeyDown here is only for click-to-focus parity */}
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-8" 
          ref={scrollContainerRef as React.RefCallback<HTMLDivElement>}
          role="region"
          aria-label={fileName ? `Editing ${fileName}` : 'Document editor'}
          tabIndex={-1}
          onClick={handleEditorClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleEditorClick(e as unknown as React.MouseEvent); }}
          onScroll={onScrollSync}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onDragOver={(e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); }}
        >
          <EditorContent 
            editor={editor} 
            className="max-w-3xl mx-auto"
          />
        </div>
      </div>

      {/* Debug panel - dev only */}
      <DebugPanel
        inputMarkdown={inputMarkdown}
        outputMarkdown={outputMarkdown}
        proseMirrorDoc={editor?.getJSON()}
      />
    </div>
  );
}
