# Builder Handoff: Phase 2.5 Completion → Phase 3

**From:** Researcher  
**To:** Builder  
**Date:** 2026-01-30  
**Priority:** Ready for implementation

---

## Summary

Phases 0-2 are complete. Phase 2.5 research is done. You have two tasks:

1. **Finish Phase 2.5** - Table enhancements (some deferred, some to implement)
2. **Begin Phase 3** - Source View & Frontmatter

---

## Phase 2.5: Remaining Work

### ✅ Already Complete (from Phase 2)
- Table rendering with cell navigation
- Add/remove row/column buttons
- GFM compliance guards (header protection, no nesting, column count guards)
- TableToolbar with smart button states

### ⏳ Implement Now

#### 1. Tab Navigation Between Cells
**Priority:** High  
**Effort:** Small

```typescript
// In table extension configuration
Table.configure({
  // existing config...
}).extend({
  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.goToNextCell(),
      'Shift-Tab': () => this.editor.commands.goToPreviousCell(),
    }
  }
})
```

TipTap table extension already has `goToNextCell()` and `goToPreviousCell()` commands built-in.

#### 2. Enter Creates New Row at End
**Priority:** Medium  
**Effort:** Small

When cursor is in the last cell of the last row, Enter should add a new row:

```typescript
Enter: ({ editor }) => {
  // Only in tables
  if (!editor.isActive('table')) return false;
  
  // Check if in last row, last cell
  const { $from } = editor.state.selection;
  // ... position detection logic
  
  return editor.commands.addRowAfter();
}
```

#### 3. Column Alignment Controls
**Priority:** Medium  
**Effort:** Medium  
**Note:** Visual-only for v1.0 (see ADR-020)

Add alignment buttons to TableToolbar:
- Left align (default)
- Center align  
- Right align

Uses `setCellAttribute('textAlign', 'center')` command. Alignment applies visually but does NOT persist to GFM markdown (`:---:` syntax not supported by `tiptap-markdown`).

**CSS needed:**
```css
.ProseMirror td[style*="text-align: center"],
.ProseMirror th[style*="text-align: center"] {
  text-align: center;
}
/* Similar for left/right */
```

### ⏸️ Deferred (Not for v1.0)

#### Grid Picker for Table Insertion
Per research, this is a "nice to have" for v1.2+. Current insert table command is sufficient for v1.0.

#### Column Resize Handles
Available via `resizable: true` but widths are visual-only (not saved to GFM). Optional enhancement.

---

## Phase 3: Source View & Frontmatter

### Overview
Phase 3 adds bidirectional source editing and YAML frontmatter support.

### 3A: Source View

#### Requirements
| Feature | Notes |
|---------|-------|
| Toggle button | Header, near theme toggle |
| Source panel | Side panel (not modal) |
| Editable | Two-way sync, not read-only |
| Syntax highlighting | Markdown in source view |
| Keyboard shortcut | Ctrl+/ to toggle |
| Persist preference | localStorage |

#### Architecture Approach

**Option 1: Split View (Recommended)**
- Rendered view on left, source on right
- Or tab-based toggle between views
- Sync on blur or debounced keystroke

**Option 2: Overlay**
- Source replaces rendered temporarily
- Simpler but less discoverable

**Sync Strategy:**
```typescript
// Rendered → Source
const markdown = editor.storage.markdown.getMarkdown();
setSourceContent(markdown);

// Source → Rendered  
editor.commands.setContent(parseMarkdown(sourceContent));
```

**Syntax Highlighting:**
Use Shiki (already installed) with `markdown` language:
```typescript
const html = await shiki.codeToHtml(source, { lang: 'markdown', theme: currentTheme });
```

Or use a simple `<textarea>` with monospace font for v1.0 simplicity.

### 3B: Frontmatter

#### Requirements
| Feature | Notes |
|---------|-------|
| YAML parsing | Use `yaml` library (add to deps) |
| Collapsible panel | Above or beside editor |
| Common fields | title, author, date, tags |
| Custom fields | Key-value pair editor |
| Sync to markdown | Update frontmatter block on change |

#### Architecture Approach

**Parsing Flow:**
```typescript
// On file load
const { frontmatter, content } = parseFrontmatter(markdown);
// frontmatter = { title: "...", author: "...", ... }
// content = markdown without --- blocks

// Store in Zustand
useFrontmatterStore.setState({ data: frontmatter });

// Pass content (without frontmatter) to TipTap
editor.commands.setContent(content);
```

**Serialization Flow:**
```typescript
// On save
const content = editor.storage.markdown.getMarkdown();
const frontmatter = useFrontmatterStore.getState().data;
const fullMarkdown = serializeFrontmatter(frontmatter) + content;
```

**UI Component:**
```tsx
// FrontmatterPanel.tsx
interface FrontmatterPanelProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

// Render form fields for known keys
// Render key-value editor for custom keys
```

#### Install Dependency
```bash
npm install yaml
```

### 3C: Theming Completion

**Note:** Per Phase 1.5 completion notes, all four themes are already complete:
- ✅ Dark basic
- ✅ Light basic  
- ✅ Dark glassmorphism
- ✅ Light glassmorphism

Theme switcher is already in header. This section of Phase 3 may already be done - verify.

---

## Key Files to Modify/Create

### Phase 2.5
| File | Action |
|------|--------|
| `src/components/Editor/extensions/table/` | Add keyboard shortcuts |
| `src/components/Editor/TableToolbar.tsx` | Add alignment buttons |
| `src/themes/*.css` | Add alignment CSS if needed |

### Phase 3
| File | Action |
|------|--------|
| `src/components/SourceView/SourceView.tsx` | Create |
| `src/components/SourceView/SourceEditor.tsx` | Create (textarea or CodeMirror) |
| `src/components/Frontmatter/FrontmatterPanel.tsx` | Create |
| `src/components/Frontmatter/FieldEditor.tsx` | Create |
| `src/stores/frontmatterStore.ts` | Create |
| `src/hooks/useFrontmatter.ts` | Create |
| `src/utils/frontmatterParser.ts` | Create |
| `src/components/Header/Header.tsx` | Add source toggle button |

---

## Research References

- [PHASE2.5_TABLE_ENHANCEMENTS.md](../../docs/research/PHASE2.5_TABLE_ENHANCEMENTS.md) - Table feature limitations
- [PHASE2_TECHNICAL_BRIEF.md](../../docs/research/PHASE2_TECHNICAL_BRIEF.md) - File System API details
- [PROJECT_CHRONICLE.md](../../docs/PROJECT_CHRONICLE.md) - ADR-020 on table limitations

---

## Questions for User (Before Starting)

### ✅ Decisions Made (2026-01-30)

1. **Source View Layout:** Three-mode toggle:
   - **Render only** (default) - Just the rendered editor
   - **Source only** - Just the source view
   - **Split view** - Side-by-side (rendered left, source right)

2. **Source Editor:** Shiki syntax highlighting for markdown source (already installed)

3. **Frontmatter Position:** Collapsible panel above the editor (where users expect it - top of file)

---

## Updated Architecture Based on Decisions

### View Mode State

```typescript
// In editorStore.ts or new viewStore.ts
type ViewMode = 'render' | 'source' | 'split';

interface ViewState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}
```

### Header Toggle UI

Three-way toggle button group in header:
```tsx
// Conceptual - use Lucide icons
<ToggleGroup value={viewMode} onValueChange={setViewMode}>
  <ToggleItem value="render" title="Rendered view">
    <Eye className="w-4 h-4" />
  </ToggleItem>
  <ToggleItem value="split" title="Split view">
    <Columns2 className="w-4 h-4" />
  </ToggleItem>
  <ToggleItem value="source" title="Source view">
    <Code className="w-4 h-4" />
  </ToggleItem>
</ToggleGroup>
```

### Layout Component

```tsx
// EditorLayout.tsx
function EditorLayout() {
  const { viewMode } = useViewStore();
  
  return (
    <div className="flex flex-col h-full">
      {/* Frontmatter panel - always above */}
      <FrontmatterPanel />
      
      {/* Editor area */}
      <div className="flex flex-1 min-h-0">
        {(viewMode === 'render' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'w-1/2' : 'w-full'}>
            <Editor />
          </div>
        )}
        {(viewMode === 'source' || viewMode === 'split') && (
          <div className={viewMode === 'split' ? 'w-1/2 border-l' : 'w-full'}>
            <SourceEditor />
          </div>
        )}
      </div>
    </div>
  );
}
```

### Shiki Source Editor

```tsx
// SourceEditor.tsx
function SourceEditor() {
  const [html, setHtml] = useState('');
  const { content, setContent } = useEditorStore();
  const { resolvedTheme } = useTheme();
  
  // Highlight on content change
  useEffect(() => {
    const highlight = async () => {
      const highlighted = await codeToHtml(content, {
        lang: 'markdown',
        theme: resolvedTheme === 'dark' ? 'github-dark' : 'github-light',
      });
      setHtml(highlighted);
    };
    highlight();
  }, [content, resolvedTheme]);
  
  // For editing, use contenteditable or overlay textarea
  // The highlighted HTML is display-only, actual editing via textarea
}
```

**Note:** Shiki produces read-only HTML. For an editable source view, use one of:
- **Overlay approach:** Transparent `<textarea>` over Shiki HTML
- **CodeMirror/Monaco:** Full editor with markdown mode
- **Simple textarea:** Monospace with Shiki preview panel

Recommend: **Overlay approach** for v1.0 (simpler than Monaco, prettier than plain textarea)

### Frontmatter Collapsible Panel

```tsx
// FrontmatterPanel.tsx
function FrontmatterPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const { data, updateField } = useFrontmatterStore();
  
  if (!data || Object.keys(data).length === 0) {
    return null; // No frontmatter, don't show panel
  }
  
  return (
    <div className="border-b border-[var(--color-border)]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full p-2 hover:bg-[var(--color-bg-hover)]"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
        <span className="text-sm font-medium">Frontmatter</span>
      </button>
      
      {isOpen && (
        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Field editors */}
        </div>
      )}
    </div>
  );
}
```

---

## Success Criteria

### Phase 2.5 Complete When:
- [ ] Tab/Shift+Tab navigates between table cells
- [ ] Alignment buttons in TableToolbar (visual-only OK)
- [ ] Build passes, no new warnings

### Phase 3 Complete When:
- [ ] Three-way view toggle in header (render / split / source)
- [ ] Ctrl+/ cycles through view modes
- [ ] Source view has Shiki markdown highlighting
- [ ] Source view is editable with bidirectional sync
- [ ] Frontmatter panel appears above editor when frontmatter exists
- [ ] Frontmatter panel is collapsible
- [ ] Changes in frontmatter panel update markdown
- [ ] View mode preference persists across sessions

---

**Ready to build. Good luck!** 🚀
