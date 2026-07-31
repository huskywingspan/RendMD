# Builder Handoff: Phase 5 — Polish & Advanced

> **Created:** 2026-02-08  
> **Researcher:** Copilot (Researcher mode)  
> **Prerequisites:** Phases 0–4 complete (0 errors, 0 warnings)  
> **Version:** 0.8.0 → target 0.9.0

---

## Overview

Phase 5 is the penultimate phase before v1.0 release. The goal is to transform RendMD from "feature-complete" to "ready to ship" — exports, search, UX polish, and bundle optimization. No new editor primitives; this is about completeness and quality.

**Build status entering Phase 5:** Clean (0 errors, 0 warnings, 1,121 KB main chunk / 363 KB gzipped).

---

## Reviewer Open Questions (from Phase 4 handoff)

These questions were posed by the reviewer. Researcher answers below — Builder should incorporate these decisions:

### Q1: Round-trip lossy for local images — acceptable?

**Answer: Yes, acceptable for v1.0.** When a markdown file with `![alt](photo.png)` is opened, the editor shows a broken image because it cannot resolve the relative path without filesystem context. This is an inherent limitation of the web version. The VS Code extension (v1.2) will solve this naturally since it has full filesystem access. No action needed now.

### Q2: `useImageAssets` hook — remove or keep?

**Answer: Keep, but don't expand.** The hook exports `hasNativeFS` which may be useful for conditional UI. The `saveImage` function is unused but harmless. It'll be valuable when we build the VS Code extension, which has full FS access. Don't remove working code that has a planned use case.

### Q3: Phase 4 in PROJECT_PLAN.md — update?

**Answer: Done.** PROJECT_PLAN.md updated to ✅ COMPLETE with full completion notes. Version bumped to 0.8.0.

---

## Sub-Phases

### Phase 5A: Export Features

**Goal:** Let users get their content out in formats beyond `.md`.

#### 5A.1: Export to HTML

**What:** Export the current document as a standalone HTML file with embedded styles.

**Implementation:**
1. Create `src/utils/exportHTML.ts`
2. Serialize current TipTap content to HTML via `editor.getHTML()`
3. Wrap in a complete HTML document with:
   - Embedded CSS from current theme (inline `<style>` block)
   - RendMD attribution in a comment
   - Proper `<meta charset>`, viewport, title (from frontmatter if available)
4. Trigger download as `{filename}.html` (or `document.html` if untitled)

```typescript
export function exportToHTML(editor: Editor, title?: string, theme?: string): string {
  const html = editor.getHTML();
  const css = getExportStyles(theme); // Extract relevant CSS variables as concrete values
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Document'}</title>
  <style>${css}</style>
</head>
<body>
  <article class="rendmd-export">${html}</article>
</body>
</html>`;
}
```

**Key detail:** Don't just dump CSS variables — resolve them to concrete values since the exported HTML has no theme context. Parse the computed styles from `getComputedStyle(document.documentElement)`.

#### 5A.2: Export to PDF

**What:** Print-friendly output via browser print dialog.

**Implementation:**
1. Create `src/themes/print.css` — print stylesheet with `@media print`
2. Import in `index.css`
3. Add "Export PDF" button that calls `window.print()`
4. Print styles should:
   - Hide header, sidebar, toolbar, debug panel
   - Show only the editor content
   - Use black text on white background (ignore theme)
   - Proper page break handling (`break-inside: avoid` on code blocks, tables)
   - Include frontmatter as a title block at top

**Why `window.print()` not a PDF library:** Browser print-to-PDF is free, well-tested, handles pagination, and users can choose their printer/save location. A JS PDF library (jsPDF, puppeteer) would add ~200KB+ to the bundle for minimal benefit.

#### 5A.3: Copy as Rich Text

**What:** Copy the rendered content to clipboard so it can be pasted into Gmail, Google Docs, Word, etc.

**Implementation:**
1. Get editor HTML: `editor.getHTML()`
2. Write to clipboard with HTML MIME type:
```typescript
async function copyAsRichText(editor: Editor): Promise<void> {
  const html = editor.getHTML();
  const blob = new Blob([html], { type: 'text/html' });
  await navigator.clipboard.write([
    new ClipboardItem({ 'text/html': blob })
  ]);
}
```
3. Add as a button in the export menu or header

---

### Phase 5B: UX Polish

**Goal:** Fill in the gaps that make the difference between "works" and "polished."

#### 5B.1: Empty State

**What:** When no file is open, show a welcoming empty state instead of a blank editor.

**Implementation:**
1. Create `src/components/EmptyState.tsx`
2. Show when `!content && !filePath` (or on app startup before any file is loaded)
3. Content:
   - RendMD logo/wordmark
   - Tagline: "The thinking person's markdown editor"
   - Three action cards: "Open File" (Ctrl+O), "Start Writing" (creates empty doc), "View Shortcuts" (Ctrl+H)
   - Recent files list if we implement 5D (otherwise skip)
4. Style with theme variables, keep it elegant and minimal

#### 5B.2: Tooltips

**What:** Add tooltips to all icon-only buttons.

**Implementation:**
- Use a simple CSS tooltip (no library needed) or a tiny `<Tooltip>` component
- Cover: all toolbar/BubbleMenu buttons, header buttons, sidebar controls
- Show keyboard shortcut in tooltip text where applicable: "Bold (Ctrl+B)"
- Use `title` attribute as fallback for accessibility

#### 5B.3: Loading States

**What:** Show feedback during file operations and exports.

**Implementation:**
- Brief spinner/progress indicator when opening large files
- "Saving..." indicator during save operations (already have `isSaving` from `useAutoSave`)
- "Exporting..." feedback for HTML/PDF export
- Use existing `FileIndicator` component — extend with a small spinner when `isSaving` is true

#### 5B.4: Error Feedback

**What:** User-facing error messages instead of silent failures.

**Implementation:**
1. Create a toast/notification system: `src/components/UI/Toast.tsx`
2. Simple stack of dismissable messages at bottom-right
3. Types: `success` (green), `error` (red), `info` (blue)
4. Auto-dismiss after 4 seconds
5. Hook into: file save errors, export errors, clipboard copy, image insert errors
6. State: add `toasts: Toast[]` and `addToast`/`removeToast` to store (or a dedicated tiny Zustand store)

---

### Phase 5C: In-Document Search *(Scope Decision Needed)*

**What:** Find text within the document.

**Recommendation:** **Defer to Phase 6 or skip entirely for v1.0.**

**Rationale:**
- Browser's native Ctrl+F already works in the rendered view
- TipTap has no built-in search extension — you'd need to build from scratch:
  - ProseMirror `SearchPlugin` with decorations for highlighting
  - Match navigation (next/prev)
  - Replace functionality
  - Regex support
- This is ~200-400 lines of non-trivial ProseMirror plugin code
- The VS Code extension gets this completely free from VS Code

**If you decide to include it:**
- Use TipTap's `@tiptap/extension-search-and-replace` (community) — but check compatibility with TipTap 3.x first
- Alternatively, use `prosemirror-search` for the decoration layer

---

### Phase 5D: Bundle Optimization

**Goal:** Reduce initial load from 1,121 KB to <500 KB.

**Current situation:**
- Main chunk: 1,121 KB (363 KB gzipped)
- No `React.lazy()`, no `Suspense`, no dynamic imports in application code
- Shiki grammars already code-split by Shiki's bundler
- Vite config is bare minimum (just React plugin + alias)

#### 5D.1: Lazy-Load Source View

The `SourceEditor` component and Shiki highlighting are only needed when `viewMode !== 'render'`. Most users start in rendered mode.

```typescript
// In App.tsx
const SourceEditor = React.lazy(() => import('./components/SourceView/SourceEditor'));

// In JSX
{viewMode !== 'render' && (
  <Suspense fallback={<div className="source-loading">Loading source view...</div>}>
    <SourceEditor />
  </Suspense>
)}
```

**Expected savings:** ~150-200 KB of Shiki core moves to a separate chunk.

#### 5D.2: Lazy-Load Modals

`ImageInsertModal` and `ShortcutsModal` are rarely opened. Lazy-load both:

```typescript
const ImageInsertModal = React.lazy(() => import('./components/Modals/ImageInsertModal'));
const ShortcutsModal = React.lazy(() => import('./components/Modals/ShortcutsModal'));
```

**Expected savings:** ~10-20 KB (small, but these pull in `imageHelpers.ts` and `shortcuts.ts`).

#### 5D.3: Vendor Chunk Splitting

Add `manualChunks` to Vite config to split vendor dependencies:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-tiptap': [
            '@tiptap/react', '@tiptap/starter-kit', '@tiptap/pm',
            '@tiptap/extension-table', '@tiptap/extension-table-row',
            '@tiptap/extension-table-header', '@tiptap/extension-table-cell',
            '@tiptap/extension-link', '@tiptap/extension-image',
            '@tiptap/extension-placeholder', '@tiptap/extension-task-list',
            '@tiptap/extension-task-item', '@tiptap/extension-text-align',
            'tiptap-markdown',
          ],
          'vendor-shiki': ['shiki'],
        },
      },
    },
  },
});
```

**Expected result:** Several smaller chunks instead of one massive chunk. Each is cached independently by the browser.

#### 5D.4: Bundle Analysis

Before and after optimization, run analysis:

```bash
npx vite-bundle-visualizer
```

Document final sizes in the Phase 5 completion notes.

---

### Phase 5E: Settings Button

**What:** The Header has a Settings gear button that currently does nothing. Wire it up.

**Implementation:**
1. Create `src/components/Modals/SettingsModal.tsx`
2. Settings to expose (all already exist in store, just need UI):
   - **Theme:** Theme selector (already in ThemeDropdown, duplicate here for discoverability)
   - **Auto-save:** Toggle on/off, adjust debounce interval
   - **Default view mode:** render / split / source
   - **Sidebar default:** open/closed on startup
   - **Font size:** Editor content font size (store a CSS variable override)
3. Persist all settings via Zustand persist (extend the existing `rendmd-preferences` key)
4. Lazy-load the modal

---

## Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | **5D: Bundle optimization** | Medium | High — fixes the 1.1MB warning |
| 2 | **5A.2: Export to PDF** (print stylesheet) | Small | High — users expect this |
| 3 | **5A.1: Export to HTML** | Small | Medium |
| 4 | **5B.4: Toast notifications** | Small | Medium — needed by exports |
| 5 | **5B.1: Empty state** | Small | Medium — first impression |
| 6 | **5B.2: Tooltips** | Small | Medium — discoverability |
| 7 | **5A.3: Copy as rich text** | Small | Medium |
| 8 | **5E: Settings modal** | Medium | Low — nice to have |
| 9 | **5B.3: Loading states** | Small | Low — already mostly handled |
| 10 | **5C: Search** | Large | Low — browser Ctrl+F works, defer |

**Recommended order:** 5D → 5B.4 (toast) → 5A (all exports) → 5B.1 (empty state) → 5B.2 (tooltips) → 5E (settings) → 5B.3 (loading)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/utils/exportHTML.ts` | HTML export with embedded styles |
| `src/themes/print.css` | Print stylesheet for PDF export |
| `src/components/EmptyState.tsx` | Welcome screen when no content |
| `src/components/UI/Toast.tsx` | Toast notification component |
| `src/components/UI/Tooltip.tsx` | Tooltip wrapper component |
| `src/components/Modals/SettingsModal.tsx` | Settings panel |

## Files to Modify

| File | Changes |
|------|---------|
| `vite.config.ts` | Add `manualChunks` for vendor splitting |
| `src/App.tsx` | `React.lazy` imports for SourceEditor + modals, empty state, toast integration |
| `src/components/Header/Header.tsx` | Export buttons/menu, wire settings button |
| `src/stores/editorStore.ts` | Add toast state, settings state (fontSize, autoSave toggle) |
| `src/index.css` | Import `print.css` |
| `src/components/Editor/BubbleMenu.tsx` | Add tooltips to buttons |
| `src/components/Editor/TableToolbar.tsx` | Add tooltips to buttons |

---

## Scope Boundaries

**In scope:**
- Export (HTML, PDF, rich text copy)
- Bundle optimization (lazy loading, chunk splitting)
- UX polish (empty state, tooltips, toasts, loading states)
- Settings modal
- Print stylesheet

**Out of scope for Phase 5:**
- In-document search (defer — browser Ctrl+F works, VS Code extension gets it free)
- File browser sidebar (defer to v1.1 — `SidebarState` already has `'files'` panel type ready)
- Recent files (defer to v1.1 — requires IndexedDB for handle storage)
- Mermaid/KaTeX (v1.2)
- AI features (v1.1)

---

## Success Criteria

1. Main chunk < 500 KB (gzipped < 200 KB)
2. Export to HTML produces valid, styled standalone HTML
3. Print to PDF produces clean, readable output
4. Copy as rich text works in Gmail, Google Docs
5. Empty state shows on fresh load and is visually polished
6. All icon-only buttons have tooltips with shortcut hints
7. Toast notifications appear for save/export success and errors
8. Settings modal controls theme, view mode, auto-save
9. Build passes with 0 errors, 0 warnings
10. All four themes still work correctly

---

*Phase 5 is the last feature phase. After this, Phase 6 is testing, documentation, and v1.0 release.*
