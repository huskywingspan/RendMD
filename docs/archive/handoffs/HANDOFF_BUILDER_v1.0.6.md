# Builder Handoff — v1.0.6 Housekeeping

> **Date:** 2026-02-09  
> **From:** Researcher  
> **To:** Builder  
> **Status:** Ready for implementation  
> **Branch from:** Current main (v1.0.5 deployed)

---

## Overview

Four housekeeping features before the v1.1 AI milestone. These are quality-of-life improvements that round out the core editor experience.

| # | Feature | Effort | New Files | Modified Files |
|---|---------|--------|-----------|----------------|
| 1 | Find & Replace | M | 2 | 3 |
| 2 | Recent Files | M | 2 | 4 |
| 3 | Sync Scroll (split view) | S | 1 | 1 |
| 4 | Screen Reader A11y Fixes | S | 0 | 6 |

---

## Workstream 1: Find & Replace

### Problem
No in-editor search. Browser Ctrl+F doesn't highlight within ProseMirror's rendered DOM nodes effectively, and it doesn't work at all in source view.

### Approach
Build a custom ProseMirror search plugin with TipTap decorations. There is **no official TipTap search extension** — the community one (`tiptap-extension-search-and-replace`) may not be compatible with TipTap 3.x. Build from scratch using ProseMirror's `Plugin` and `Decoration` API — estimated ~300 LOC per PROJECT_CHRONICLE.

### Implementation Plan

#### 1. New file: `src/components/Editor/extensions/search.ts`

A TipTap `Extension.create()` that wraps a ProseMirror plugin:

```typescript
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SearchOptions {
  searchTerm: string;
  replaceTerm: string;
  caseSensitive: boolean;
}

export const searchPluginKey = new PluginKey('search');

export const SearchExtension = Extension.create<SearchOptions>({
  name: 'search',
  // Add commands: setSearchTerm, nextMatch, prevMatch, replace, replaceAll
  // Add ProseMirror plugin with decoration-based highlighting
});
```

**Key behavior:**
- Stores `searchTerm`, `replaceTerm`, `caseSensitive`, `currentMatchIndex`, `totalMatches` in plugin state
- On searchTerm change → scan document text nodes → create `Decoration.inline()` for each match
- Highlight class: `.search-highlight` (yellow bg) and `.search-highlight-active` (orange bg for current match)
- Commands exposed to TipTap:
  - `setSearchTerm(term: string)` → triggers re-scan
  - `nextMatch()` / `prevMatch()` → cycle currentMatchIndex, scroll into view
  - `replaceMatch(replacement: string)` → replace current match via transaction
  - `replaceAll(replacement: string)` → replace all matches
  - `clearSearch()` → remove all decorations

#### 2. New file: `src/components/Editor/SearchBar.tsx`

A floating search bar component (like VS Code's Ctrl+F bar):

```
┌──────────────────────────────────────────────────────────┐
│ 🔍 [search input          ] [↑] [↓]  3 of 17  [×]      │
│    [replace input         ] [Replace] [Replace All]      │
└──────────────────────────────────────────────────────────┘
```

**UI details:**
- Position: fixed to top-right of editor area (above content, below toolbar)
- Appears on Ctrl+F, focuses search input immediately
- Escape or × button closes and clears highlights
- ↑/↓ buttons (or Enter / Shift+Enter) cycle through matches
- Match count display: "3 of 17" or "No results"
- Replace row hidden by default, toggle with chevron or Ctrl+H
- Case-sensitive toggle button (Aa icon)
- Use existing theme variables for styling
- Lazy-load with `React.lazy` (follows existing pattern)

**Props:**
```typescript
interface SearchBarProps {
  editor: Editor;
  onClose: () => void;
}
```

#### 3. Modify: `src/components/Editor/extensions/index.ts`

Add `SearchExtension` to `createEditorExtensions()` array.

#### 4. Modify: `src/App.tsx`

- Add `isSearchOpen` state
- Add `Ctrl+F` to `handleKeyDown` → `e.preventDefault()` + `setIsSearchOpen(true)`
- Add `Ctrl+H` handling → open search with replace visible (note: Ctrl+H currently opens shortcuts modal — **reassign shortcuts modal to Ctrl+?** or another key, and use Ctrl+H for replace which is the universal standard)
- Render `<SearchBar>` conditionally when `isSearchOpen && editor`

#### 5. Modify: `src/components/Editor/editor-styles.css`

Add highlight styles:
```css
.search-highlight {
  background-color: rgba(255, 235, 59, 0.4);
  border-radius: 2px;
}

.search-highlight-active {
  background-color: rgba(255, 152, 0, 0.6);
  border-radius: 2px;
}
```

#### 6. Update ShortcutsModal

- Change shortcuts modal trigger from Ctrl+H to another key (suggest Ctrl+Shift+/ or just keep it as a button-only action)
- Add Find (Ctrl+F) and Replace (Ctrl+H) to the shortcuts data

### Keyboard shortcut conflict resolution

| Shortcut | Current | New |
|----------|---------|-----|
| Ctrl+F | Browser find (passthrough) | **Find in document** |
| Ctrl+H | Shortcuts modal | **Replace** (standard across editors) |
| Ctrl+Shift+/ | Unused | **Shortcuts modal** (or button-only) |

### Edge cases
- Search in source view: **Not in v1.0.6 scope.** Browser Ctrl+F works for textareas. The TipTap search only operates on the rendered view.
- Empty search term: No decorations, disable next/prev buttons
- Regex search: **Not in v1.0.6 scope.** Plain text matching only.

---

## Workstream 2: Recent Files List

### Problem
No way to quickly reopen previously edited files. Users must use the OS file dialog every time.

### Approach
Store recent file metadata in the Zustand store (persisted to localStorage). For browsers with File System Access API support, also store `FileSystemFileHandle` objects in IndexedDB (using `idb-keyval`) for one-click reopening.

### Implementation Plan

#### 1. Install dependency

```bash
npm install idb-keyval
```

Tiny (< 1KB gzip), zero-dependency IndexedDB wrapper. Already recommended in the Phase 2 technical brief.

#### 2. New file: `src/utils/recentFiles.ts`

IndexedDB operations for file handles:

```typescript
import { get, set, del } from 'idb-keyval';

export interface RecentFileEntry {
  name: string;
  lastOpened: number; // Unix timestamp ms
  handleKey?: string; // Key in IndexedDB for the FileSystemFileHandle
}

const MAX_RECENT = 8;

export async function storeFileHandle(name: string, handle: FileSystemFileHandle): Promise<string>;
export async function getFileHandle(key: string): Promise<FileSystemFileHandle | null>;
export async function removeFileHandle(key: string): Promise<void>;
export async function verifyPermission(handle: FileSystemFileHandle): Promise<boolean>;
```

**`verifyPermission` pattern:**
```typescript
export async function verifyPermission(handle: FileSystemFileHandle): Promise<boolean> {
  const options = { mode: 'read' as FileSystemPermissionMode };
  if (await handle.queryPermission(options) === 'granted') return true;
  if (await handle.requestPermission(options) === 'granted') return true;
  return false;
}
```

#### 3. New file: `src/components/UI/RecentFiles.tsx`

A section in the EmptyState showing recent files:

```
┌─────────────────────────────────────────┐
│  📄 design-document.md      2 hours ago │
│  📄 README.md               yesterday   │
│  📄 meeting-notes.md        3 days ago  │
│  📄 blog-post.md            last week   │
│     [Clear Recent Files]                │
└─────────────────────────────────────────┘
```

**UI details:**
- Show between the template grid and the action buttons in EmptyState
- Each entry: file icon + name + relative time ("2 hours ago", "yesterday")
- Click → attempt to reopen via stored handle (if available) or show message that file must be reopened via dialog
- If permission denied → graceful fallback with toast "Permission needed, opening file dialog"
- "Clear Recent Files" link at bottom
- If no recent files, don't render the section at all
- Max 8 entries

#### 4. Modify: `src/stores/editorStore.ts`

Add to store interface:
```typescript
recentFiles: RecentFileEntry[];
addRecentFile: (entry: RecentFileEntry) => void;
removeRecentFile: (name: string) => void;
clearRecentFiles: () => void;
```

Add `recentFiles` to `PersistedState` and `partialize` — this part is plain JSON (names + timestamps), safe for localStorage. The handles go in IndexedDB separately.

#### 5. Modify: `src/hooks/useFileSystem.ts`

After successful `openFile()` and `saveFileAs()`:
- Call `addRecentFile({ name, lastOpened: Date.now(), handleKey })` 
- Call `storeFileHandle(name, handle)` to persist handle in IndexedDB

Add new function:
```typescript
const openRecentFile = async (entry: RecentFileEntry): Promise<void> => {
  if (entry.handleKey) {
    const handle = await getFileHandle(entry.handleKey);
    if (handle && await verifyPermission(handle)) {
      const file = await handle.getFile();
      const text = await file.text();
      // Set content, fileName, etc. (same as current openFile flow)
      return;
    }
  }
  // Fallback: open file dialog
  addToast('Could not reopen file directly. Please select it from the file dialog.', 'info');
  await openFile();
};
```

#### 6. Modify: `src/components/UI/EmptyState.tsx`

Import and render `<RecentFiles />` between the template grid and the actions row, conditionally based on `recentFiles.length > 0`.

### Browser compatibility
- **Chrome/Edge:** Full support — handles stored and reopened
- **Firefox/Safari:** `recentFiles` list shows names only (no handle storage). Click shows a message + opens file dialog. `hasNativeFS` flag already exists in `useFileSystem` — gate handle storage behind it.

---

## Workstream 3: Sync Scroll (Split View)

### Problem
In split mode, the rendered and source panels scroll independently — editing at the bottom of one panel shows the top of the other.

### Approach
Proportional scroll sync (ratio-based). This is the simplest approach and works well enough for most documents. Line-based mapping is far more complex and not warranted for v1.0.6.

### Implementation Plan

#### 1. New file: `src/hooks/useScrollSync.ts`

```typescript
import { useCallback, useRef } from 'react';

interface ScrollSyncOptions {
  enabled: boolean;
}

export function useScrollSync({ enabled }: ScrollSyncOptions) {
  const isSyncing = useRef(false);
  const sourceRef = useRef<HTMLElement | null>(null);
  const renderedRef = useRef<HTMLElement | null>(null);

  const handleRenderedScroll = useCallback(() => {
    if (!enabled || isSyncing.current || !sourceRef.current || !renderedRef.current) return;
    isSyncing.current = true;
    requestAnimationFrame(() => {
      const el = renderedRef.current!;
      const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
      const target = sourceRef.current!;
      target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
      // Release lock after a tick to prevent feedback loop
      requestAnimationFrame(() => { isSyncing.current = false; });
    });
  }, [enabled]);

  const handleSourceScroll = useCallback(() => {
    // Mirror logic, scrolling rendered from source
    // Same pattern with isSyncing guard
  }, [enabled]);

  return { sourceRef, renderedRef, handleRenderedScroll, handleSourceScroll };
}
```

**Key details:**
- `isSyncing` ref prevents feedback loops (A scrolls B scrolls A)
- Double `requestAnimationFrame` to release the guard after the browser paints
- Only active when `viewMode === 'split'` (the hook takes `enabled` flag)
- Follows existing `useTOC` pattern for scroll handling

#### 2. Modify: `src/App.tsx`

In the split view section (~L272-L295):

- Call `useScrollSync({ enabled: viewMode === 'split' })`
- Attach `renderedRef` to the rendered editor's scrollable container (`div.overflow-y-auto`)
- Attach `sourceRef` to the source editor container
- Wire `onScroll` handlers to both containers
- The `SourceEditor` component needs to accept a ref for its scrollable element (may need `forwardRef` or a callback ref prop)

#### 3. Possibly modify: `src/components/SourceView/SourceEditor.tsx`

May need to expose the textarea/container ref so App.tsx can attach scroll sync. Options:
- Add an `onScroll` prop
- Add a `scrollRef` callback prop
- Use `forwardRef`

Prefer the callback prop approach (simplest, no API change to existing refs).

### Limitations (acceptable for v1.0.6)
- **Proportional sync is approximate** — large code blocks or images in rendered view can cause slight misalignment. This is the same tradeoff VS Code's minimap uses.
- **One-directional at a time** — whichever panel the user scrolls drives the other. The `isSyncing` guard handles this.
- **Only active in split mode** — no-op in render-only or source-only modes.
- **Mobile: not applicable** — split mode is disabled below 768px.

---

## Workstream 4: Screen Reader Accessibility Fixes

### Problem
Structural ARIA is in place but several gaps exist: missing focus traps on 2 modals, removed ProseMirror focus ring, no skip-to-content link, no `aria-live` regions for dynamic announcements.

### Fixes (6 files, no new files)

#### Fix 1: Add focus traps to ImageInsertModal and SettingsModal

Both modals have Escape + backdrop click handling but **no Tab trapping**. Copy the pattern from `ShortcutsModal.tsx` (L58-L85):

```typescript
useEffect(() => {
  const modal = modalRef.current;
  if (!modal) return;
  const focusable = modal.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  
  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };
  
  modal.addEventListener('keydown', handleTab);
  first?.focus();
  return () => modal.removeEventListener('keydown', handleTab);
}, []);
```

**Files:** `src/components/Modals/ImageInsertModal.tsx`, `src/components/Modals/SettingsModal.tsx`

#### Fix 2: Restore ProseMirror focus ring

In `src/components/Editor/editor-styles.css`, the current rule:
```css
.ProseMirror:focus {
  outline: none;
}
```

Replace with a visible focus ring:
```css
.ProseMirror:focus {
  outline: 2px solid var(--theme-input-focus, #3b82f6);
  outline-offset: -2px;
  border-radius: 4px;
}
```

This uses the existing `--theme-input-focus` variable each theme already defines.

#### Fix 3: Add skip-to-content link

In `src/App.tsx`, as the very first child inside the root div:

```tsx
<a
  href="#main-editor"
  className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--theme-accent-primary)] focus:text-white focus:rounded-lg"
>
  Skip to editor
</a>
```

And add `id="main-editor"` to the `<main>` element that wraps the editor area.

Tailwind's `sr-only` class hides it visually; `focus:not-sr-only` reveals it when Tab-focused. Standard a11y pattern.

#### Fix 4: Add `aria-live` region for status announcements

In `src/App.tsx`, add a visually-hidden live region:

```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only" id="status-announcements">
  {statusAnnouncement}
</div>
```

Update `statusAnnouncement` string when:
- Auto-save completes → "Document saved"
- View mode changes → "Switched to source view"
- File opened → "Opened {fileName}"
- File created → "New file created"

This can be a simple string state in App.tsx or a small addition to the editor store.

#### Fix 5: Add `aria-label` to main editor region

In `src/components/Editor/Editor.tsx`, add `aria-label` to the editor content wrapper:

```tsx
<div
  aria-label={`Editing ${fileName || 'untitled document'}`}
  role="region"
>
  <EditorContent editor={editor} />
</div>
```

#### Fix 6: Resolve existing eslint-disable comments

There are 4 `eslint-disable-next-line jsx-a11y/*` comments in the codebase:

| File | Issue | Fix |
|------|-------|-----|
| `Editor.tsx` L303 | `click-events-have-key-events` on editor wrapper div | Add `onKeyDown` handler (noop — TipTap handles keyboard) + `role="textbox"` + `tabIndex={0}` |
| `SettingsModal.tsx` L35 | `click-events-have-key-events` + `no-noninteractive-element-interactions` on backdrop | Add `onKeyDown` for Escape (already handled above) + change to `<div role="presentation">` |
| `LinkPopover.tsx` L101 | `no-noninteractive-element-interactions` on form | Change `<form>` click handler to use `onSubmit` instead |
| `ImagePopover.tsx` L104 | `no-noninteractive-element-interactions` on form | Same as LinkPopover |

Goal: **Zero `eslint-disable` comments for a11y rules** after this workstream.

---

## Testing Expectations

| Feature | Test Approach |
|---------|--------------|
| Find & Replace | Unit test: search plugin finds matches, counts are correct, replace works |
| Recent Files | Unit test: `recentFiles` store actions (add, remove, clear, max 8 dedup) |
| Scroll Sync | Manual test: scroll one panel, other follows proportionally |
| A11y | Manual screen reader test (NVDA or Windows Narrator); verify focus trap; verify skip link |

### New test files
- `src/utils/recentFiles.test.ts` — test IndexedDB operations (mock `idb-keyval`)
- Add cases to `editorStore.test.ts` — test `recentFiles` actions

---

## Build Expectations

- 0 TypeScript errors
- 0 ESLint errors (including jsx-a11y, with **zero** remaining eslint-disable comments for a11y rules)
- All existing 101 tests pass + new tests
- Bundle: main chunk stays under 400 KB gzip (search plugin is small; `idb-keyval` is < 1KB)

---

## Commit & Deploy

Single commit: `feat: v1.0.6 — find/replace, recent files, scroll sync, a11y`  
Push to main → Cloudflare Pages auto-deploy.

---

## Key Points for Builder

1. **Search extension is from scratch** — don't try to install a community package. ProseMirror `Plugin` + `Decoration` API is the way. Look at the `SearchPlugin` pattern in ProseMirror docs.
2. **Ctrl+H shortcut conflict** — must be reassigned from shortcuts modal to find/replace. This is the universal standard (VS Code, Chrome DevTools, every editor).
3. **`idb-keyval` for handles** — the File System Access API handles aren't serializable to localStorage. The Zustand store only holds `RecentFileEntry[]` (plain JSON). Handles go in IndexedDB.
4. **Scroll sync is proportional** — don't attempt line-based mapping. Ratio-based scroll with `isSyncing` guard is sufficient and low-risk.
5. **A11y fixes are straightforward** — mostly copy-pasting the focus trap pattern from ShortcutsModal and adding standard attributes. No architectural changes.
6. **SearchBar is lazy-loaded** — follow the existing `React.lazy` pattern used for SettingsModal, ShortcutsModal, etc.
