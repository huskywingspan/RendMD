import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { BubbleMenu } from './BubbleMenu';
import { LinkPopover } from './LinkPopover';
import { ImagePopover } from './ImagePopover';
import { TableToolbar } from './TableToolbar';
import { createEditorExtensions } from './extensions';
import { useSettingsStore, resolveTheme } from '@/stores/settingsStore';

/**
 * The rendered editing surface.
 *
 * One instance per document — App keys this component on the document id, so
 * switching tabs gets a fresh editor with its own undo history rather than one
 * shared timeline where undo could reach into a document you aren't looking at.
 *
 * `initialContent` seeds the editor once; after that every change leaves
 * through `onChange`. Store state is pushed back in only while this pane is
 * *unfocused* — reflecting it during typing fights the cursor and drops input.
 *
 * The write guard only applies in split view, where two panes edit one
 * document and a transaction here could serialise this pane's copy over
 * newer text typed in the other. With a single pane there is nothing to race,
 * so writes always propagate — silently dropping an edit is a worse failure
 * than the one being guarded against.
 *
 * It tracks focus via the editor's focus/blur events rather than reading
 * `editor.isFocused` inside the transaction. Toolbar buttons suppress mousedown
 * to keep the selection, so no blur fires and the pane is still rightly the
 * active one — but the instantaneous check can evaluate before `.focus()` in a
 * command chain has settled, which made "delete row" appear to do nothing.
 */

export interface EditorProps {
  /** Markdown to load. Read once at mount; see the note above. */
  initialContent: string;
  /**
   * Current store content. Adopted only when this pane is unfocused, to pick
   * up edits made in the source pane during split view.
   */
  content?: string;
  /**
   * Increments when the document is replaced from outside the panes (undo,
   * revert, reload). Adopted even while focused — an undo has to land in the
   * pane you are typing in.
   */
  revision?: number;
  /**
   * True when another pane is editing the same document (split view). Only
   * then are writes from this pane gated on it having focus.
   */
  sharesDocument?: boolean;
  onChange: (markdown: string) => void;
  onEditorReady?: (editor: TipTapEditor) => void;
  scrollContainerRef?: (element: HTMLElement | null) => void;
  onScrollSync?: () => void;
}

export function Editor({
  initialContent,
  content,
  revision,
  sharesDocument = false,
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
  // current handler without the editor needing to be rebuilt. Assigned from an
  // effect rather than during render: a render can be thrown away, and writing
  // to a ref on a discarded render is exactly the tearing React warns about.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Sticky focus, updated from the editor's own events. See the note above on
  // why this is not `editor.isFocused` read at transaction time.
  const paneHasFocus = useRef(false);
  // Mirrored into a ref for the onUpdate closure, which is created once.
  // Assigned from an effect rather than during render: a render can be thrown
  // away, and writing to a ref on a discarded one is the tearing React warns
  // about.
  const sharesDocumentRef = useRef(sharesDocument);
  useEffect(() => {
    sharesDocumentRef.current = sharesDocument;
  });

  const extensions = useMemo(() => createEditorExtensions({ isDark }), [isDark]);

  const editor = useEditor({
    extensions,
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose-surface focus:outline-none min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      // With a single pane, always write: there is nothing to race with, and
      // dropping an edit would lose the user's work.
      if (sharesDocumentRef.current && !paneHasFocus.current && !editor.isFocused) return;
      onChangeRef.current(getMarkdown(editor));
    },
  });

  useEffect(() => {
    if (!editor) return;

    const onFocus = () => {
      paneHasFocus.current = true;
    };
    const onBlur = () => {
      paneHasFocus.current = false;
    };

    editor.on('focus', onFocus);
    editor.on('blur', onBlur);
    return () => {
      editor.off('focus', onFocus);
      editor.off('blur', onBlur);
    };
  }, [editor]);

  // Handed up from an effect rather than TipTap's onCreate: at onCreate time
  // the ProseMirror view has not attached yet, and consumers that reach for
  // editor.view (the outline observer) would throw. By the time this runs,
  // EditorContent has rendered and the view exists.
  useEffect(() => {
    if (editor) onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  // Adopt content edited elsewhere. Normally only while unfocused, so the
  // user's own typing is never overwritten mid-keystroke — but always when
  // `revision` changes, because that means the document was replaced outright
  // (undo, revert, reload) and must land wherever the caret happens to be.
  const lastRevision = useRef(revision);

  useEffect(() => {
    if (!editor || content === undefined) return;

    const replaced = revision !== lastRevision.current;
    lastRevision.current = revision;

    if (!replaced && (editor.isFocused || paneHasFocus.current)) return;
    if (getMarkdown(editor) === content) return;

    const { from, to } = editor.state.selection;
    editor.commands.setContent(content, { emitUpdate: false });

    // Keep the caret where it was when the positions still exist, so a split
    // view doesn't scroll itself to the top every time the other pane changes.
    const size = editor.state.doc.content.size;
    if (from <= size && to <= size) {
      editor.commands.setTextSelection({ from, to });
    }
  }, [editor, content, revision]);

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
          <TableToolbar editor={editor} />
          {/* Mounted only while open, so each reads its initial values from
              the current selection instead of syncing them in an effect. */}
          {linkPopoverOpen && (
            <LinkPopover editor={editor} onClose={() => setLinkPopoverOpen(false)} />
          )}
          {imagePopoverPos !== null && (
            <ImagePopover
              editor={editor}
              nodePos={imagePopoverPos}
              onClose={() => setImagePopoverPos(null)}
            />
          )}
        </>
      )}

      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions,
                                    jsx-a11y/click-events-have-key-events --
          ProseMirror owns keyboard handling inside this element. The click
          listener only routes clicks that land on a link or an image to their
          popovers; the keyboard equivalent is the bubble menu, reachable by
          selecting the text. */}
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
