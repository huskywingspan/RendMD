# Feature Spec: Draft Persistence Across Page Reload

> **Date:** 2026-02-08  
> **Status:** Ready for Implementation  
> **Effort:** S (Small — 1 hour)

---

## User Story

As a user, I want my editor content to survive a page reload, browser crash, or idle timeout so that I never lose work unexpectedly.

---

## Problem

The Zustand store only persists UI preferences (`viewMode`, `theme`, `fontSize`, `autoSaveEnabled`) to localStorage. The actual document content, frontmatter, and file metadata are in-memory only. On page reload, all user content is lost and the editor returns to the empty welcome state.

---

## Acceptance Criteria

- [ ] Content survives a full page reload (F5)
- [ ] Frontmatter survives a full page reload
- [ ] File name indicator shows the correct name after reload
- [ ] `isDirty` flag is restored (user sees the unsaved dot indicator)
- [ ] EmptyState only appears when there truly is no content (not after a reload with content)
- [ ] Content is saved to localStorage within 1 second of the last keystroke
- [ ] `visibilitychange` event triggers an immediate save when the tab goes hidden
- [ ] Documents up to ~2 MB of markdown work reliably
- [ ] If localStorage write fails (quota exceeded), no crash — just log a warning

---

## Technical Approach

### Change 1: Expand Zustand `persist` partialize (editorStore.ts)

The existing persist config only saves preferences. Expand it to include document state:

```typescript
// BEFORE
interface PersistedState {
  viewMode: ViewMode;
  theme: ThemeName;
  fontSize: number;
  autoSaveEnabled: boolean;
}

// AFTER
interface PersistedState {
  viewMode: ViewMode;
  theme: ThemeName;
  fontSize: number;
  autoSaveEnabled: boolean;
  // Document state
  content: string;
  frontmatter: Frontmatter | null;
  fileName: string | null;
  isDirty: boolean;
}
```

Update `partialize`:
```typescript
partialize: (state): PersistedState => ({
  viewMode: state.viewMode,
  theme: state.theme,
  fontSize: state.fontSize,
  autoSaveEnabled: state.autoSaveEnabled,
  // Document state
  content: state.content,
  frontmatter: state.frontmatter,
  fileName: state.fileName,
  isDirty: state.isDirty,
}),
```

Update `merge`:
```typescript
merge: (persistedState, currentState) => {
  const persisted = persistedState as PersistedState | undefined;
  return {
    ...currentState,
    viewMode: persisted?.viewMode ?? currentState.viewMode,
    theme: persisted?.theme ?? currentState.theme,
    fontSize: persisted?.fontSize ?? currentState.fontSize,
    autoSaveEnabled: persisted?.autoSaveEnabled ?? currentState.autoSaveEnabled,
    // Document state
    content: persisted?.content ?? currentState.content,
    frontmatter: persisted?.frontmatter ?? currentState.frontmatter,
    fileName: persisted?.fileName ?? currentState.fileName,
    isDirty: persisted?.isDirty ?? currentState.isDirty,
  };
},
```

**That's the core change.** Zustand persist handles the rest — it writes to localStorage on every state change by default.

### Change 2: `visibilitychange` flush (App.tsx)

Add a `visibilitychange` listener so content is saved immediately when the user switches tabs or minimizes the browser. This protects against the scenario where the user switches away and the browser later discards the tab (Chrome's tab freezing/discarding).

```typescript
// In App.tsx, alongside the existing beforeunload handler:
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // Force Zustand persist to flush synchronously
      // Zustand's persist middleware writes on state change, but we
      // want to ensure the latest state is saved before the tab goes hidden
      const state = useEditorStore.getState();
      try {
        const persisted = {
          viewMode: state.viewMode,
          theme: state.theme,
          fontSize: state.fontSize,
          autoSaveEnabled: state.autoSaveEnabled,
          content: state.content,
          frontmatter: state.frontmatter,
          fileName: state.fileName,
          isDirty: state.isDirty,
        };
        localStorage.setItem(
          'rendmd-preferences',
          JSON.stringify({ state: persisted, version: 0 })
        );
      } catch {
        // Quota exceeded or other error — fail silently
      }
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

### Change 3: Guard against large content (optional, defensive)

If a document contains embedded base64 images, it could easily exceed localStorage's ~5 MB limit. Add a try-catch wrapper or size check.

**Option A (recommended):** Zustand persist already fails silently on write errors. Just ensure we don't crash on read either — the `merge` function with `??` fallbacks handles this.

**Option B (belt-and-suspenders):** Add a custom `storage` adapter to Zustand persist that wraps `setItem` in try-catch and logs a warning toast when the quota is exceeded:

```typescript
storage: {
  getItem: (name) => {
    try {
      const str = localStorage.getItem(name);
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch (e) {
      console.warn('Draft save failed (storage quota exceeded):', e);
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
},
```

---

## What This Does NOT Solve (Deferred)

| Gap | Why It's Deferred | Future Solution |
|-----|-------------------|-----------------|
| File handle persistence | `FileSystemFileHandle` can't be stored in localStorage (not serializable) | IndexedDB with `idb-keyval` — store handle, request permission on reload |
| Recent files list | Needs `FileSystemFileHandle` in IndexedDB | v1.1 feature |
| Multi-tab conflict | Two tabs editing = last-write-wins to localStorage | Service Worker or BroadcastChannel (v1.2+) |
| Embedded images > 5 MB | Base64 data URLs in content can exceed localStorage quota | Move draft storage to IndexedDB for large docs |

These are all real concerns but significantly more complex. The localStorage approach covers the 95% case — typical markdown documents are well under 1 MB.

---

## Components Affected

| File | Change |
|------|--------|
| `src/stores/editorStore.ts` | Expand `PersistedState`, `partialize`, `merge` |
| `src/App.tsx` | Add `visibilitychange` listener |

Nothing else changes. The editor already reads `content` from the store. Zustand's `persist` rehydrates before the first render.

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| New document → reload | Content restored, `isDirty` still true, file indicator shows dirty dot |
| Opened file → edit → reload | Content restored, file name shows, but `isDirty` true (no file handle to re-save with) |
| Empty editor → reload | EmptyState shows (content is empty string) |
| Clear localStorage → reload | Fresh start, EmptyState shows |
| Open new file after reload | Replaces the restored draft (same as current behavior for opening a file) |
| Very large document (>5 MB with images) | localStorage write may fail silently; draft not persisted but no crash |
| Multiple tabs with different content | Last tab to change state wins — acceptable for v1.0 |

---

## Testing

### Manual Tests
1. Type some content → F5 → content still there
2. Add frontmatter → F5 → frontmatter panel shows the restored data
3. Open a .md file → edit → F5 → content shows, file name shown, dirty dot visible
4. Empty state → F5 → EmptyState still shows (no phantom content)
5. Type content → switch to another tab → wait 30s → switch back → content intact
6. Type content → close tab (dismiss beforeunload warning) → re-open site → content restored

### Unit Test Additions
- Test that `partialize` includes `content`, `frontmatter`, `fileName`, `isDirty`
- Test that `merge` correctly restores these fields from persisted state
- Test that `merge` falls back to defaults when fields are missing (backwards compat)

---

## Implementation Priority

This is a **quick win**. The core change is 8 lines in `editorStore.ts` (expand `PersistedState` + update `partialize` + update `merge`). The `visibilitychange` handler is ~15 lines in `App.tsx`.

Total: ~25 lines of new code, 0 new dependencies.
