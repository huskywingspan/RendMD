# Builder Handoff: Phase 6 — Testing, Documentation & v1.0 Release

> **Created:** 2026-02-08  
> **Researcher:** Copilot (Researcher mode)  
> **Prerequisites:** Phases 0–5 complete (0 errors, 0 warnings, 370 KB main chunk)  
> **Version:** 0.9.0 → target **1.0.0**

---

## Overview

Phase 6 is the final phase. The goal is to ship a v1.0 that is **tested, documented, and releasable**. No new features — only quality, confidence, and completeness.

**What we have:** A feature-complete rendered-first markdown editor with editing, themes, tables, images, TOC, source view, frontmatter, exports, settings, tooltips, and toast notifications. 370 KB main chunk. 0 build errors.

**What we need:** Tests, README, LICENSE, accessibility audit, cross-browser verification, and a clean v1.0 tag.

---

## Sub-Phases

### Phase 6A: Test Infrastructure + Unit Tests

**Goal:** Set up Vitest and write unit tests for pure utility functions.

#### 6A.1: Install Vitest

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Add to `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

Add to `vite.config.ts`:
```typescript
/// <reference types="vitest" />
export default defineConfig({
  // ... existing config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

#### 6A.2: Unit Tests — Priority Targets

These are all **pure functions** with no DOM or editor dependency. Easy wins for high confidence:

**File: `src/utils/__tests__/frontmatterParser.test.ts`**

| Test Case | Function | What to Test |
|-----------|----------|-------------|
| Parse valid frontmatter | `parseFrontmatter` | Input with `---` delimiters → `{ frontmatter, content }` |
| Parse empty frontmatter | `parseFrontmatter` | `---\n---\n` → empty object + content |
| No frontmatter | `parseFrontmatter` | Plain markdown → `null` frontmatter, full content |
| Invalid YAML | `parseFrontmatter` | Malformed YAML → `null` frontmatter, graceful fallback |
| Serialize frontmatter | `serializeFrontmatter` | Object → `---\nkey: value\n---\ncontent` |
| Serialize null frontmatter | `serializeFrontmatter` | `null` → just content, no delimiters |
| Update field | `updateFrontmatterField` | Update existing key, add new key, remove key |
| Parse tags | `parseTags` | `"a, b, c"` → `["a", "b", "c"]` |
| Format tags | `formatTags` | `["a", "b"]` → `"a, b"` |
| Edge: nested YAML | `parseFrontmatter` | Nested objects, arrays |
| Edge: special characters | `parseFrontmatter` | Colons, quotes, unicode in values |

**File: `src/utils/__tests__/imageHelpers.test.ts`**

| Test Case | Function | What to Test |
|-----------|----------|-------------|
| Sanitize filename | `sanitizeFilename` | Spaces → hyphens, special chars removed, lowercase |
| Generate image filename | `generateImageFilename` | Produces timestamped unique name |
| Check image file | `isImageFile` | `.png`, `.jpg`, `.gif`, `.webp` → true; `.txt`, `.pdf` → false |
| Format file size | `formatFileSize` | `0` → "0 Bytes", `1024` → "1 KB", `1048576` → "1 MB" |
| Edge: empty filename | `sanitizeFilename` | `""` → fallback name |
| Edge: very long name | `sanitizeFilename` | Truncated to reasonable length |

**File: `src/utils/__tests__/exportHelpers.test.ts`**

| Test Case | Function | What to Test |
|-----------|----------|-------------|
| Escape HTML | `escapeHTML` | `<script>` → `&lt;script&gt;` |
| Export HTML structure | `exportAsHTML` | Contains `<!DOCTYPE html>`, `<style>`, content |

Note: `captureThemeVariables` and `copyAsRichText` need DOM/browser APIs — skip for unit tests, verify manually.

**File: `src/utils/__tests__/cn.test.ts`**

| Test Case | Function | What to Test |
|-----------|----------|-------------|
| Merge classes | `cn` | `cn('a', 'b')` → `'a b'` |
| Conditional | `cn` | `cn('a', false && 'b')` → `'a'` |
| Tailwind conflict | `cn` | `cn('p-2', 'p-4')` → `'p-4'` (twMerge resolves) |

#### 6A.3: Unit Tests — Store Logic

**File: `src/stores/__tests__/editorStore.test.ts`**

| Test Case | What to Test |
|-----------|-------------|
| `setContent` sets isDirty | `setContent('x')` → `isDirty === true` |
| `markClean` resets dirty | After `setContent`, `markClean()` → `isDirty === false` |
| `setFilePath` sets both filePath and fileName | `setFilePath('/a/b/doc.md')` → `fileName === 'doc.md'` |
| `cycleViewMode` cycles correctly | render → source → split → render |
| `toggleSidebar` toggles | closed → open, open → closed |
| Font size persists | Set 18, read back 18 |

---

### Phase 6B: Integration Testing

**Goal:** Verify markdown round-trip fidelity with automated tests.

#### 6B.1: Round-Trip Test Suite

The existing `roundtrip.ts` utility and `tests/fixtures/markdown-test-suite.md` provide the framework. Convert to Vitest:

**File: `src/test/roundtrip.test.ts`**

This requires creating a TipTap editor instance in the test. Use the same `createEditorExtensions` factory:

```typescript
import { Editor } from '@tiptap/react';
import { createEditorExtensions } from '@/components/Editor/extensions';
import { Markdown } from 'tiptap-markdown';

function createTestEditor(content: string): Editor {
  return new Editor({
    extensions: [...createEditorExtensions(true), Markdown],
    content,
  });
}

function roundTrip(markdown: string): string {
  const editor = createTestEditor(markdown);
  editor.commands.setContent(markdown); // Parse MD → ProseMirror
  const output = editor.storage.markdown.getMarkdown(); // Serialize back
  editor.destroy();
  return output;
}
```

| Test Case | Input | Expected |
|-----------|-------|----------|
| Headings | `# H1\n## H2\n### H3` | Same |
| Bold/italic | `**bold** *italic*` | Same |
| Links | `[text](url "title")` | Preserved |
| Images | `![alt](url)` | Preserved |
| Code blocks | ````\`\`\`js\nconst x = 1;\n\`\`\```` | Same |
| Tables | GFM table with alignment | Structure preserved (alignment may normalize) |
| Task lists | `- [x] Done\n- [ ] Todo` | Same |
| Blockquotes | `> quote\n> > nested` | Same |
| Nested lists | 3+ levels of nesting | Same |
| Frontmatter | `---\ntitle: Test\n---\ncontent` | Separated correctly |
| Mixed formatting | `**bold _and italic_**` | Preserved |
| Horizontal rule | `---` | Same |
| Empty document | `""` | `""` |

**Note:** Some normalizations are acceptable (documented in ADR-010): `* item` → `- item`, `***` → `---`, reference links → inline. Test for semantic equivalence, not byte-for-byte identity.

---

### Phase 6C: Accessibility Audit

**Goal:** Ensure keyboard navigation works and basic a11y standards are met.

#### 6C.1: Add jsx-a11y Lint Plugin

```bash
npm install -D eslint-plugin-jsx-a11y
```

Add to `eslint.config.js`:
```typescript
import jsxA11y from 'eslint-plugin-jsx-a11y';
// Add to config array:
jsxA11y.flatConfigs.recommended,
```

Run `npm run lint` and fix any violations. Common ones to expect:
- Missing `alt` on images (should already be handled by TipTap)
- Click handlers without keyboard equivalent
- Missing button types

#### 6C.2: Manual Keyboard Navigation Audit

Test the following flows using **only the keyboard** (no mouse):

| Flow | Keys | Expected |
|------|------|----------|
| Open file | Ctrl+O | File dialog opens |
| Save file | Ctrl+S | File saves |
| Toggle bold | Ctrl+B | Text bolds |
| Open shortcuts | Ctrl+H | Modal opens, focus trapped, Escape closes |
| Open settings | Click gear → Tab through fields | Focus moves through theme, font size, auto-save |
| Navigate TOC | Tab to sidebar, Enter on heading | Editor scrolls to heading |
| Export menu | Tab to export button, Enter, arrow keys | Dropdown opens, items navigable |
| BubbleMenu | Select text, Tab through buttons | Formatting buttons focusable |
| Close modal | Escape | Any open modal closes |
| Dismiss toast | Tab to toast dismiss button, Enter | Toast removed |

#### 6C.3: Landmark Roles

Ensure the app has proper semantic structure:

```tsx
// Header → <header role="banner">
// Sidebar → <aside role="complementary"> or <nav>
// Editor area → <main role="main">
// Modals already have role="dialog"
```

#### 6C.4: Color Contrast

Verify in all 4 themes:
- Body text meets WCAG AA (4.5:1 ratio)
- Button text/icons meet AA (3:1 for large text)
- Focus indicators are visible

Use browser DevTools → Accessibility panel, or axe DevTools extension.

---

### Phase 6D: Cross-Browser Testing

**Goal:** Verify core functionality in major browsers.

| Browser | Test | Notes |
|---------|------|-------|
| **Chrome** (latest) | Full test — all features | Primary target |
| **Edge** (latest) | Full test — all features | Same engine as Chrome |
| **Firefox** (latest) | Core editing, themes, export, print | No File System Access API — uses fallback |
| **Brave** | Core editing, image insert, export | FS API blocked — local file insert uses path field |
| **Safari** (if available) | Core editing, themes | No FS API, may have Clipboard API limitations |

**Test matrix per browser:**
1. Open a file (or use fallback input)
2. Edit text (bold, italic, headings, lists)
3. Add/edit table
4. Add image via URL tab
5. Toggle source view
6. Export HTML, print PDF
7. Switch all 4 themes
8. Open settings, change font size
9. Open shortcuts modal
10. Check TOC navigation

---

### Phase 6E: Documentation

#### 6E.1: README Rewrite

The current README is a placeholder. Rewrite it as a proper v1.0 README:

```markdown
# RendMD

> The thinking person's markdown editor  
> *Intelligent. Elegant. Your data. Open source.*

[Screenshot/GIF here]

## What is RendMD?

RendMD is a **rendered-first markdown editor** — edit your documents from their 
beautifully rendered state, not raw source. Your files stay as portable `.md` files.

## Features

- ✅ **Rendered-first editing** — click and type in the formatted view
- ✅ **Source view** — toggle between rendered, source, and split views
- ✅ **4 themes** — dark/light basic and glassmorphism variants  
- ✅ **Table editing** — visual table manipulation with GFM output
- ✅ **Image handling** — drag-drop, paste, URL/local/base64
- ✅ **Table of Contents** — auto-generated, click to navigate
- ✅ **Frontmatter** — YAML metadata panel with form UI
- ✅ **Export** — HTML, PDF, copy as rich text
- ✅ **Keyboard shortcuts** — full shortcut set with help modal (Ctrl+H)
- ✅ **Settings** — theme, font size, auto-save
- ✅ **Syntax highlighting** — Shiki-powered code blocks

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run
\```bash
git clone https://github.com/[username]/rendmd.git
cd rendmd
npm install
npm run dev
\```

Open http://localhost:5173 in your browser.

### Build for Production
\```bash
npm run build
npm run preview
\```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save | Ctrl+S |
| Open | Ctrl+O |
| Bold | Ctrl+B |
| Italic | Ctrl+I |
| Code | Ctrl+` |
| Link | Ctrl+K |
| Heading 1-3 | Ctrl+1/2/3 |
| Toggle source | Ctrl+/ |
| Shortcuts help | Ctrl+H |
| Insert image | Ctrl+Shift+I |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript |
| Editor | TipTap (ProseMirror) |
| Build | Vite 5 |
| Styling | Tailwind CSS |
| State | Zustand |
| Highlighting | Shiki |

## Documentation

- [Design Document](docs/DESIGN_DOCUMENT.md)
- [Project Plan](docs/PROJECT_PLAN.md)
- [Project Chronicle](docs/PROJECT_CHRONICLE.md)

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome / Edge | ✅ Full (native file access) |
| Firefox | ✅ Core features (file input fallback) |
| Brave | ✅ Core features (file input fallback) |
| Safari | ⚠️ Basic (limited Clipboard API) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

[MIT License](LICENSE)

## Roadmap

- **v1.1** — AI writing assistance (BYOK), recent files, file browser
- **v1.2** — VS Code extension, Mermaid diagrams, KaTeX math
- **v2.0** — Plugin API, community themes

---

*Built for writers, developers, and thinkers everywhere.*
```

**Note:** Replace `[Screenshot/GIF here]` with an actual screenshot after the builder takes one. The `[username]` placeholder should be filled in with the actual GitHub username.

#### 6E.2: LICENSE File

**Recommendation: MIT License**

| License | Pros | Cons | Verdict |
|---------|------|------|---------|
| MIT | Maximum adoption, simple, permissive, compatible with everything | Companies can fork without contributing back | **Recommended** |
| Apache 2.0 | Patent grant, permissive | More complex, intimidating for hobbyists | Good alternative |
| GPL v3 | Copyleft ensures derivatives stay open | Limits corporate adoption, incompatible with some licenses | Not recommended |
| AGPL | Strongest copyleft | Scares away most users and contributors | Not recommended |

**MIT is the standard for open-source developer tools** (VS Code extensions, React, Vite, TipTap itself, Zustand — all MIT). It aligns with the project's philosophy of accessibility and openness.

Create `LICENSE` in project root with the standard MIT text, year 2026, and the author's name.

#### 6E.3: CONTRIBUTING.md

Create `CONTRIBUTING.md`:
- Development setup (clone, install, dev server)
- Project structure overview (link to design doc)
- Coding standards summary (from `.github/copilot-instructions.md`)
- How to add a TipTap extension
- How to add a theme
- Commit message format (conventional commits)
- PR process
- Where to report issues

#### 6E.4: Update Docs

- `docs/PROJECT_PLAN.md` — Mark Phase 6 complete, bump to 1.0.0
- `docs/DESIGN_DOCUMENT.md` — Review for accuracy, update any stale sections
- `package.json` — Bump `version` to `"1.0.0"`

---

### Phase 6F: Final Polish & Release

#### 6F.1: Performance Spot Check

Load a large markdown document (~2000 lines) and verify:
- Editor doesn't lag on typing
- Source view handles large content
- TOC updates don't cause visible jank
- Theme switching is instant

If the test fixture from Phase 0.5 isn't large enough, create a bigger one by repeating sections.

#### 6F.2: Edge Case Sweep

Test with deliberately broken/weird inputs:

| Input | Expected Behavior |
|-------|-------------------|
| Empty file | Empty state shows |
| File with only frontmatter, no content | Frontmatter panel populates, editor is empty |
| Malformed YAML frontmatter | Graceful fallback (console.warn, content still loads) |
| Extremely long heading (500+ chars) | TOC truncates or wraps, no overflow |
| Table with 20+ columns | Horizontal scroll, no layout break |
| Code block with no language | Renders as plain text, no error |
| Image with broken URL | Shows broken image placeholder, no crash |
| Nested blockquotes 10+ deep | Renders with increasing indent, no crash |
| Unicode/emoji in all elements | Displays correctly |
| File with Windows line endings (CRLF) | Handles transparently |

#### 6F.3: Clean Up Dev Artifacts

- Remove or guard `DebugPanel` behind `import.meta.env.DEV`
  - (It's already guarded — verify it doesn't appear in production build)
- Remove `dev.bat` / `dev.ps1` if they're just convenience scripts, or keep if useful
- Remove `window.loadTestMarkdown` / `window.getMarkdown` / `window.editor` globals from production
  - (Verify these are guarded by `import.meta.env.DEV`)
- Check for any `console.log` statements that should be `console.debug` or removed

#### 6F.4: Version Bump & Release

1. Bump `package.json` version to `1.0.0`
2. Final `npm run build` — confirm 0 errors, 0 warnings
3. `npm run test` — all tests pass
4. `npm run lint` — all clear
5. Git tag: `git tag v1.0.0`
6. Write release notes (can be derived from this chronicle)

---

## Implementation Priority

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | **6A: Vitest setup + unit tests** | Medium | High — establishes test confidence |
| 2 | **6E.2: LICENSE file** | Tiny | High — blocker for public release |
| 3 | **6E.1: README rewrite** | Small | High — first thing people see |
| 4 | **6B: Round-trip integration tests** | Medium | High — core correctness |
| 5 | **6C.1: jsx-a11y lint** | Small | Medium — catches low-hanging a11y fruit |
| 6 | **6C.2-4: Accessibility audit** | Medium | Medium — professionalism |
| 7 | **6D: Cross-browser testing** | Medium | Medium — confidence |
| 8 | **6E.3: CONTRIBUTING.md** | Small | Medium — community readiness |
| 9 | **6F.1-2: Performance + edge cases** | Medium | Medium — robustness |
| 10 | **6F.3-4: Cleanup + version bump** | Small | High — release gate |

**Recommended order:** 6A (tests) → 6E.2 (LICENSE) → 6E.1 (README) → 6B (integration tests) → 6C (a11y) → 6D (cross-browser) → 6F (polish + edge cases) → 6E.3 (CONTRIBUTING) → 6E.4 + 6F.4 (final docs + release)

---

## Files to Create

| File | Purpose |
|------|---------|
| `LICENSE` | MIT license text |
| `CONTRIBUTING.md` | Contributor guide |
| `src/test/setup.ts` | Vitest setup (jest-dom import) |
| `src/utils/__tests__/frontmatterParser.test.ts` | Frontmatter parser unit tests |
| `src/utils/__tests__/imageHelpers.test.ts` | Image helper unit tests |
| `src/utils/__tests__/exportHelpers.test.ts` | Export helper unit tests |
| `src/utils/__tests__/cn.test.ts` | Class name utility tests |
| `src/stores/__tests__/editorStore.test.ts` | Store logic tests |
| `src/test/roundtrip.test.ts` | Markdown round-trip integration tests |

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add vitest deps, test scripts, bump to 1.0.0 |
| `vite.config.ts` | Add Vitest config block |
| `eslint.config.js` | Add `eslint-plugin-jsx-a11y` |
| `README.md` | Complete rewrite |
| `docs/PROJECT_PLAN.md` | Mark Phase 6 complete |

---

## Success Criteria

1. `npm run test` passes with all unit + integration tests green
2. `npm run lint` passes (including jsx-a11y rules)
3. `npm run build` passes with 0 errors, 0 warnings
4. LICENSE file exists (MIT)
5. README is complete with features, setup, shortcuts, browser support
6. CONTRIBUTING.md exists
7. Keyboard navigation works for all primary flows
8. App works in Chrome, Edge, Firefox, Brave
9. No `console.log` in production build (only `console.warn`/`error` where appropriate)
10. `package.json` version is `1.0.0`
11. Edge cases don't crash the app

---

## Scope Boundaries

**In scope:** Tests, documentation, a11y, cross-browser, edge cases, cleanup, release

**Out of scope:** New features, AI integration, VS Code extension, file browser, search — all deferred to v1.1+

---

*This is the finish line. After Phase 6, RendMD v1.0.0 ships.*
