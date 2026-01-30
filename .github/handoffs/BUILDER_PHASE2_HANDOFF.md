# Builder Handoff: Phase 2 - Tables & File Operations

> **Created:** 2026-01-30  
> **Research Brief:** [docs/research/PHASE2_TECHNICAL_BRIEF.md](../research/PHASE2_TECHNICAL_BRIEF.md)  
> **Phase:** 2  
> **Estimated Effort:** 1 week

---

## Summary

Phase 2 adds two major features to RendMD:
1. **Table editing** - Insert, edit, and delete GFM tables
2. **File operations** - Open, save, auto-save local `.md` files

Research is complete. Key decisions are made. Ready to build.

---

## Quick Start

### Install Dependencies

```bash
npm install @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell
```

### Key Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useFileSystem.ts` | Create | File open/save with fallback |
| `src/hooks/useAutoSave.ts` | Create | Debounced auto-save |
| `src/stores/editorStore.ts` | Modify | Add file state |
| `src/components/Editor/extensions/index.ts` | Modify | Add table extensions |
| `src/components/Editor/TableToolbar.tsx` | Create | Table editing controls |
| `src/components/Header/FileIndicator.tsx` | Create | Filename + dirty indicator |

---

## Task 1: File System Hook

Create `src/hooks/useFileSystem.ts`:

```typescript
// Key exports:
export function useFileSystem() {
  return {
    openFile,    // Opens picker or fallback input
    saveFile,    // Saves to existing handle
    saveFileAs,  // Shows save picker
    hasNativeFS: 'showOpenFilePicker' in window,
  };
}
```

**Requirements:**
- Detect File System Access API support
- Use native API on Chrome/Edge
- Fallback to `<input type="file">` + download on Firefox/Safari
- Handle permission errors gracefully

See [Technical Brief §1](../research/PHASE2_TECHNICAL_BRIEF.md#1-file-system-access-api-compatibility) for implementation patterns.

---

## Task 2: Store Updates

Modify `src/stores/editorStore.ts` to add:

```typescript
interface EditorStore {
  // Existing...
  
  // New for Phase 2
  isDirty: boolean;
  fileHandle: FileSystemFileHandle | null;
  fileName: string | null;
  lastSaved: Date | null;
  
  // New actions
  openFile: (content: string, handle: FileSystemFileHandle | null, name: string) => void;
  markClean: () => void;
  clearFile: () => void;
}
```

**Key behavior:**
- `setContent()` should set `isDirty: true`
- `markClean()` should set `isDirty: false` and update `lastSaved`
- `openFile()` should reset dirty state

---

## Task 3: Auto-Save Hook

Create `src/hooks/useAutoSave.ts`:

```typescript
export function useAutoSave(
  content: string,
  fileHandle: FileSystemFileHandle | null
): { isSaving: boolean; error: Error | null }
```

**Requirements:**
- 2-second debounce after last edit
- Only save if `fileHandle` exists and `isDirty`
- Call `markClean()` on success
- Expose `isSaving` for UI indicator
- Handle errors (show toast, keep dirty)

---

## Task 4: Table Extensions

Modify `src/components/Editor/extensions/index.ts`:

```typescript
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

// Add to extensions array:
Table.configure({
  resizable: true,
  HTMLAttributes: { class: 'rendmd-table' },
}),
TableRow,
TableHeader,
TableCell,
```

---

## Task 5: Table Toolbar

Create `src/components/Editor/TableToolbar.tsx`:

**When NOT in table:**
- Show "Insert Table" button

**When IN table (cursor in table cell):**
- Add Row Above/Below
- Add Column Before/After
- Delete Row/Column
- Delete Table

Use `editor.isActive('table')` to detect context.

---

## Task 6: Keyboard Shortcuts

Add to `src/components/Editor/extensions/keyboard-shortcuts.ts`:

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save file |
| `Ctrl+Shift+S` | Save As |
| `Tab` (in table) | Next cell |
| `Shift+Tab` (in table) | Previous cell |

**Note:** Tab/Shift+Tab in tables is built into TipTap table extension.

---

## Task 7: UI Components

### File Indicator (Header)

Shows in header:
- Filename (or "Untitled")
- Dirty indicator (● dot when unsaved)
- "Saved X ago" timestamp

### Table Styles

Add to `src/components/Editor/editor-styles.css`:

```css
.rendmd-table {
  border-collapse: collapse;
  margin: 1rem 0;
  width: 100%;
}

.rendmd-table th,
.rendmd-table td {
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.75rem;
  min-width: 100px;
}

.rendmd-table th {
  background: var(--color-surface-elevated);
  font-weight: 600;
}

.rendmd-table tr:hover td {
  background: var(--color-surface-hover);
}

/* Selected cell */
.rendmd-table td.selectedCell,
.rendmd-table th.selectedCell {
  background: var(--color-accent-muted);
}
```

---

## Task 8: Beforeunload Handler

Add to `App.tsx`:

```typescript
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [isDirty]);
```

---

## Known Limitations (Acceptable)

1. **Column alignment not preserved** - GFM `:---:` syntax lost on round-trip
2. **No recent files** - IndexedDB persistence deferred to Phase 3
3. **Firefox/Safari UX** - Download instead of in-place save (expected)

---

## Success Criteria

1. [ ] Can open `.md` file via Ctrl+O
2. [ ] Can save file via Ctrl+S (in-place on Chrome, download on Firefox)
3. [ ] Auto-save triggers after 2s of inactivity
4. [ ] Dirty indicator shows unsaved changes
5. [ ] Beforeunload warning on close with unsaved changes
6. [ ] Can insert 3x3 table with header row
7. [ ] Tab navigates between table cells
8. [ ] Can add/remove rows and columns
9. [ ] Table survives markdown round-trip
10. [ ] All existing tests still pass

---

## Resources

- [Full Technical Brief](../research/PHASE2_TECHNICAL_BRIEF.md)
- [TipTap Table Docs](https://tiptap.dev/docs/editor/extensions/tables)
- [File System Access API Reference](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)

---

*Good luck, Builder! 🔨*
