import { useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  Bold,
  Code,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Table as TableIcon,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';
import { BlockTypeMenu, Divider, FormatButton } from './formatting';

/**
 * The format toolbar.
 *
 * Sits above the rendered document, and only there — it drives the ProseMirror
 * document, so in split view it belongs to the pane it can actually act on, and
 * in source view it is absent rather than present-but-inert.
 *
 * Off by default. When off it renders nothing at all, not a collapsed strip:
 * the reading surface is then pixel-identical to having no toolbar in the
 * codebase. That is the point — this is a reading tool that can be switched
 * into a writing tool, not a writing tool with a reading mode.
 *
 * It also lives outside the scroll container, so toggling it changes the height
 * of the viewport rather than reflowing the text column, and it stays put while
 * you scroll.
 *
 * What is deliberately *not* here: table row and column operations, which
 * appear in TableToolbar when the cursor is actually inside a table. A control
 * that is dead nine tenths of the time teaches you to ignore it.
 */

interface FormatToolbarProps {
  editor: Editor;
  onLinkClick: () => void;
}

export function FormatToolbar({ editor, onLinkClick }: FormatToolbarProps) {
  const enabled = useSettingsStore((s) => s.formatToolbar);
  // Focus mode hides every other piece of chrome; this is chrome.
  const focusMode = useUIStore((s) => s.focusMode);
  const openOverlay = useUIStore((s) => s.openOverlay);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);

  // Recomputed per transaction, but only re-renders when a flag actually
  // changes — otherwise every keystroke would re-render fifteen buttons.
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      strike: editor.isActive('strike'),
      code: editor.isActive('code'),
      link: editor.isActive('link'),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      taskList: editor.isActive('taskList'),
      blockquote: editor.isActive('blockquote'),
      // Marks do not apply inside a code block, and tables cannot nest.
      inCodeBlock: editor.isActive('codeBlock'),
      canInsertTable: editor.can().insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
    }),
  });

  if (!enabled || focusMode || !state) return null;

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      // Keep the caret where it is: clicking a button must not blur the
      // document, or the command would have no selection left to act on.
      onMouseDown={(event) => event.preventDefault()}
      className={cn(
        'flex shrink-0 items-center gap-0.5 overflow-x-auto px-2 py-1',
        'border-b border-line bg-surface',
      )}
    >
      <BlockTypeMenu editor={editor} open={blockMenuOpen} onOpenChange={setBlockMenuOpen} />

      <Divider />

      <FormatButton
        icon={<Bold size={14} />}
        label="Bold"
        shortcut="Ctrl+B"
        isActive={state.bold}
        disabled={state.inCodeBlock}
        onPress={() => editor.chain().focus().toggleBold().run()}
      />
      <FormatButton
        icon={<Italic size={14} />}
        label="Italic"
        shortcut="Ctrl+I"
        isActive={state.italic}
        disabled={state.inCodeBlock}
        onPress={() => editor.chain().focus().toggleItalic().run()}
      />
      <FormatButton
        icon={<Strikethrough size={14} />}
        label="Strikethrough"
        isActive={state.strike}
        disabled={state.inCodeBlock}
        onPress={() => editor.chain().focus().toggleStrike().run()}
      />
      <FormatButton
        icon={<Code size={14} />}
        label="Inline code"
        isActive={state.code}
        disabled={state.inCodeBlock}
        onPress={() => editor.chain().focus().toggleCode().run()}
      />
      <FormatButton
        icon={<LinkIcon size={14} />}
        label="Link"
        shortcut="Ctrl+K"
        isActive={state.link}
        disabled={state.inCodeBlock}
        onPress={onLinkClick}
      />

      <Divider />

      <FormatButton
        icon={<List size={14} />}
        label="Bullet list"
        isActive={state.bulletList}
        onPress={() => editor.chain().focus().toggleBulletList().run()}
      />
      <FormatButton
        icon={<ListOrdered size={14} />}
        label="Numbered list"
        isActive={state.orderedList}
        onPress={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <FormatButton
        icon={<ListChecks size={14} />}
        label="Task list"
        isActive={state.taskList}
        onPress={() => editor.chain().focus().toggleTaskList().run()}
      />
      <FormatButton
        icon={<Quote size={14} />}
        label="Quote"
        isActive={state.blockquote}
        onPress={() => editor.chain().focus().toggleBlockquote().run()}
      />

      <Divider />

      <FormatButton
        icon={<TableIcon size={14} />}
        label="Insert table"
        disabled={!state.canInsertTable}
        onPress={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      />
      <FormatButton
        icon={<ImageIcon size={14} />}
        label="Insert image"
        shortcut="Ctrl+Shift+I"
        onPress={() => openOverlay('image')}
      />
      <FormatButton
        icon={<Minus size={14} />}
        label="Horizontal rule"
        onPress={() => editor.chain().focus().setHorizontalRule().run()}
      />
    </div>
  );
}
