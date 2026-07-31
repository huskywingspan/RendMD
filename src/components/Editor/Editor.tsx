import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { BubbleMenu } from './BubbleMenu';
import { LinkPopover } from './LinkPopover';
import { ImagePopover } from './ImagePopover';
import { createEditorExtensions } from './extensions';
import { useSettingsStore, resolveTheme } from '@/stores/settingsStore';

/**
 * The rendered editing surface.
 *
 * One instance per document — App keys this component on the document id, so
 * switching tabs gets a fresh editor with its own undo history rather than one
 * shared timeline where undo could reach into a document you aren't looking at.
 *
 * Markdown flows one way. `initialContent` seeds the editor once; after that
 * every change leaves through `onChange` and the store never pushes content
 * back in. Reflecting store state into ProseMirror on each keystroke fights
 * the cursor and drops input during fast typing.
 */

export interface EditorProps {
  /** Markdown to load. Read once at mount; see the note above. */
  initialContent: string;
  onChange: (markdown: string) => void;
  onEditorReady?: (editor: TipTapEditor) => void;
  scrollContainerRef?: (element: HTMLElement | null) => void;
  onScrollSync?: () => void;
}

export function Editor({
  initialContent,
  onChange,
  onEditorReady,
  scrollContainerRef,
  onScrollSync,
}: EditorProps) {
  const themePreference = useSettingsStore((s) => s.theme);
  const spellcheck = useSettingsStore((s) => s.spellcheck);
  const isDark = resolveTheme(themePreference) === 'dark';

  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [imagePopoverPos, setImagePopoverPos] = useState<number | null>(null);

  // Held in a ref so the onUpdate closure — created once — always reaches the
  // current handler without the editor needing to be rebuilt.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const extensions = useMemo(() => createEditorExtensions({ isDark }), [isDark]);

  const editor = useEditor({
    extensions,
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose-surface focus:outline-none min-h-full',
      },
    },
    onCreate: ({ editor }) => onEditorReady?.(editor),
    onUpdate: ({ editor }) => onChangeRef.current(getMarkdown(editor)),
  });

  // Spellcheck is set as a live DOM attribute rather than an editor option, so
  // toggling it doesn't tear the editor down.
  useEffect(() => {
    editor?.view.dom.setAttribute('spellcheck', String(spellcheck));
  }, [editor, spellcheck]);

  /* ── Link and image affordances ────────────────────────────────────────── */

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!editor) return;
      const target = event.target as HTMLElement;

      const link = target.closest('a');
      if (link) {
        event.preventDefault();
        // Ctrl/Cmd-click follows the link; a plain click edits it, which is
        // what you want far more often inside your own document.
        if (event.ctrlKey || event.metaKey) {
          window.open(link.href, '_blank', 'noopener,noreferrer');
          return;
        }
        editor.chain().focus().setTextSelection(editor.view.posAtDOM(link, 0)).run();
        setLinkPopoverOpen(true);
        return;
      }

      const image = target.closest('img');
      if (image) {
        event.preventDefault();
        setImagePopoverPos(editor.view.posAtDOM(image, 0));
      }
    },
    [editor],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {editor && (
        <>
          <BubbleMenu editor={editor} onLinkClick={() => setLinkPopoverOpen(true)} />
          <LinkPopover
            editor={editor}
            isOpen={linkPopoverOpen}
            onClose={() => setLinkPopoverOpen(false)}
          />
          <ImagePopover
            editor={editor}
            isOpen={imagePopoverPos !== null}
            nodePos={imagePopoverPos}
            onClose={() => setImagePopoverPos(null)}
          />
        </>
      )}

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions --
          ProseMirror owns keyboard handling inside this element; the click
          listener only routes link and image clicks to their popovers. */}
      <div
        data-scroll-container
        ref={scrollContainerRef as React.RefCallback<HTMLDivElement>}
        onScroll={onScrollSync}
        onClick={handleClick}
        className="min-h-0 flex-1 overflow-y-auto px-6 py-10 md:px-10 md:py-14"
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/** Pull markdown out of the tiptap-markdown storage bucket. */
function getMarkdown(editor: TipTapEditor): string {
  const storage = editor.storage as { markdown?: { getMarkdown?: () => string } };
  return storage.markdown?.getMarkdown?.() ?? '';
}
