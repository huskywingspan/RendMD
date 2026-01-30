import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { useEditorStore } from '@/stores/editorStore';
import { useEffect } from 'react';

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

export function Editor(): JSX.Element {
  const { content, setContent, showSource } = useEditorStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: content || INITIAL_CONTENT,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = getMarkdownFromEditor(editor);
      setContent(markdown);
    },
  });

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && content) {
      const currentMarkdown = getMarkdownFromEditor(editor);
      if (currentMarkdown !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Rendered editor */}
      <div className={showSource ? 'w-1/2 border-r border-[var(--theme-border)]' : 'w-full'}>
        <div className="h-full overflow-y-auto p-8">
          <EditorContent 
            editor={editor} 
            className="max-w-3xl mx-auto"
          />
        </div>
      </div>

      {/* Source view */}
      {showSource && (
        <div className="w-1/2 bg-[var(--theme-bg-secondary)]">
          <div className="h-full overflow-y-auto p-4">
            <pre className="text-sm font-mono text-[var(--theme-text-secondary)] whitespace-pre-wrap">
              {content || INITIAL_CONTENT}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
