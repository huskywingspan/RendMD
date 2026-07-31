# Builder Handoff: Phase 1 - Core Editing Features

> **Phase:** 1  
> **Goal:** Full inline editing for all common markdown elements  
> **Prerequisites:** Phase 0.5 complete (round-trip validated)  
> **Estimated Steps:** 6 (consolidated for efficiency)

---

## Context

Phase 0.5 validated our markdown round-trip. Now we build the actual editing experience. Phase 1 transforms RendMD from a "can render markdown" app into a "can edit markdown visually" app.

**Key Design Principles (from DESIGN_DOCUMENT.md):**
- Rendered-first: The rendered view IS the editor
- Click any element to edit it
- Bubble menu on text selection
- Links: Click edits, Ctrl+Click opens

---

## Step 1: TipTap Extensions Setup

**Task:** Install and configure all TipTap extensions needed for Phase 1.

### Install Dependencies

```bash
npm install @tiptap/extension-placeholder @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
```

### Create Extension Configuration

Create `src/components/Editor/extensions/index.ts`:

```typescript
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

export const editorExtensions = [
  StarterKit.configure({
    // Disable built-in heading if we need custom behavior
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    codeBlock: {
      HTMLAttributes: {
        class: 'code-block',
      },
    },
  }),
  Placeholder.configure({
    placeholder: 'Start writing, or paste markdown...',
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Link.configure({
    openOnClick: false, // We handle click manually
    HTMLAttributes: {
      class: 'editor-link',
    },
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'editor-image',
    },
  }),
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: 'editor-table',
    },
  }),
  TableRow,
  TableCell,
  TableHeader,
];
```

### Update Editor.tsx to Use Extensions

Update `src/components/Editor/Editor.tsx` to import and use `editorExtensions` instead of inline configuration.

**Handoff:** Tell Reviewer: *"Step 1 complete. Extensions installed and configured. Please verify extension list matches Phase 1 requirements."*

---

## Step 2: Bubble Menu Implementation

**Task:** Create selection-based formatting toolbar that appears when text is selected.

### Create BubbleMenu Component

Create `src/components/Editor/BubbleMenu.tsx`:

```typescript
import { BubbleMenu as TipTapBubbleMenu, Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Code, Link, Heading1, Heading2, List, ListOrdered } from 'lucide-react';

interface BubbleMenuProps {
  editor: Editor;
}

export function BubbleMenu({ editor }: BubbleMenuProps) {
  if (!editor) return null;

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors ${
      isActive ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]' : 'text-[var(--color-text-secondary)]'
    }`;

  return (
    <TipTapBubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, placement: 'top' }}
      className="flex items-center gap-1 p-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg"
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(editor.isActive('bold'))}
        title="Bold (Ctrl+B)"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(editor.isActive('italic'))}
        title="Italic (Ctrl+I)"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={buttonClass(editor.isActive('strike'))}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={buttonClass(editor.isActive('code'))}
        title="Inline Code (Ctrl+`)"
      >
        <Code size={16} />
      </button>
      
      <div className="w-px h-6 bg-[var(--color-border)] mx-1" />
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 1 }))}
        title="Heading 1 (Ctrl+1)"
      >
        <Heading1 size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={buttonClass(editor.isActive('heading', { level: 2 }))}
        title="Heading 2 (Ctrl+2)"
      >
        <Heading2 size={16} />
      </button>
      
      <div className="w-px h-6 bg-[var(--color-border)] mx-1" />
      
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(editor.isActive('bulletList'))}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(editor.isActive('orderedList'))}
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>
      
      <div className="w-px h-6 bg-[var(--color-border)] mx-1" />
      
      <button
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={buttonClass(editor.isActive('link'))}
        title="Add Link (Ctrl+K)"
      >
        <Link size={16} />
      </button>
    </TipTapBubbleMenu>
  );
}
```

### Integrate BubbleMenu into Editor

Update `Editor.tsx` to render `<BubbleMenu editor={editor} />` inside the editor container.

### Add Editor Styles

Create `src/components/Editor/editor-styles.css` with styling for:
- `.editor-link` - link styling (color, underline)
- `.editor-image` - image max-width, border-radius
- `.editor-table` - table borders, cell padding
- `.code-block` - code block background, font

**Handoff:** Tell Reviewer: *"Step 2 complete. Bubble menu implemented with formatting buttons. Please test selection behavior and button states."*

---

## Step 3: Link Popover

**Task:** Replace the prompt-based link entry with a proper popover UI.

### Install Floating UI

```bash
npm install @floating-ui/react
```

### Create LinkPopover Component

Create `src/components/Editor/LinkPopover.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { ExternalLink, Trash2, Check } from 'lucide-react';

interface LinkPopoverProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}

export function LinkPopover({ editor, isOpen, onClose }: LinkPopoverProps) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (isOpen) {
      const { href } = editor.getAttributes('link');
      const selectedText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to
      );
      setUrl(href || '');
      setText(selectedText || '');
    }
  }, [isOpen, editor]);

  const handleSave = useCallback(() => {
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
    onClose();
  }, [editor, url, onClose]);

  const handleRemove = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    onClose();
  }, [editor, onClose]);

  const handleOpen = useCallback(() => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [url]);

  if (!isOpen) return null;

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="z-50 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl min-w-[300px]"
    >
      <div className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
        Edit Link
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
            Text
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            placeholder="Link text"
          />
        </div>
        
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
            URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]"
            placeholder="https://example.com"
            autoFocus
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border)]">
        <button
          onClick={handleOpen}
          disabled={!url}
          className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] disabled:opacity-50"
        >
          <ExternalLink size={14} />
          Open
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRemove}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 rounded"
          >
            <Trash2 size={14} />
            Remove
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--color-accent)] text-white rounded hover:opacity-90"
          >
            <Check size={14} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Wire Up Link Click Handler

In Editor.tsx, add click handler for links that opens the popover instead of navigating:

```typescript
const handleClick = useCallback((event: MouseEvent) => {
  const link = (event.target as HTMLElement).closest('a');
  if (link) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      // Ctrl+Click opens link
      window.open(link.href, '_blank', 'noopener,noreferrer');
    } else {
      // Regular click opens popover
      setLinkPopoverOpen(true);
    }
  }
}, []);
```

**Handoff:** Tell Reviewer: *"Step 3 complete. Link popover with edit/remove/open functionality. Please test link interactions (click vs Ctrl+click)."*

---

## Step 4: Lists and Task Lists

**Task:** Implement bullet lists, numbered lists, and task lists with proper indent/outdent.

### Add Keyboard Shortcuts

In the editor configuration, add keyboard shortcuts:

```typescript
import { Extension } from '@tiptap/core';

export const CustomKeyboardShortcuts = Extension.create({
  name: 'customKeyboardShortcuts',
  
  addKeyboardShortcuts() {
    return {
      'Tab': () => {
        if (this.editor.isActive('listItem') || this.editor.isActive('taskItem')) {
          return this.editor.commands.sinkListItem('listItem') || 
                 this.editor.commands.sinkListItem('taskItem');
        }
        return false;
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('listItem') || this.editor.isActive('taskItem')) {
          return this.editor.commands.liftListItem('listItem') ||
                 this.editor.commands.liftListItem('taskItem');
        }
        return false;
      },
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
      'Mod-Shift-9': () => this.editor.commands.toggleOrderedList(),
      'Mod-Shift-x': () => this.editor.commands.toggleTaskList(),
    };
  },
});
```

### Add List Styling

Add to `editor-styles.css`:

```css
/* Lists */
.ProseMirror ul,
.ProseMirror ol {
  padding-left: 1.5rem;
}

.ProseMirror li {
  margin: 0.25rem 0;
}

.ProseMirror li > p {
  margin: 0;
}

/* Task Lists */
.ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.ProseMirror ul[data-type="taskList"] li > label {
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.ProseMirror ul[data-type="taskList"] li > div {
  flex: 1;
}

.ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: var(--color-accent);
  cursor: pointer;
}
```

### Add List Buttons to Bubble Menu

Update the bubble menu to include task list toggle.

**Handoff:** Tell Reviewer: *"Step 4 complete. Lists implemented with Tab/Shift+Tab indent, task list checkboxes. Please test nested lists and task toggle."*

---

## Step 5: Code Blocks and Blockquotes

**Task:** Style code blocks (no syntax highlighting yet) and blockquotes.

### Code Block Styling

Add to `editor-styles.css`:

```css
/* Code Blocks */
.ProseMirror pre {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  margin: 1rem 0;
}

.ProseMirror pre code {
  font-family: var(--font-family-mono);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text-primary);
  background: none;
  padding: 0;
}

/* Inline Code */
.ProseMirror code {
  font-family: var(--font-family-mono);
  font-size: 0.875em;
  background-color: var(--color-bg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  color: var(--color-accent);
}

/* Blockquotes */
.ProseMirror blockquote {
  border-left: 4px solid var(--color-accent);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--color-text-secondary);
  font-style: italic;
}

.ProseMirror blockquote p {
  margin: 0;
}

/* Horizontal Rule */
.ProseMirror hr {
  border: none;
  border-top: 2px solid var(--color-border);
  margin: 2rem 0;
}
```

### Add Blockquote Toggle to Bubble Menu

Add blockquote button:

```typescript
<button
  onClick={() => editor.chain().focus().toggleBlockquote().run()}
  className={buttonClass(editor.isActive('blockquote'))}
  title="Blockquote"
>
  <Quote size={16} />
</button>
```

### Keyboard Shortcuts for Code and Quotes

Add to custom keyboard shortcuts:

```typescript
'Mod-`': () => this.editor.commands.toggleCode(),
'Mod-Shift-b': () => this.editor.commands.toggleBlockquote(),
'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
```

**Handoff:** Tell Reviewer: *"Step 5 complete. Code blocks and blockquotes styled. Please verify styling matches design spec and test keyboard shortcuts."*

---

## Step 6: Image Handling and Final Polish

**Task:** Image display, basic popover, and final integration testing.

### Image Extension Configuration

Update Image extension to handle clicks:

```typescript
Image.configure({
  HTMLAttributes: {
    class: 'editor-image',
  },
  allowBase64: true,
}),
```

### Create ImagePopover Component

Create `src/components/Editor/ImagePopover.tsx` (similar structure to LinkPopover):

```typescript
import { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { useFloating, offset, flip, shift } from '@floating-ui/react';
import { Trash2, Check, Image as ImageIcon } from 'lucide-react';

interface ImagePopoverProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  nodePos: number | null;
}

export function ImagePopover({ editor, isOpen, onClose, nodePos }: ImagePopoverProps) {
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift()],
  });

  useEffect(() => {
    if (isOpen && nodePos !== null) {
      const node = editor.state.doc.nodeAt(nodePos);
      if (node && node.type.name === 'image') {
        setSrc(node.attrs.src || '');
        setAlt(node.attrs.alt || '');
      }
    }
  }, [isOpen, nodePos, editor]);

  const handleSave = () => {
    if (nodePos !== null) {
      editor.chain()
        .focus()
        .setNodeSelection(nodePos)
        .updateAttributes('image', { src, alt })
        .run();
    }
    onClose();
  };

  const handleRemove = () => {
    if (nodePos !== null) {
      editor.chain()
        .focus()
        .setNodeSelection(nodePos)
        .deleteSelection()
        .run();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="z-50 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl min-w-[300px]"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)] mb-3">
        <ImageIcon size={16} />
        Edit Image
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
            Image URL
          </label>
          <input
            type="url"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-sm"
            placeholder="https://example.com/image.png"
          />
        </div>
        
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
            Alt Text
          </label>
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-sm"
            placeholder="Describe the image"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
        <button onClick={handleRemove} className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 rounded">
          <Trash2 size={14} className="inline mr-1" />
          Remove
        </button>
        <button onClick={handleSave} className="px-3 py-1.5 text-xs bg-[var(--color-accent)] text-white rounded">
          <Check size={14} className="inline mr-1" />
          Save
        </button>
      </div>
    </div>
  );
}
```

### Image Styling

Add to `editor-styles.css`:

```css
/* Images */
.ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 1rem 0;
  cursor: pointer;
}

.ProseMirror img:hover {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.ProseMirror img.ProseMirror-selectednode {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### Final Integration

1. Export all components from `src/components/Editor/index.ts`
2. Verify all styling imports are in place
3. Run full round-trip test with `markdown-test-suite.md`
4. Fix any serialization issues found

**Handoff:** Tell Reviewer: *"Step 6 complete. Phase 1 implementation finished. Please run full review per REVIEWER_PHASE1_HANDOFF.md."*

---

## Success Criteria Checklist

Before marking Phase 1 complete, verify:

- [ ] All GFM elements render correctly
- [ ] Bubble menu appears on text selection
- [ ] Bubble menu formatting buttons work (bold, italic, code, etc.)
- [ ] Links: Click opens popover, Ctrl+Click opens URL
- [ ] Link popover allows edit, remove, open actions
- [ ] Lists: Tab indents, Shift+Tab outdents
- [ ] Task lists: Checkbox toggles work
- [ ] Code blocks: Styled with mono font, background
- [ ] Blockquotes: Left border styling
- [ ] Images: Click opens popover for edit
- [ ] Keyboard shortcuts all functional
- [ ] Round-trip preserves all formatting
- [ ] No TypeScript errors
- [ ] Build passes

---

## Files Created/Modified This Phase

**New Files:**
- `src/components/Editor/extensions/index.ts`
- `src/components/Editor/BubbleMenu.tsx`
- `src/components/Editor/LinkPopover.tsx`
- `src/components/Editor/ImagePopover.tsx`
- `src/components/Editor/editor-styles.css`

**Modified Files:**
- `src/components/Editor/Editor.tsx`
- `src/components/Editor/index.ts`
- `package.json` (new dependencies)

---

## Notes for Builder

1. **Don't overthink styling** - Basic styling now, polish in Phase 1.5
2. **Test incrementally** - Run `npm run dev` after each step
3. **Use the debug panel** - It's there to help troubleshoot round-trip issues
4. **Commit after each step** - Small, reviewable commits are better

**Ready to start? Begin with Step 1.**
