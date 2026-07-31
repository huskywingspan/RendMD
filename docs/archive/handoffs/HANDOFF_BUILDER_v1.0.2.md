# Builder Handoff: v1.0.2 — Theme Unification, New File/Templates, Mobile Polish

> **Date:** 2026-02-08  
> **From:** Researcher  
> **Status:** Ready for implementation  
> **Prerequisite:** v1.0.1 + mobile responsive pass (already deployed)

---

## Overview

Four issues found during mobile testing. Issues 2 & 4 share a root cause (dual theme systems). Three logical work items:

| # | Task | Effort | Files |
|---|------|--------|-------|
| A | Unify theme system into Zustand store | M | 5-6 files |
| B | New File action + starter templates | M | 4-5 files + new template data |
| C | ShortcutsModal mobile keyboard fix | S | 1 file |

---

## Task A: Unify Theme System

### Problem

There are **two independent theme systems** that don't communicate:

1. **`useTheme()` hook** (`src/hooks/useTheme.ts`) — Has its own `useState`, reads/writes its own localStorage key (`rendmd-theme`), and applies CSS classes to `document.documentElement`. Used by: `ThemeDropdown.tsx`, `App.tsx`, `Editor.tsx`, `SourceEditor.tsx`.

2. **Zustand store** (`editorStore.ts` line 103) — `setTheme: (theme) => set({ theme })` only updates store state. Persisted via Zustand persist to `rendmd-preferences`. **Never touches the DOM.** Used by: `SettingsModal.tsx`, `MobileMenu.tsx`.

**Result:** ThemeDropdown (desktop header) works. MobileMenu and SettingsModal theme selectors do NOT work — they update Zustand state but the CSS class on `<html>` never changes.

### Solution: Move All Theme Logic Into Zustand Store

**Step 1: Enhance `setTheme` in editorStore.ts**

Replace line 103:
```typescript
// OLD
setTheme: (theme) => set({ theme }),
```
with:
```typescript
setTheme: (theme) => {
  set({ theme });
  // Apply theme CSS class to DOM
  const root = document.documentElement;
  root.classList.remove('dark-basic', 'light-basic', 'dark-glass', 'light-glass');
  root.classList.add(theme);
},
```

**Step 2: Add `toggleDarkLight` action to the store**

Add to the `EditorStore` interface:
```typescript
toggleDarkLight: () => void;
```

Add to the store implementation:
```typescript
toggleDarkLight: () => {
  const current = get().theme;
  const isGlass = current.includes('glass');
  const isDark = current.startsWith('dark');
  const newTheme: ThemeName = isGlass
    ? (isDark ? 'light-glass' : 'dark-glass')
    : (isDark ? 'light-basic' : 'dark-basic');
  // Use the store's setTheme which also applies to DOM
  get().setTheme(newTheme);
},
```

**Step 3: Add `isDark` derived selector**

Create a selector (external, not a getter — per ADR-030):
```typescript
// Export alongside the store
export const useIsDark = (): boolean => useEditorStore((s) => s.theme.startsWith('dark'));
```

**Step 4: Apply theme on hydration**

In the `onRehydrateStorage` callback (around line 155), after successful rehydration, apply the persisted theme to the DOM:
```typescript
onRehydrateStorage: () => {
  return (state, error) => {
    if (error) {
      console.warn('[RendMD] Failed to rehydrate:', error);
    }
    // Apply persisted theme to DOM on startup
    if (state?.theme) {
      const root = document.documentElement;
      root.classList.remove('dark-basic', 'light-basic', 'dark-glass', 'light-glass');
      root.classList.add(state.theme);
    }
  };
},
```

**Step 5: Update ThemeDropdown.tsx**

Replace `useTheme()` import/usage with the Zustand store:
```typescript
// OLD
import { useTheme } from '@/hooks';
const { theme, setTheme, toggleDarkLight, isDark } = useTheme();

// NEW
import { useEditorStore, useIsDark } from '@/stores/editorStore';
const { theme, setTheme, toggleDarkLight } = useEditorStore();
const isDark = useIsDark();
```

**Step 6: Update Editor.tsx and SourceEditor.tsx**

Both currently use `const { isDark } = useTheme()` — replace with:
```typescript
import { useIsDark } from '@/stores/editorStore';
const isDark = useIsDark();
```

**Step 7: Remove `useTheme()` call from App.tsx**

Line 23: `useTheme();` — Remove this entirely. The store's `onRehydrateStorage` now handles initial theme application, and `setTheme` handles runtime changes.

**Step 8: Delete or deprecate `useTheme.ts`**

Remove `src/hooks/useTheme.ts` entirely. Remove its export from `src/hooks/index.ts`.

**Step 9: Remove theme selector from SettingsModal**

The ThemeDropdown in the header (and Theme submenu in MobileMenu) already provide full 4-theme selection. Having it in Settings too is redundant and confusing. Remove the `<SettingRow label="Theme">` block (lines 62-74 of SettingsModal.tsx). Also remove the `THEMES` constant and `ThemeName` import if no longer used there.

**Step 10: Clean up localStorage**

The old `useTheme` hook stored theme under `rendmd-theme`. The Zustand store persists under `rendmd-preferences`. After migration, the `rendmd-theme` key becomes orphaned. Optionally, on first load, read `rendmd-theme` and migrate it into the store, then delete the old key. Or just leave it — it won't cause harm.

### Files Changed (Task A)
| File | Change |
|------|--------|
| `src/stores/editorStore.ts` | Enhance `setTheme` to apply DOM class, add `toggleDarkLight`, add `useIsDark` selector, apply theme in `onRehydrateStorage` |
| `src/components/Header/ThemeDropdown.tsx` | Use store instead of `useTheme()` hook |
| `src/components/Editor/Editor.tsx` | Replace `useTheme()` with `useIsDark` |
| `src/components/SourceView/SourceEditor.tsx` | Replace `useTheme()` with `useIsDark` |
| `src/App.tsx` | Remove `useTheme()` call and import |
| `src/hooks/useTheme.ts` | **Delete** |
| `src/hooks/index.ts` | Remove `useTheme` export |
| `src/components/Modals/SettingsModal.tsx` | Remove theme `<select>` row, remove `THEMES` const, remove `ThemeName` import |

---

## Task B: New File Action + Starter Templates

### Problem

There is no way to create a new document. Once you have content loaded, the only option is "Open File" (from disk). Users need a "New File" action, and starter templates help showcase what RendMD can render.

### Solution

**Step 1: Add `newFile` action to editorStore**

Add to the `EditorStore` interface:
```typescript
newFile: (content?: string, name?: string) => void;
```

Implementation:
```typescript
newFile: (content = '', name = null) => {
  set({
    content,
    frontmatter: null,
    filePath: null,
    fileName: name,
    isDirty: false,
  });
},
```

**Step 2: Create template data**

Create `src/utils/templates.ts`:

```typescript
export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch',
    content: '',
  },
  {
    id: 'todo',
    name: 'TODO List',
    description: 'Task tracking with checkboxes',
    content: `# TODO List

## High Priority

- [ ] First important task
- [ ] Second important task
- [x] Completed task example

## In Progress

- [ ] Working on this
  - [ ] Sub-task one
  - [ ] Sub-task two

## Done

- [x] Already finished
- [x] This one too

---

> **Tip:** Check off items as you complete them!
`,
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured meeting template',
    content: `---
title: Meeting Notes
date: ${new Date().toISOString().split('T')[0]}
attendees: []
---

# Meeting Notes

## Agenda

1. Topic one
2. Topic two
3. Open discussion

## Discussion

### Topic One

Notes here...

### Topic Two

Notes here...

## Action Items

| Owner | Task | Due Date |
|-------|------|----------|
| Name  | Do the thing | YYYY-MM-DD |

## Next Meeting

- **Date:** TBD
- **Topics to carry over:**
  - Item one
`,
  },
  {
    id: 'readme',
    name: 'Project README',
    description: 'Tables, code blocks, badges & more',
    content: `# Project Name

> A brief description of what this project does.

## Features

- **Feature one** — Description of the first feature
- **Feature two** — Description of the second feature
- **Feature three** — Description of the third feature

## Installation

\`\`\`bash
npm install my-project
cd my-project
npm start
\`\`\`

## Usage

\`\`\`javascript
import { something } from 'my-project';

const result = something('hello');
console.log(result);
\`\`\`

## API Reference

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| \`something()\` | \`input: string\` | \`string\` | Does something useful |
| \`another()\` | \`n: number\` | \`number[]\` | Returns an array |

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing\`)
5. Open a Pull Request

## License

MIT
`,
  },
];
```

**Step 3: Reset the file handle on newFile**

In `useFileSystem.ts`, the module-level `sharedFileHandle` needs to be cleared when creating a new file. Either:
- Export and call `setSharedFileHandle(null)` from App.tsx when `newFile` is invoked, or
- Add a `resetFileHandle` to the `useFileSystem` return and call it alongside `newFile`

Recommended: create a `useNewFile` hook or a wrapper in App.tsx:
```typescript
const handleNewFile = useCallback((content?: string, name?: string) => {
  newFile(content, name);
  setSharedFileHandle(null);
  // Clear the editor content (TipTap needs explicit update)
  if (editorInstance) {
    editorInstance.commands.setContent(content || '');
  }
}, [newFile, editorInstance]);
```

**Step 4: Update EmptyState.tsx**

Replace the current two-button layout with a template picker:

```tsx
export function EmptyState({ onNewFile }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-lg space-y-6">
        {/* ... existing welcome text ... */}
        
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => openFile()}>
            <FolderOpen size={16} /> Open File
          </button>
        </div>

        {/* Template grid */}
        <div className="text-left space-y-3">
          <h3 className="text-sm font-medium text-[var(--theme-text-muted)] text-center">
            Or start with a template
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => onNewFile(template.content, template.id === 'blank' ? null : `${template.name}.md`)}
                className="text-left p-3 rounded-lg border border-[var(--theme-border-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
              >
                <div className="text-sm font-medium text-[var(--theme-text-primary)]">{template.name}</div>
                <div className="text-xs text-[var(--theme-text-muted)]">{template.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Add "New" button to Header and MobileMenu**

In `Header.tsx`, add a "New" button next to "Open" in the center section:
```tsx
<button onClick={handleNewFile}>
  <FilePlus size={14} /> New
</button>
```

In `MobileMenu.tsx`, add "New File" as the first menu item (above "Open File"):
```tsx
<button onClick={handleNewFile} className={itemClass} role="menuitem">
  <FilePlus size={16} /> New File
</button>
```

**Step 6: Keyboard shortcut Ctrl+N**

Add to the keyboard event handler in App.tsx (where Ctrl+O, Ctrl+S, etc. are handled). Also add to the shortcuts list in `src/utils/shortcuts.ts`.

### Important: TipTap Content Sync

When `newFile` sets content to `''` in the store, the TipTap editor must also be updated. Currently the editor syncs FROM TipTap TO the store (user types → store updates). The reverse direction (store → TipTap) happens on initial mount via `content` prop. For `newFile`, you'll need to explicitly call:
```typescript
editor.commands.setContent(newContent);
```
This is the same pattern used in `openFile` — check how `useFileSystem.openFile` updates the editor and follow the same approach.

### Files Changed (Task B)
| File | Change |
|------|--------|
| `src/stores/editorStore.ts` | Add `newFile` action |
| **NEW** `src/utils/templates.ts` | Template data (4 templates) |
| `src/components/UI/EmptyState.tsx` | Add template picker grid, accept `onNewFile` prop |
| `src/components/Header/Header.tsx` | Add "New" button in center section |
| `src/components/Header/MobileMenu.tsx` | Add "New File" menu item |
| `src/App.tsx` | Create `handleNewFile` callback, wire Ctrl+N, pass to EmptyState |
| `src/utils/shortcuts.ts` | Add Ctrl+N entry |
| `src/hooks/useFileSystem.ts` | May need `resetFileHandle` export or use existing `setSharedFileHandle` |

---

## Task C: ShortcutsModal Mobile Keyboard Issue

### Problem

1. **Auto-focus:** `searchInputRef.current?.focus()` fires on modal open (line 97 of ShortcutsModal.tsx), immediately triggering the software keyboard on mobile.
2. **Content hidden:** Modal uses `items-center justify-center` (vertically centered). When the keyboard opens, it covers ~50% of the viewport, hiding the search results.

### Solution

**Fix 1: Conditional auto-focus**

Replace lines 95-97:
```typescript
// OLD
requestAnimationFrame(() => {
  searchInputRef.current?.focus();
});
```
with:
```typescript
// Only auto-focus on non-touch devices (avoids triggering mobile keyboard)
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (!isTouchDevice) {
  requestAnimationFrame(() => {
    searchInputRef.current?.focus();
  });
}
```

**Fix 2: Top-align on mobile**

Change the modal container positioning (line 143):
```tsx
// OLD
<div className="fixed inset-0 z-50 flex items-center justify-center">

// NEW — top-aligned on mobile, centered on desktop
<div className="fixed inset-0 z-50 flex items-start pt-12 sm:items-center sm:pt-0 justify-center">
```

This positions the modal near the top on mobile (below the header), leaving room for the keyboard to show results underneath. On desktop (`sm:` and up), it stays vertically centered.

### Files Changed (Task C)
| File | Change |
|------|--------|
| `src/components/Modals/ShortcutsModal.tsx` | Conditional auto-focus on touch; top-align on mobile |

---

## Build Order

1. **Task A** (theme unification) — fixes a broken feature, highest priority
2. **Task C** (shortcuts modal) — quick win, 1 file
3. **Task B** (new file + templates) — additive feature, most code

## Testing Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | MobileMenu → Theme submenu → select each theme | Theme visually changes immediately |
| 2 | Desktop ThemeDropdown → select each theme | Still works as before |
| 3 | Desktop ThemeDropdown → sun/moon toggle | Still works as before |
| 4 | Reload page | Theme persists correctly |
| 5 | Settings modal | Theme selector removed, font size + auto-save still work |
| 6 | ShortcutsModal on mobile | Keyboard does NOT auto-appear; results visible when searching |
| 7 | ShortcutsModal on desktop | Search still auto-focuses (keyboard not an issue) |
| 8 | EmptyState shows template grid | 4 templates: Blank, TODO, Meeting Notes, Project README |
| 9 | Click each template | Editor populates with template content |
| 10 | New button in header + mobile menu | Creates blank document, clears filename |
| 11 | Ctrl+N | Creates new blank file |
| 12 | New file after editing existing file | Old content replaced, unsaved indicator clears |
| 13 | Template with frontmatter (Meeting Notes) | Frontmatter parsed and displayed in panel |
| 14 | All 4 themes render correctly after unification | No visual regressions |
