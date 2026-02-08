import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { useEditorStore } from '@/stores/editorStore';
import { useTheme } from '@/hooks';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { DebugPanel } from './DebugPanel';
import { BubbleMenu } from './BubbleMenu';
import { LinkPopover } from './LinkPopover';
import { ImagePopover } from './ImagePopover';
import { EditorToolbar } from './EditorToolbar';
import { createEditorExtensions } from './extensions';
import { isImageFile } from '@/utils/imageHelpers';
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
}

export function Editor({ onEditorReady, onImageFile }: EditorProps): JSX.Element {
  const { content, setContent } = useEditorStore();
  const { isDark } = useTheme();
  
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
  
  // Hidden image input ref
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Create extensions with theme awareness
  const extensions = useMemo(() => createEditorExtensions(isDark), [isDark]);

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
          forceVisible={bubbleMenuForced}
        />
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
        {/* Editor toolbar - formatting + table controls */}
        {editor && (
          <div className="sticky top-0 z-10 p-2 bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-primary)]">
            <EditorToolbar editor={editor} onLinkClick={() => setLinkPopoverOpen(true)} onImageClick={openImagePicker} />
          </div>
        )}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div 
          className="flex-1 overflow-y-auto p-4 md:p-8" 
          onClick={handleEditorClick}
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
