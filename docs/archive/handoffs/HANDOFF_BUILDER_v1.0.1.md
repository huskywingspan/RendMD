# Builder Handoff: v1.0.1 Patch — Bug Fixes, Toolbar Unification & Media Groundwork

> **Created:** 2026-02-08  
> **Researcher:** Copilot (Researcher mode)  
> **Prerequisites:** v1.0.0 complete (97 tests passing, 0 lint/build errors)  
> **Version:** 1.0.0 → target **1.0.1**

---

## Overview

v1.0.1 is a patch addressing 3 bugs found during user testing plus a UX enhancement (toolbar unification). No major features — just polish to make v1.0 actually usable.

**Priorities (in order):**
1. Fix editor scrolling (CRITICAL — editor is unusable without this)
2. Fix PDF/print export showing UI chrome
3. Improve rich text clipboard export
4. Unify toolbar + bubble menu for discoverability

**Stress test file:** `tests/fixtures/stress-test.md` — load this to verify fixes work under extreme content.

---

## Fix 1: Editor Scrolling (CRITICAL)

### Problem
The rendered editor view cannot scroll. Mouse wheel doesn't work, no scrollbar appears. Content below the viewport fold is only reachable via TOC navigation.

### Root Cause
Broken CSS height chain in `src/components/Editor/Editor.tsx` (line ~283).

The `<div className="w-full">` wrapper is a flex child, but it's not itself a flex column container with overflow constraints. Its child `<div className="h-full overflow-y-auto p-8">` tries to use `h-full` (100% height), but the parent has no constrained height, so `overflow-y-auto` never activates — the content overflows naturally without triggering scrolling.

### Fix

**File: `src/components/Editor/Editor.tsx`**

Change line ~283 from:
```tsx
<div className="w-full">
```
to:
```tsx
<div className="w-full flex flex-col overflow-hidden">
```

Change line ~292 from:
```tsx
<div className="h-full overflow-y-auto p-8">
```
to:
```tsx
<div className="flex-1 overflow-y-auto p-8">
```

**Why this works:**
- `flex flex-col overflow-hidden` makes the wrapper a flex column that inherits its constrained height from the parent flex container
- `flex-1` on the scroll container means "fill remaining space after the sticky TableToolbar"
- `overflow-y-auto` now triggers because the container has a fixed computed height

### Verification
1. Load the stress test file (`tests/fixtures/stress-test.md`)
2. Ensure mouse wheel scrolls smoothly
3. Ensure scrollbar appears
4. Ensure content at the bottom is reachable
5. Ensure split view scrolls independently
6. Ensure TOC click-to-scroll still works

---

## Fix 2: PDF/Print Export Shows UI Chrome

### Problem
When using Export → PDF (`window.print()`), the frontmatter panel ("Add frontmatter" button) and debug panel (dev mode) appear in the print preview. Only the markdown content should print.

### Root Cause
`src/themes/print.css` hides `header`, `aside`, `[role="toolbar"]`, but does NOT hide:
1. `.frontmatter-panel` — rendered by `<FrontmatterPanel>` above the editor in `<main>`
2. `.fixed.bottom-0` — the `<DebugPanel>` (dev only but still visible in print preview during development)
3. `.table-toolbar` — the table toolbar sticky header

### Fix

**File: `src/themes/print.css`**

Add these rules inside the `@media print` block, after the existing "Hide buttons" rule:

```css
/* Hide frontmatter panel */
.frontmatter-panel {
  display: none !important;
}

/* Hide table toolbar */
.table-toolbar {
  display: none !important;
}

/* Hide debug panel (dev only) */
.fixed.bottom-0 {
  display: none !important;
}

/* Hide toast container */
.toast-container {
  display: none !important;
}
```

### Verification
1. Open a document with frontmatter
2. Ctrl+P to open print preview
3. Verify: Only markdown content visible (no frontmatter button, no table toolbar, no debug panel)
4. Headers, sidebar, and toast container also hidden

### Note on Portrait/Landscape
This is controlled by the browser's native print dialog — no code change needed. Users can select orientation in the print UI.

---

## Fix 3: Rich Text Clipboard Export

### Problem
"Copy as rich text" pastes with excessive whitespace, no formatting, and looks worse than raw markdown. Two issues:
1. `editor.getHTML()` outputs unstyled HTML — no inline CSS for paste targets to render
2. `editor.getText()` as the plain text fallback strips ALL formatting

### Fix

**File: `src/utils/exportHelpers.ts`**

Replace the `copyAsRichText` function with this:

```typescript
/**
 * Copy editor content as rich text to the clipboard.
 * Uses the Clipboard API with styled HTML and markdown plain text.
 */
export async function copyAsRichText(editor: Editor): Promise<void> {
  const html = editor.getHTML();
  
  // Add inline styles for cross-app paste compatibility
  const styledHtml = addInlineStyles(html);
  
  // Wrap with container styling
  const wrappedHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px;">${styledHtml}</div>`;
  
  // Use markdown as plain text fallback (much better than getText())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = editor.storage as any;
  const markdown: string = storage.markdown?.getMarkdown?.() ?? editor.getText();

  const htmlBlob = new Blob([wrappedHtml], { type: 'text/html' });
  const textBlob = new Blob([markdown], { type: 'text/plain' });

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob,
    }),
  ]);
}

/**
 * Add inline styles to HTML for better cross-app rich text paste.
 * Targets apps like Word, Google Docs, Outlook, Gmail.
 */
function addInlineStyles(html: string): string {
  return html
    .replace(/<h1(?=>| )/g, '<h1 style="font-size: 2em; font-weight: 700; margin: 1em 0 0.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em;"')
    .replace(/<h2(?=>| )/g, '<h2 style="font-size: 1.5em; font-weight: 600; margin: 1em 0 0.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em;"')
    .replace(/<h3(?=>| )/g, '<h3 style="font-size: 1.25em; font-weight: 600; margin: 1em 0 0.5em;"')
    .replace(/<h4(?=>| )/g, '<h4 style="font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.4em;"')
    .replace(/<h5(?=>| )/g, '<h5 style="font-size: 1em; font-weight: 600; margin: 0.8em 0 0.4em;"')
    .replace(/<h6(?=>| )/g, '<h6 style="font-size: 0.9em; font-weight: 600; margin: 0.8em 0 0.4em;"')
    .replace(/<p>/g, '<p style="margin: 0.8em 0;">')
    .replace(/<blockquote(?=>| )/g, '<blockquote style="border-left: 4px solid #3b82f6; padding-left: 1em; margin: 1em 0; color: #6b7280; font-style: italic;"')
    .replace(/<code(?=>| )/g, '<code style="background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 0.25em; font-family: Consolas, Monaco, monospace; font-size: 0.9em;"')
    .replace(/<pre(?=>| )/g, '<pre style="background: #f3f4f6; padding: 1em; border-radius: 0.5em; overflow-x: auto; font-family: Consolas, Monaco, monospace; margin: 1em 0;"')
    .replace(/<table(?=>| )/g, '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;"')
    .replace(/<th(?=>| )/g, '<th style="border: 1px solid #e5e7eb; padding: 0.5em 0.75em; background: #f9fafb; font-weight: 600; text-align: left;"')
    .replace(/<td(?=>| )/g, '<td style="border: 1px solid #e5e7eb; padding: 0.5em 0.75em; text-align: left;"')
    .replace(/<hr\s*\/?>/g, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 2em 0;">')
    .replace(/<ul(?=>| )/g, '<ul style="padding-left: 1.5em; margin: 0.5em 0;"')
    .replace(/<ol(?=>| )/g, '<ol style="padding-left: 1.5em; margin: 0.5em 0;"')
    .replace(/<li(?=>| )/g, '<li style="margin: 0.25em 0;"')
    .replace(/<a /g, '<a style="color: #3b82f6; text-decoration: underline;" ')
    .replace(/<img /g, '<img style="max-width: 100%; height: auto;" ');
}
```

**Key decisions:**
- Regex uses `(?=>| )` lookahead to only match tags at the opening bracket, not accidentally matching content
- `<pre>` style includes `overflow-x: auto` for code blocks in emails
- Plain text fallback uses `editor.storage.markdown.getMarkdown()` instead of `editor.getText()` — markdown is readable; stripped text is not
- `<a>` and `<img>` already have attributes so we match `<a ` with trailing space

### Verification
1. Open a document with headings, bold, code blocks, tables, links
2. Export → Copy as Rich Text
3. Paste into Google Docs — should show formatted headings, styled code, tables
4. Paste into a plain text editor (Notepad) — should show clean markdown
5. Paste into Gmail compose — should show reasonable formatting

---

## Enhancement 4: Unified Toolbar

### Problem
The only visible toolbar button is "Insert Table." Users who don't know about Ctrl+Space or text selection see no formatting options. The editor appears feature-poor on first impression.

### Current State
- **Header bar:** File actions (Open, Save, Export), view mode toggle, theme, settings, shortcuts
- **TableToolbar:** Shows "Insert Table" (or table controls when in table). Renders inside Editor.tsx as a `sticky top-0` bar in the scroll area
- **BubbleMenu:** Full formatting bar (Bold, Italic, Strike, Code, H1-H3, Lists, Quote, Link, Image). Appears on text selection or Ctrl+Space. 271 lines.

### Design

**Move the BubbleMenu buttons into the TableToolbar area as a persistent EditorToolbar.** Keep the BubbleMenu for contextual use on selection. The toolbar shows the same formatting buttons plus "Insert Table" at the end, with a subtle hint about Ctrl+Space.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ [B] [I] [S] [<>] | [H1] [H2] [H3] | [•] [1.] [☐] | [❝] | [🔗] [📷] [📊] │  Ctrl+Space for context menu
└─────────────────────────────────────────────────────────────────────┘
```

When cursor is in a table, the table-specific controls (Row/Column/Align/Delete) replace the general toolbar — same as current behavior.

### Implementation

**New file: `src/components/Editor/EditorToolbar.tsx`**

This component renders the persistent toolbar. It shares the same buttons as `BubbleMenu` but in a static bar.

```typescript
interface EditorToolbarProps {
  editor: Editor | null;
  onLinkClick: () => void;
  onImageClick?: () => void;
}
```

**Buttons (same actions as BubbleMenu):**

| Group | Actions | Icons |
|-------|---------|-------|
| Text formatting | Bold, Italic, Strikethrough, Inline Code | Bold, Italic, Strikethrough, Code |
| Headings | H1, H2, H3 | Heading1, Heading2, Heading3 |
| Lists | Bullet, Numbered, Task | List, ListOrdered, CheckSquare |
| Block | Blockquote | Quote |
| Insert | Link, Image, Table (grid picker) | Link, Image, Table2 |

**Hint text:** Small muted text at the right end: `"Ctrl+Space for inline menu"` — visible on `sm:` breakpoint and up.

**Changes to Editor.tsx:**
1. Replace `<TableToolbar>` with `<EditorToolbar>` in the sticky header
2. `EditorToolbar` internally renders the table controls when `editor.isActive('table')` is true (absorb that logic from `TableToolbar`)
3. When not in a table, render the formatting buttons + table insert button

**Keep `BubbleMenu` as-is** — it still appears on text selection and Ctrl+Space. The toolbar and bubble menu serve different purposes:
- Toolbar = persistent, discoverable, click-first users
- BubbleMenu = contextual, fast, keyboard-first users

### Key Implementation Notes

1. **Extract shared button definitions** — Don't duplicate the toggle logic. Create a shared array of button configs that both `EditorToolbar` and `BubbleMenu` can consume.

2. **Active state** — Toolbar buttons should show active state (highlighted) when the format is active at cursor, same as BubbleMenu.

3. **`onMouseDown={(e) => e.preventDefault()}`** — Critical on all toolbar buttons to prevent stealing focus from the editor. BubbleMenu already does this; toolbar must too.

4. **Responsive** — On narrow viewports, the toolbar should wrap or show icon-only (no labels). Use existing `hidden sm:inline` pattern from `TableToolbar`.

5. **Table mode transition** — When cursor enters a table, smoothly swap to table controls. When cursor leaves, swap back to formatting buttons. Use `editor.isActive('table')` check (already done in `TableToolbar`).

6. **Tooltips** — Use `<Tooltip>` on each button (already done in `BubbleMenu`).

### File Changes

| File | Change |
|------|--------|
| `src/components/Editor/EditorToolbar.tsx` | **NEW** — persistent formatting toolbar |
| `src/components/Editor/Editor.tsx` | Replace `<TableToolbar>` import/usage with `<EditorToolbar>`, pass `onLinkClick` and `onImageClick` props |
| `src/components/Editor/TableToolbar.tsx` | Extract table controls into a sub-component, or inline into EditorToolbar |
| `src/components/Editor/BubbleMenu.tsx` | No changes — keep as-is |
| `src/themes/print.css` | Add `.editor-toolbar { display: none !important; }` in print |

### Effort: M (1-2 hours)

---

## Success Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | Editor scrolls with mouse wheel | Load stress-test.md, scroll to bottom |
| 2 | Scrollbar visible on long documents | Visual check |
| 3 | Print preview shows only content | Ctrl+P, verify no UI chrome |
| 4 | Rich text paste looks formatted | Copy → paste into Google Docs |
| 5 | Plain text paste shows markdown | Copy → paste into Notepad |
| 6 | Toolbar shows formatting buttons | Visual check — Bold, Italic, headings, etc. visible |
| 7 | Table controls still work | Click in table, verify toolbar swaps to table mode |
| 8 | Ctrl+Space still opens BubbleMenu | Test in editor |
| 9 | Toolbar hint visible | "Ctrl+Space for inline menu" shown |
| 10 | `npm run test` still passes | All 97 tests green |
| 11 | `npm run lint` passes | 0 errors |
| 12 | `npm run build` passes | 0 errors |

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/Editor/EditorToolbar.tsx` | Persistent formatting toolbar (replaces `TableToolbar` in layout) |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/Editor/Editor.tsx` | Fix scroll classes, swap TableToolbar for EditorToolbar |
| `src/themes/print.css` | Add selectors for frontmatter, table toolbar, debug panel |
| `src/utils/exportHelpers.ts` | Rewrite `copyAsRichText` with inline styles + markdown fallback |

### Test Files (existing — no changes needed)
The existing 97 tests should continue passing. The fixes are CSS/layout changes and a function rewrite that doesn't affect existing test contracts.

---

## Deferred: Video & Media Support (v1.1 or v1.2)

### Research Findings

**TipTap has official media extensions:**
- `@tiptap/extension-youtube` — YouTube embeds via iframe (paste URL → auto-embed)
- `@tiptap/extension-twitch` — Twitch embeds via iframe
- Both use `createAtomBlockMarkdownSpec` for markdown serialization (outputs `:::youtube{src="url"}:::` syntax)
- Both support paste-to-embed, drag, and custom dimensions

**For local video/GIF:**
- **GIFs already work** — they're just images (`![cat](cat.gif)` renders fine in `<img>`)
- **Local video (mp4, webm)** would need a custom `Video` node extension following the `CustomImage` pattern:
  - Render `<video controls>` in the editor instead of `<img>`
  - Support src (data URL for preview) + localPath (relative path for serialization)
  - Markdown output: `![video](clip.mp4)` using image syntax (most portable)
  - Detect video MIME types to render `<video>` vs `<img>` in the editor

**Markdown serialization challenge:**
Standard markdown has no video syntax. Options:
1. **Image syntax with extension detection:** `![video](clip.mp4)` — most portable, editor detects extension and renders `<video>`. Other renderers show a broken image or link.
2. **HTML tags:** `<video src="clip.mp4" controls></video>` — but our config has `html: false`
3. **Custom directive:** `:::video{src="clip.mp4"}:::` — the TipTap v3 approach, but non-standard markdown

**Recommendation:** Option 1 (image syntax) for local files. Users see a `<video>` player in RendMD; other editors show a link. This preserves the "true markdown output" philosophy. For YouTube, add `@tiptap/extension-youtube` with paste-to-embed support — it uses the directive syntax which is acceptable for embeds.

**Effort:** M-L. Custom Video extension + YouTube integration + UI for inserting videos + toolbar button. Best suited for v1.1 or v1.2.

---

## Build Order

1. **Fix 1: Scrolling** — 2 className changes in Editor.tsx
2. **Fix 2: Print CSS** — 4 CSS selectors in print.css
3. **Fix 3: Rich Text** — Rewrite `copyAsRichText` + add `addInlineStyles` helper
4. **Enhancement 4: Toolbar** — New EditorToolbar component, wire into Editor.tsx
5. **Verify** — Run `npm run test`, `npm run lint`, `npm run build`
6. **Manual test** — Load stress-test.md, test scroll, print, clipboard, toolbar

---

## Stress Test File

**Location:** `tests/fixtures/stress-test.md`

This file contains adversarial content designed to break everything:
- Extreme frontmatter (nested YAML, unicode keys, multiline values, type coercion)
- 8-level deep list nesting
- 10-column × 10-row tables
- Unicode torture (RTL, CJK, combining chars, ZWJ emoji sequences, zero-width chars)
- HTML injection attempts (`<script>`, `<iframe>`, onclick handlers)
- Unclosed formatting (`**never closed`)
- Code blocks with nested backticks and markdown-like content
- 1000+ character paragraphs
- 20 consecutive headings (TOC stress)
- Empty/minimal elements
- Whitespace torture (tabs, trailing spaces, mixed indentation)

**Usage:** Open this file in the editor after each fix to verify nothing crashes.
