# Phase 2 Technical Brief: Tables & File Operations

> **Document Type:** Research Brief  
> **Created:** 2026-01-30  
> **Status:** Complete - Ready for Builder  
> **Blocking:** Phase 2 Implementation

---

## Executive Summary

Phase 2 requires implementing two major features: **table editing** and **local file system access**. This brief provides detailed research findings and implementation recommendations for Builder.

### Key Findings

| Area | Finding | Risk Level |
|------|---------|------------|
| File System API | Good cross-browser support (Chrome 86+, Edge 86+, Firefox 111+, Safari 15.2+) | Low |
| Permission Persistence | `queryPermission`/`requestPermission` Chrome/Edge only | Medium |
| Table Extension | Use `@tiptap/extension-table` (4 packages) | Low |
| Table Serialization | `tiptap-markdown` has built-in GFM table support | Low |
| tiptap-markdown Future | Package is deprecated - Official `@tiptap/markdown` in TipTap 3.7+ | Info |

### Recommendations

1. **Use File System Access API** with `<input type="file">` + download fallback
2. **Install TipTap table extensions** (`@tiptap/extension-table`, `-table-row`, `-table-header`, `-table-cell`)
3. **Keep `tiptap-markdown` 0.8.x** - it already handles GFM tables correctly
4. **Implement auto-save** with 2-second debounce, storing file handle in state
5. **Track dirty state** in Zustand store with `isDirty` flag

---

## 1. File System Access API Compatibility

### Browser Support Matrix

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| `showOpenFilePicker()` | 86+ ✅ | 86+ ✅ | ❌ | ❌ |
| `showSaveFilePicker()` | 86+ ✅ | 86+ ✅ | ❌ | ❌ |
| `showDirectoryPicker()` | 86+ ✅ | 86+ ✅ | ❌ | ❌ |
| `FileSystemFileHandle` | 86+ ✅ | 86+ ✅ | 111+ ✅* | 15.2+ ✅* |
| `createWritable()` | 86+ ✅ | 86+ ✅ | 111+ ✅ | 26+ ✅ |
| `queryPermission()` | 86+ ✅ | 86+ ✅ | ❌ | ❌ |
| `requestPermission()` | 86+ ✅ | 86+ ✅ | ❌ | ❌ |
| Origin Private FS | 86+ ✅ | 86+ ✅ | 111+ ✅ | 15.2+ ✅ |

*Firefox/Safari support `FileSystemFileHandle` only via Origin Private File System (OPFS), not user-facing file pickers.

### Feature Detection

```typescript
// Check for full File System Access API support
const hasFileSystemAccess = 'showOpenFilePicker' in window;

// Feature detection function
function supportsFileSystemAccess(): boolean {
  return 'showOpenFilePicker' in window && 
         'showSaveFilePicker' in window;
}
```

### Implementation Pattern

#### Primary: File System Access API (Chrome/Edge)

```typescript
interface FileOperations {
  fileHandle: FileSystemFileHandle | null;
  
  async open(): Promise<string>;
  async save(content: string): Promise<void>;
  async saveAs(content: string): Promise<void>;
}

// Open file
async function openFile(): Promise<{ content: string; handle: FileSystemFileHandle }> {
  const [fileHandle] = await window.showOpenFilePicker({
    types: [{
      description: 'Markdown Files',
      accept: { 'text/markdown': ['.md', '.markdown'] },
    }],
    multiple: false,
  });
  
  const file = await fileHandle.getFile();
  const content = await file.text();
  
  return { content, handle: fileHandle };
}

// Save to existing file
async function saveFile(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

// Save As (new file)
async function saveFileAs(content: string, suggestedName = 'Untitled.md'): Promise<FileSystemFileHandle> {
  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [{
      description: 'Markdown Files',
      accept: { 'text/markdown': ['.md'] },
    }],
  });
  
  await saveFile(handle, content);
  return handle;
}
```

#### Fallback: Traditional File API (Firefox/Safari)

```typescript
// Open file via <input type="file">
function openFileFallback(): Promise<{ content: string; name: string }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown';
    
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const content = await file.text();
      resolve({ content, name: file.name });
    };
    
    input.click();
  });
}

// Save file via download
function saveFileFallback(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
}
```

### Permission Handling

**Important:** `queryPermission` and `requestPermission` are **Chrome/Edge only**. For cross-browser code, handle permission errors gracefully:

```typescript
async function verifyPermission(
  handle: FileSystemFileHandle, 
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> {
  // Chrome/Edge: Use permission APIs
  if ('queryPermission' in handle) {
    const options = { mode };
    
    // Check existing permission
    if (await handle.queryPermission(options) === 'granted') {
      return true;
    }
    
    // Request permission
    if (await handle.requestPermission(options) === 'granted') {
      return true;
    }
    
    return false;
  }
  
  // Firefox/Safari: Permissions not supported
  // Will prompt on first write attempt
  return true;
}
```

### IndexedDB Handle Persistence

File handles are serializable and can be stored in IndexedDB:

```typescript
import { get, set } from 'idb-keyval';

// Store handle for "recent files" feature
async function storeRecentFile(handle: FileSystemFileHandle): Promise<void> {
  const recentFiles = await get<FileSystemFileHandle[]>('recentFiles') ?? [];
  
  // Keep last 5 files, avoid duplicates by name
  const filtered = recentFiles.filter(h => h.name !== handle.name);
  filtered.unshift(handle);
  
  await set('recentFiles', filtered.slice(0, 5));
}

// Restore handle (requires re-permission on new session)
async function getRecentFiles(): Promise<FileSystemFileHandle[]> {
  return await get<FileSystemFileHandle[]>('recentFiles') ?? [];
}
```

---

## 2. TipTap Table Extension

### Package Requirements

Install these packages:

```bash
npm install @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell
```

### Extension Configuration

```typescript
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

const extensions = [
  // ... existing extensions
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: 'rendmd-table',
    },
  }),
  TableRow,
  TableHeader,
  TableCell,
];
```

### Available Commands

| Command | Description | Keyboard Shortcut |
|---------|-------------|-------------------|
| `insertTable({ rows, cols })` | Insert new table | - |
| `addColumnBefore()` | Add column before current | - |
| `addColumnAfter()` | Add column after current | - |
| `addRowBefore()` | Add row before current | - |
| `addRowAfter()` | Add row after current | - |
| `deleteColumn()` | Delete current column | - |
| `deleteRow()` | Delete current row | - |
| `deleteTable()` | Delete entire table | - |
| `mergeCells()` | Merge selected cells | - |
| `splitCell()` | Split merged cell | - |
| `toggleHeaderRow()` | Toggle header row | - |
| `toggleHeaderColumn()` | Toggle header column | - |
| `goToNextCell()` | Move to next cell | Tab |
| `goToPreviousCell()` | Move to previous cell | Shift+Tab |

### Table Editor Component

```tsx
interface TableToolbarProps {
  editor: Editor;
}

export function TableToolbar({ editor }: TableToolbarProps): JSX.Element {
  const canInsertTable = editor.can().insertTable({ rows: 3, cols: 3 });
  const isInTable = editor.isActive('table');
  
  if (!isInTable) {
    return (
      <button
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        disabled={!canInsertTable}
      >
        Insert Table
      </button>
    );
  }
  
  return (
    <div className="table-toolbar">
      <button onClick={() => editor.chain().focus().addColumnBefore().run()}>
        Add Column Before
      </button>
      <button onClick={() => editor.chain().focus().addColumnAfter().run()}>
        Add Column After
      </button>
      <button onClick={() => editor.chain().focus().addRowBefore().run()}>
        Add Row Before
      </button>
      <button onClick={() => editor.chain().focus().addRowAfter().run()}>
        Add Row After
      </button>
      <button onClick={() => editor.chain().focus().deleteColumn().run()}>
        Delete Column
      </button>
      <button onClick={() => editor.chain().focus().deleteRow().run()}>
        Delete Row
      </button>
      <button onClick={() => editor.chain().focus().deleteTable().run()}>
        Delete Table
      </button>
    </div>
  );
}
```

---

## 3. Table-to-Markdown Serialization

### How `tiptap-markdown` Handles Tables

The `tiptap-markdown` package (v0.8.x) has built-in GFM table serialization. From the source code analysis:

```javascript
// From tiptap-markdown/src/extensions/nodes/table.js
serialize(state, node, parent) {
  if (!isMarkdownSerializable(node)) {
    // Falls back to HTML if table has colspan/rowspan
    HTMLNode.storage.markdown.serialize.call(this, state, node, parent);
    return;
  }
  
  state.inTable = true;
  node.forEach((row, p, i) => {
    state.write('| ');
    row.forEach((col, p, j) => {
      if (j) state.write(' | ');
      const cellContent = col.firstChild;
      if (cellContent.textContent.trim()) {
        state.renderInline(cellContent);
      }
    });
    state.write(' |');
    state.ensureNewLine();
    
    // Add delimiter row after header
    if (!i) {
      const delimiterRow = Array.from({ length: row.childCount })
        .map(() => '---')
        .join(' | ');
      state.write(`| ${delimiterRow} |`);
      state.ensureNewLine();
    }
  });
  state.closeBlock(node);
  state.inTable = false;
}
```

### Serialization Constraints

Tables serialize to GFM markdown **only if**:
1. First row contains only `tableHeader` cells (not `tableCell`)
2. No `colspan` or `rowspan` attributes
3. Each cell contains only one child paragraph

If any constraint is violated, `tiptap-markdown` falls back to HTML `<table>` output.

### Example Round-Trip

**Input:**
```markdown
| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |
| Cell 3 | Cell 4 |
```

**Output (identical):**
```markdown
| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |
| Cell 3 | Cell 4 |
```

### Alignment Handling

**Current limitation:** `tiptap-markdown` does NOT preserve column alignment syntax. Input like:

```markdown
| Left | Center | Right |
| :--- | :---: | ---: |
```

Will serialize to:

```markdown
| Left | Center | Right |
| --- | --- | --- |
```

**Mitigation:** This is acceptable for v1.0. Column alignment is rarely critical, and the data is preserved. Can be enhanced in a future version.

---

## 4. Auto-Save Strategy

### Recommended Pattern

```typescript
// In editorStore.ts
interface EditorStore {
  content: string;
  isDirty: boolean;
  fileHandle: FileSystemFileHandle | null;
  fileName: string | null;
  lastSaved: Date | null;
  
  setContent: (content: string) => void;
  markClean: () => void;
  setFileHandle: (handle: FileSystemFileHandle | null, name: string | null) => void;
}

// Auto-save hook
function useAutoSave(editor: Editor | null, fileHandle: FileSystemFileHandle | null) {
  const { isDirty, markClean, content } = useEditorStore();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Debounced save (2 seconds after last edit)
  useEffect(() => {
    if (!isDirty || !fileHandle || !content) return;
    
    const timeoutId = setTimeout(async () => {
      setIsSaving(true);
      setError(null);
      
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        markClean();
      } catch (err) {
        setError(err as Error);
        console.error('Auto-save failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [isDirty, fileHandle, content, markClean]);
  
  return { isSaving, error };
}
```

### Auto-Save Behavior Rules

| Scenario | Behavior |
|----------|----------|
| New document (no file) | No auto-save, prompt on close |
| Opened file | Auto-save after 2s idle |
| Save fails | Show error toast, keep dirty |
| Tab loses focus | Trigger immediate save |
| Browser closing | `beforeunload` warning if dirty |

### Unsaved Changes Warning

```typescript
// In App.tsx or layout component
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isDirty]);
```

---

## 5. Dirty State Management

### Store Updates

```typescript
// stores/editorStore.ts
import { create } from 'zustand';

interface EditorStore {
  // Existing
  content: string;
  showSource: boolean;
  
  // New for Phase 2
  isDirty: boolean;
  fileHandle: FileSystemFileHandle | null;
  fileName: string | null;
  filePath: string | null; // Display path (may not match actual)
  lastSaved: Date | null;
  
  // Actions
  setContent: (content: string) => void;
  openFile: (content: string, handle: FileSystemFileHandle | null, name: string) => void;
  markClean: () => void;
  clearFile: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  content: '',
  showSource: false,
  isDirty: false,
  fileHandle: null,
  fileName: null,
  filePath: null,
  lastSaved: null,
  
  setContent: (content) => set({ 
    content, 
    isDirty: true 
  }),
  
  openFile: (content, handle, name) => set({
    content,
    fileHandle: handle,
    fileName: name,
    filePath: name, // Could enhance with full path if available
    isDirty: false,
    lastSaved: null,
  }),
  
  markClean: () => set({ 
    isDirty: false, 
    lastSaved: new Date() 
  }),
  
  clearFile: () => set({
    content: '',
    fileHandle: null,
    fileName: null,
    filePath: null,
    isDirty: false,
    lastSaved: null,
  }),
}));
```

### UI Indicators

```tsx
// Header component showing dirty state
function FileIndicator(): JSX.Element {
  const { fileName, isDirty, lastSaved } = useEditorStore();
  
  return (
    <div className="file-indicator">
      <span className="filename">
        {fileName ?? 'Untitled'}
        {isDirty && <span className="dirty-dot">●</span>}
      </span>
      {lastSaved && (
        <span className="last-saved">
          Saved {formatRelativeTime(lastSaved)}
        </span>
      )}
    </div>
  );
}
```

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Firefox/Safari file API limitations | High | Medium | Fallback to input/download works well |
| Table alignment loss | Medium | Low | Document as known limitation |
| Auto-save permission revoked | Low | Medium | Catch error, prompt for re-permission |
| Large file performance | Low | Medium | Debounce saves, test with 1MB files |
| tiptap-markdown deprecation | Info | Low | Package works, migration path exists |

### Migration Note

The `tiptap-markdown` package maintainer has deprecated it in favor of TipTap's official `@tiptap/markdown` (v3.7.0+). However:
- Our current `tiptap-markdown@0.8.10` works well
- TipTap v3 has breaking changes
- Recommend staying on current stack for v1.0, plan migration for v1.2+

---

## 7. Test Cases

### File Operations

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Open .md file | Click Open, select file | Content loads in editor |
| Save existing file | Edit, wait 2s | File updated, dirty cleared |
| Save As new file | Ctrl+Shift+S | Picker shows, saves new file |
| Open in Firefox | Click Open | Fallback input works |
| Save in Firefox | Click Save | Downloads file |
| Permission denied | Revoke access, try save | Error toast, stays dirty |

### Table Operations

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Insert 3x3 table | Click Insert Table | Table appears with header row |
| Tab navigation | Tab in cell | Moves to next cell |
| Add row | Click "Add Row After" | New row appears |
| Delete column | Click "Delete Column" | Column removed |
| Parse GFM table | Load markdown with table | Table renders correctly |
| Serialize table | Edit table, check markdown | Valid GFM output |

### Round-Trip

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Simple table | `\| A \| B \|...` | Identical |
| Table with formatting | `\| **bold** \|...` | Identical |
| Table with links | `\| [link](url) \|...` | Identical |
| Table alignment | `\| :--: \|...` | Alignment LOST (known) |

---

## 8. Implementation Checklist

### Builder Phase 2 Tasks

- [ ] Create `src/hooks/useFileSystem.ts` with dual-mode file operations
- [ ] Add file state to `editorStore.ts`
- [ ] Implement `useAutoSave.ts` hook
- [ ] Install and configure TipTap table extensions
- [ ] Create `TableToolbar.tsx` component
- [ ] Add table styles to `editor-styles.css`
- [ ] Add file indicator to header
- [ ] Implement Ctrl+O, Ctrl+S, Ctrl+Shift+S shortcuts
- [ ] Add `beforeunload` handler for unsaved changes
- [ ] Test round-trip with tables

### Reviewer Phase 2 Checklist

- [ ] File open works in Chrome + Firefox
- [ ] File save works in Chrome + Firefox
- [ ] Auto-save triggers after 2s
- [ ] Dirty indicator shows/hides correctly
- [ ] Table insert/edit/delete works
- [ ] Table round-trip passes
- [ ] Keyboard navigation in tables
- [ ] No console errors

---

## References

- [File System Access API - Chrome Developers](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
- [MDN: FileSystemFileHandle](https://developer.mozilla.org/docs/Web/API/FileSystemFileHandle)
- [TipTap Table Extension](https://tiptap.dev/docs/editor/extensions/tables)
- [tiptap-markdown GitHub](https://github.com/aguingand/tiptap-markdown)
- [browser-fs-access Polyfill](https://github.com/nicolo-ribaudo/browser-fs-access)

---

*Research completed by Researcher Agent. Ready for Builder handoff.*
