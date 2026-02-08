# RendMD - Project Chronicle

> A living document of decisions, discoveries, and lessons learned.

---

## Project Identity

**Name:** RendMD  
**Tagline:** *Intelligent. Elegant. Your data. Open source.*  
**Positioning:** The thinking person's markdown editor.

## Project Philosophy

> **"Make markdown a more accessible format for the everyday writer, developer, or anyone who uses a computer, in an elegant open source package."**

---

## 2026-01-29 - Project Inception

### Context
Started RendMD project - a rendered-first markdown editor. The goal is to edit markdown documents from their beautifully rendered state rather than editing raw source, while maintaining clean markdown file output.

**Tagline:** *Intelligent. Elegant. Your data. Open source.*  
**Positioning:** The thinking person's markdown editor.

### Initial Competitive Analysis

| Product | Rendered-First | True MD | Open Source | AI | Premium UX | Free |
|---------|---------------|---------|-------------|-----|------------|------|
| Typora | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ ($15) |
| Notion | ❌ | ❌ | ❌ | ✅ | ✅ | ⚠️ Freemium |
| Obsidian | ❌ | ✅ | ❌ | 🔌 Plugin | ✅ | ⚠️ Freemium |
| Milkdown | ✅ | ✅ | ✅ | ❌ | ⚠️ | ✅ |
| **RendMD** | ✅ | ✅ | ✅ | ✅ (v1.1) | ✅ (goal) | ✅ |

**Gap identified:** No open source, rendered-first editor with AI assistance exists.

### Key Decisions Made

---

#### ADR-001: Rendered-First Editing Paradigm
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** Most markdown editors are either source-focused (edit raw MD, see preview) or fully WYSIWYG (no markdown output). We want both: visual editing with markdown file output.

**Decision:** Build a "rendered-first" editor where the rendered view is the primary editing surface, but all content is stored as standard markdown.

**Rationale:**
- Preserves markdown portability (files work everywhere)
- Eliminates context-switching between source/preview
- More approachable for non-technical users
- Aligns with philosophy of making markdown accessible to everyone
- Unique positioning in the market

**Consequences:**
- ✅ Better UX than split-pane editors
- ✅ Files remain portable
- ✅ Lowers barrier to entry for markdown
- ⚠️ Requires robust markdown round-trip logic
- ⚠️ Some advanced markdown users may want source view (mitigated: adding toggle)

---

#### ADR-002: Technology Stack Selection
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** Need to choose frontend framework, editor library, and supporting tools.

**Decision:** 
- React 18 + TypeScript
- TipTap (ProseMirror-based) for editor
- Tailwind CSS + CSS variables for styling
- Vite for build tooling
- Zustand for state management
- Shiki for code highlighting

**Rationale:**
- TipTap has proven markdown import/export capabilities
- React ecosystem is mature for this type of application
- Tailwind enables rapid development while CSS variables allow theming
- Zustand is minimal overhead vs Redux/MobX
- Shiki provides accurate, theme-aware syntax highlighting

**Alternatives Considered:**
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Svelte | Lighter, less boilerplate | Less editor tooling | Rejected |
| Milkdown | Markdown-focused | Less mature | Consider for future |
| Vue | Good ecosystem | Less familiar | Rejected |
| CodeMirror | Great for code | Less rich-text focused | Rejected |

**Consequences:**
- ✅ Large ecosystem of examples and solutions
- ✅ Type safety from TypeScript
- ⚠️ React bundle size (acceptable for desktop/local app)
- ⚠️ Learning curve for TipTap/ProseMirror internals

---

#### ADR-003: Four-Theme Priority Order
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** User wants four themes: dark basic, light basic, dark glass, light glass.

**Decision:** Development order:
1. Dark basic (primary development theme)
2. Light basic
3. Dark glassmorphism
4. Light glassmorphism

**Rationale:**
- Dark theme is developer-friendly for long coding sessions
- Basic themes establish core design system before adding effects
- Glass themes are enhancement layer on top of basic foundations
- This order minimizes rework

---

#### ADR-004: Source View Toggle
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** Should users be able to see/edit raw markdown source?

**Decision:** Yes, include a source view toggle. Hidden by default, accessible via button or Ctrl+/.

**Rationale:**
- Power users expect to see/verify source
- Useful for debugging rendering issues
- Educational for users learning markdown
- Hidden by default maintains rendered-first philosophy

**Implementation Notes:**
- Side panel layout (not bottom, to preserve reading flow)
- Read-only by default (editing source directly adds complexity)
- Synced scrolling optional enhancement

---

#### ADR-005: Image Handling Strategy
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** When users add images, should they be stored locally or referenced by URL?

**Decision:** Support both options. When user adds an image, prompt them to choose:
1. Store locally in `./assets/` folder (relative path)
2. Reference external URL

**Rationale:**
- Local storage ensures portability and offline access
- URL reference is lighter weight and works for web images
- User choice respects different workflows
- No one-size-fits-all solution exists

**Implementation Notes:**
- Create `assets/` folder on first local image save
- Generate unique filenames (timestamp or hash prefix)
- Relative paths for portability

---

#### ADR-006: Frontmatter Support
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** Should we support YAML frontmatter blocks for document metadata?

**Decision:** Yes, with a dedicated UI panel (not just raw YAML editing).

**Rationale:**
- Frontmatter is standard in static site generators, documentation tools
- Form-based UI makes metadata accessible to non-technical users
- Can enable features like per-document theme override
- Aligns with accessibility philosophy

**Implementation Notes:**
- Parse YAML on file load, separate from content
- Display as collapsible form panel above document
- Common fields: title, author, date, tags, theme
- Support custom key-value pairs
- Serialize back to YAML on save

---

### Research Notes

**TipTap Markdown Ecosystem:**
- `@tiptap/extension-markdown` - Official but basic
- `tiptap-markdown` - Community extension with more features
- May need custom serializer rules for edge cases (tables, nested lists)
- Round-trip testing critical before committing to approach

**File System Access API:**
- Supported in Chromium browsers (Chrome, Edge, Opera)
- NOT supported in Firefox or Safari
- Fallback strategy:
  - Open: `<input type="file" accept=".md">`
  - Save: Create blob, trigger download
  - Less elegant but functional
- Can request persistent permissions (user grants once)

**Glassmorphism Implementation:**
- Core CSS: `backdrop-filter: blur(12px)` + semi-transparent background
- GPU-accelerated in modern browsers
- Firefox: `backdrop-filter` now supported (was behind flag until 2023)
- Safari: Full support with `-webkit-` prefix
- Performance considerations:
  - Avoid animating blur values
  - `will-change: backdrop-filter` for performance hints
  - Limit glass layers (don't stack multiple blurs)

**Frontmatter Parsing:**
- Use `yaml` package from npm (formerly `js-yaml`)
- Detect frontmatter by `---` delimiters at file start
- Regex: `/^---\n([\s\S]*?)\n---/`
- Handle edge cases: empty frontmatter, invalid YAML

---

### Open Questions (Resolved)

| Question | Resolution | Date |
|----------|------------|------|
| Source view toggle? | Yes, hidden by default | 2026-01-29 |
| Image handling | Support both URL and local | 2026-01-29 |
| Frontmatter support | Yes, with form UI | 2026-01-29 |

### Open Questions (Pending)

| Question | Options | Notes |
|----------|---------|-------|
| License choice | MIT, Apache 2.0, GPL | Need to decide before public release |
| Project hosting | GitHub, GitLab, self-hosted | GitHub likely for community |
| Error telemetry | None, opt-in, opt-out | Privacy considerations |
| AI default provider | OpenAI, Anthropic, Google, none | For v1.1, need to pick sensible default |

---

#### ADR-007: Source View is Editable
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** Should the source view be read-only or editable?

**Decision:** Source view is fully editable with bidirectional sync. All editing tools (toolbar, shortcuts) work in both rendered and source views.

**Rationale:**
- Power users expect to edit source directly
- Limiting to read-only feels arbitrary
- Bidirectional editing is more flexible
- Aligns with accessibility philosophy (multiple ways to edit)

**Consequences:**
- ✅ More powerful for advanced users
- ✅ Familiar to traditional markdown editor users  
- ⚠️ More complex sync logic required
- ⚠️ Need to handle conflicting edits gracefully

---

#### ADR-008: AI Assistance Feature (Stretch Goal → v1.1 Target)
**Status:** Proposed  
**Date:** 2026-01-29

**Context:** Should RendMD include AI writing assistance? This is a potential key differentiator.

**Decision:** Plan for AI assistance as a v1.1 feature, using BYOK (Bring Your Own Key) model.

**Rationale:**
- **Differentiation:** No open source rendered-first editor has native AI
- **No backend cost:** User provides their own API key
- **Privacy-first:** Keys stored locally, encrypted; direct API calls
- **Inspired by Notion AI** but without vendor lock-in
- Aligns with philosophy of making markdown accessible

**Planned Providers:**
- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet, Haiku)
- Google (Gemini Pro, Flash)
- Ollama (local models - fully private option)
- OpenRouter (aggregator)

**Planned Features:**
- Continue writing / autocomplete
- Improve writing (grammar, clarity, tone)
- Summarize selection or document
- Expand on a point
- Translate to other languages
- Custom prompts

**Consequences:**
- ✅ Major differentiator in the market
- ✅ No server costs (BYOK model)
- ✅ Supports local AI (Ollama) for privacy
- ⚠️ Additional complexity
- ⚠️ Must handle API errors gracefully
- ⚠️ User education needed for API key management

---

#### ADR-009: Feature Philosophy - Strategically Complete
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** In a saturated market, should RendMD be feature-dense (like Obsidian) or minimal (like a simple text editor)?

**Decision:** Neither. Be "strategically complete" - flawless core + key differentiators + extensibility foundation.

**Tiered Approach:**
| Tier | Version | Focus |
|------|---------|-------|
| Core | v1.0 | Editing, themes, files, navigation - must be flawless |
| Power | v1.x | AI assistance, advanced export - differentiators |
| Extensible | v2.0 | Plugin API, community themes - ecosystem |

**Rationale:**
- Minimal is hard to differentiate (many simple editors exist)
- Feature-dense risks bloat and maintenance burden
- Strategic features that matter > many features that don't
- AI is the right differentiator because no competitor has it in this space

**Value Proposition:**
> "Notion's intelligence. Typora's elegance. Your data. Open source."

**Consequences:**
- ✅ Clear product identity
- ✅ Focused development effort
- ✅ Room to grow without bloat
- ⚠️ Must resist scope creep in v1.0
- ⚠️ AI feature is a commitment

---

## 2026-01-29 - Phase 0 Complete

### Completion Summary

**Status:** ✅ Approved by Reviewer  
**Bundle Size:** 732KB (baseline, optimization planned for Phase 5)  
**Build:** Passing (TypeScript, ESLint, Vite)  
**Commits:** 5 commits following conventional commit format

### What Was Built
- Vite + React + TypeScript project scaffold
- TipTap editor with tiptap-markdown extension
- Zustand store for state management
- Header, Sidebar, Editor components
- Dark basic theme with CSS variables
- Source view toggle (read-only display)
- Path aliases (`@/components`, etc.)

### Known Issues (Acceptable)
| Issue | Severity | Mitigation |
|-------|----------|------------|
| `tiptap-markdown` lacks TypeScript types | Low | `@ts-expect-error` comment with explanation |
| VS Code shows false positive import errors | Low | Build works, non-blocking |
| Bundle size 732KB | Medium | Code-splitting planned for Phase 5 |

### Key Decisions Made

---

#### ADR-010: Markdown Round-Trip Testing Strategy
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** Markdown round-trip fidelity is core to product identity. We need to validate tiptap-markdown before building features on top of it.

**Decision:** Create Phase 0.5 focused on validation and debugging infrastructure.

**Testing Strategy:**

1. **Test Data Generation**
   - Create `tests/fixtures/markdown-test-suite.md` with:
     - All GFM elements (headings, lists, tables, code, links, images)
     - Edge cases (nested lists 3+ deep, complex tables, mixed formatting)
     - Frontmatter variations
     - Known problematic patterns

2. **Validation Approach**
   - Unit tests comparing input → output markdown
   - Visual diff for rendered output
   - Automated CI checks

3. **Debug Infrastructure**
   - Dev-only debug panel showing:
     - Raw input markdown
     - ProseMirror document JSON (internal state)
     - Serialized output markdown
     - Diff highlighting between input/output
   - Console logging for parse/serialize (toggleable)

**Rationale:**
- Catch issues early before they compound
- Debugging visibility reduces troubleshooting time
- Test file becomes regression suite
- Documented limitations prevent user confusion

**Consequences:**
- ✅ High confidence in core functionality
- ✅ Easier debugging throughout development
- ✅ Known limitations documented upfront
- ⚠️ Small time investment before Phase 1

---

#### ADR-011: Phase 1.5 for Polish Items
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** Phase 1 scope includes Shiki syntax highlighting and theme toggle wiring. These are valuable but could delay core editing features.

**Decision:** Create Phase 1.5 as a brief follow-up sprint for polish items:
- Shiki syntax highlighting
- Theme toggle wiring
- Code block language selector
- Developer experience improvements

**Rationale:**
- Keeps Phase 1 focused on core editing
- Avoids scope creep in main sprint
- Polish items are still done, just sequenced better
- Maintains predictable sprint velocity

**Consequences:**
- ✅ Phase 1 stays focused
- ✅ Clear boundary between "must have" and "polish"
- ⚠️ Slightly more phases to track

---

#### ADR-012: Bundle Size Target
**Status:** Accepted  
**Date:** 2026-01-29

**Context:** Phase 0 bundle is 732KB. Our principle is "lightweight."

**Decision:** Target <500KB initial bundle by Phase 5, using code-splitting.

**Optimization Strategy:**
1. Analyze with `vite-bundle-visualizer`
2. Lazy-load source view panel
3. Lazy-load Shiki (on first code block)
4. Lazy-load export functionality
5. Consider alternatives if major deps are too heavy

**Rationale:**
- 732KB is acceptable for MVP but not ideal
- Code-splitting is low-risk optimization
- Don't optimize prematurely; wait for Phase 5

**Consequences:**
- ✅ Track issue without blocking progress
- ✅ Clear target for Phase 5
- ⚠️ May need to revisit if bundle grows significantly

---

## 2026-01-29 - Phase 0.5 Complete

### Completion Summary

**Status:** ✅ Round-trip validation complete  
**Test Suite:** 505 lines, 13 sections of GFM elements  
**Result:** Acceptable fidelity with documented transformations

### What Was Built

1. **Test Fixture** - `tests/fixtures/markdown-test-suite.md`
   - Comprehensive GFM coverage (headings, lists, tables, code, links, images)
   - Edge cases (deep nesting, unicode, emoji, whitespace)
   - Validation checklist embedded in document

2. **Debug Panel** - `src/components/Editor/DebugPanel.tsx`
   - Dev-only component (guarded by `import.meta.env.DEV`)
   - Four tabs: Input, Output, Document (ProseMirror JSON), Diff
   - Line-by-line diff visualization
   - Collapsible at bottom of editor

3. **Round-Trip Utility** - `src/utils/roundtrip.ts`
   - `testRoundTrip()` - Compare input/output markdown
   - `formatRoundTripResult()` - Console-friendly output
   - Line difference tracking with stats

4. **Dev Testing API** - Window globals for browser console testing
   - `window.loadTestMarkdown(md)` - Load and track round-trip
   - `window.getMarkdown()` - Get current serialized output
   - `window.editor` - Direct TipTap editor access

### Round-Trip Test Results

| Category | Status | Notes |
|----------|--------|-------|
| Headings (H1-H6) | ✅ Pass | All levels preserved |
| Text formatting | ✅ Pass | Bold, italic, code, strikethrough |
| Links | ✅ Pass | URLs and titles preserved |
| Images | ✅ Pass | Alt text and titles preserved |
| Lists (nested) | ✅ Pass | 4+ levels work |
| Task lists | ✅ Pass | Checkbox states preserved |
| Blockquotes | ✅ Pass | Nesting preserved |
| Code blocks | ✅ Pass | Language tags preserved |
| Tables | ✅ Pass | Alignment markers preserved |
| Frontmatter | ⚠️ Separate | Handled by `frontmatter.ts` |
| Horizontal rules | ⚠️ Normalized | `***`, `___` → `---` |
| Reference links | ⚠️ Normalized | Converted to inline |
| Hard line breaks | ⚠️ Lost | `  \n` not preserved |
| HTML | ❌ Disabled | By design (`html: false`) |

### Known Transformations (Acceptable)

These are semantic-preserving normalizations:

| Input | Output | Impact |
|-------|--------|--------|
| `* item` | `- item` | List marker style (semantic same) |
| `***` or `___` | `---` | Horizontal rule (semantic same) |
| Indented code | Fenced code | More explicit format |
| `[text][ref]` + `[ref]: url` | `[text](url)` | Reference → inline link |

### Action Items for Phase 1

**High Priority:**
- [ ] Add TipTap HardBreak extension for `  \n` support

**Deferred (Acceptable):**
- Reference link preservation (low impact)
- Horizontal rule marker preservation (low impact)
- List marker style preservation (low impact)

### Artifacts

- Test results: `tests/results/phase0.5-roundtrip-results.md`
- Test fixture: `tests/fixtures/markdown-test-suite.md`
- Debug panel: `src/components/Editor/DebugPanel.tsx`
- Round-trip utility: `src/utils/roundtrip.ts`

---

## 2026-01-30 - Phase 1 Complete

### Completion Summary

**Status:** ✅ Approved by Reviewer  
**Commit:** `d3fb95e`  
**Build:** Passing (TypeScript, ESLint, Vite)

### What Was Built

1. **BubbleMenu** - `src/components/Editor/BubbleMenu.tsx`
   - Appears on text selection
   - Formatting buttons: Bold, Italic, Code, Strikethrough, Link
   - Positioned above selection with Floating UI

2. **LinkPopover** - `src/components/Editor/LinkPopover.tsx`
   - Click link to edit URL and text
   - Uses `@floating-ui/react` for positioning
   - Apply/Remove link buttons
   - External link click (Ctrl+Click or button)

3. **ImagePopover** - `src/components/Editor/ImagePopover.tsx`
   - Click image to edit alt text and URL
   - Same Floating UI pattern as LinkPopover

4. **Keyboard Shortcuts Extension** - `src/components/Editor/extensions/KeyboardShortcuts.ts`
   - Ctrl+B (bold), Ctrl+I (italic), Ctrl+` (code)
   - Ctrl+Shift+X (strikethrough)
   - Ctrl+1 through Ctrl+6 (headings)
   - Ctrl+Shift+7 (ordered list), Ctrl+Shift+8 (bullet list)
   - Ctrl+Shift+9 (task list)

### Key Decisions Made

---

#### ADR-013: Floating UI for Popovers
**Status:** Accepted  
**Date:** 2026-01-30

**Context:** Popovers need intelligent positioning to avoid viewport edges.

**Decision:** Use `@floating-ui/react` for all popover positioning.

**Rationale:**
- Handles viewport edge detection automatically
- Works well with React's rendering model
- Lightweight compared to full tooltip libraries
- Consistent positioning behavior across all popovers

---

## 2026-01-30 - Phase 1.5 Complete

### Completion Summary

**Status:** ✅ Approved by Reviewer  
**Commit:** `35a1deb`  
**Files Changed:** 22 files, +2716/-108 lines  
**Build:** Passing (including Shiki lazy-loaded chunks)

### What Was Built

1. **Theme System**
   - `useTheme` hook with localStorage persistence
   - 4 complete CSS theme files (~60 variables each):
     - `dark-basic.css` - Primary development theme
     - `light-basic.css` - Clean light theme
     - `dark-glass.css` - Glassmorphism with backdrop blur
     - `light-glass.css` - Light glassmorphism variant
   - `ThemeDropdown` component with quick toggle + full selector
   - Theme class applied to `<html>` element

2. **Shiki Syntax Highlighting**
   - `CodeBlockComponent` with theme-aware highlighting
   - Language selector dropdown (17 common languages)
   - Copy-to-clipboard button with visual feedback
   - `CodeBlockShiki` TipTap extension wrapping the component
   - Lazy-loaded language grammars (code-split)

3. **Editor Extensions Factory**
   - `createEditorExtensions(isDark)` function
   - Theme-aware Shiki configuration
   - Clean extension registration pattern

### Bundle Analysis

| Metric | Value | Notes |
|--------|-------|-------|
| Main bundle | ~968KB | Includes TipTap, Zustand, core UI |
| Shiki core | ~150KB | Lazy-loaded on first code block |
| Language chunks | ~300 files | Each language grammar separate |
| Themes | 4 files | CSS only, minimal |

### Key Decisions Made

---

#### ADR-014: Shiki over Lowlight for Syntax Highlighting
**Status:** Accepted  
**Date:** 2026-01-30

**Context:** Code blocks need syntax highlighting. Options considered: lowlight (highlight.js), Shiki (VS Code's engine), Prism.

**Decision:** Use Shiki for syntax highlighting.

**Rationale:**
- Accurate highlighting (same engine as VS Code)
- Theme-aware (can match app theme)
- Modern architecture with lazy loading
- Better TypeScript support than alternatives

**Consequences:**
- ✅ Accurate, beautiful syntax highlighting
- ✅ Lazy-loaded languages reduce initial bundle
- ⚠️ Larger total bundle than lowlight (acceptable with code-splitting)

---

#### ADR-015: Four-Theme Implementation Strategy
**Status:** Accepted  
**Date:** 2026-01-30

**Context:** Need to implement dark-basic, light-basic, dark-glass, light-glass themes.

**Decision:** 
- Each theme is a standalone CSS file with all variables
- Themes applied via class on `<html>` element
- Glass themes use `backdrop-filter: blur()` on appropriate surfaces
- Quick toggle switches between dark/light variants of current style

**Theme Architecture:**
```
base.css          → CSS reset, Tailwind imports
dark-basic.css    → 60+ CSS variables for dark basic
light-basic.css   → 60+ CSS variables for light basic  
dark-glass.css    → 60+ CSS variables + backdrop-filter for dark glass
light-glass.css   → 60+ CSS variables + backdrop-filter for light glass
```

**Rationale:**
- Standalone files are easier to maintain than complex override chains
- Class-based switching is fast (no JS computation)
- CSS variables enable component-level theming
- Quick toggle preserves user's style preference (basic vs glass)

---

### Artifacts

- Theme hook: `src/hooks/useTheme.ts`
- Theme files: `src/themes/*.css`
- Theme dropdown: `src/components/Header/ThemeDropdown.tsx`
- Code block: `src/components/Editor/CodeBlockComponent.tsx`
- Shiki extension: `src/components/Editor/extensions/CodeBlockShiki.ts`

---

#### ADR-016: File System Access API Strategy
**Status:** Accepted  
**Date:** 2026-01-30

**Context:** Need to implement local file open/save for Phase 2. File System Access API is modern but has limited browser support.

**Decision:** Use File System Access API with traditional fallbacks:
- **Chrome/Edge:** Full native API (`showOpenFilePicker`, `showSaveFilePicker`, auto-save)
- **Firefox/Safari:** Fallback to `<input type="file">` for open, `<a download>` for save

**Browser Support (as of research date):**

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| `showOpenFilePicker` | 86+ | 86+ | ❌ | ❌ |
| `showSaveFilePicker` | 86+ | 86+ | ❌ | ❌ |
| `createWritable` | 86+ | 86+ | 111+ | 26+ |

**Rationale:**
- ~75% of users (Chrome/Edge) get best experience
- Firefox/Safari users still functional, just download-based saves
- Feature detection makes this transparent to users
- Polyfill library (`browser-fs-access`) available if needed later

**Consequences:**
- ✅ Best native experience for majority of users
- ✅ Works everywhere (no hard requirement on modern API)
- ⚠️ Auto-save not possible in Firefox/Safari
- ⚠️ "Recent files" feature requires IndexedDB handle storage

---

#### ADR-017: TipTap Table Extension Selection  
**Status:** Accepted  
**Date:** 2026-01-30

**Context:** Need table editing for Phase 2. Multiple options available.

**Options Considered:**
1. `@tiptap/extension-table` (official, 4 packages)
2. Custom ProseMirror table implementation
3. HTML table with contenteditable

**Decision:** Use official `@tiptap/extension-table` suite:
- `@tiptap/extension-table`
- `@tiptap/extension-table-row`
- `@tiptap/extension-table-header`
- `@tiptap/extension-table-cell`

**Rationale:**
- Official TipTap extension with active maintenance
- Built-in Tab navigation between cells
- Works with existing `tiptap-markdown` serialization
- Comprehensive commands (add/delete rows/cols, merge, etc.)
- Well-documented API

**Consequences:**
- ✅ Well-tested, standard implementation
- ✅ Full GFM table round-trip (via tiptap-markdown)
- ⚠️ Column alignment syntax not preserved (known limitation)
- ⚠️ 4 additional packages to maintain

---

#### ADR-018: tiptap-markdown Deprecation Awareness
**Status:** Acknowledged  
**Date:** 2026-01-30

**Context:** During research, discovered `tiptap-markdown` (our current package) is deprecated. TipTap released official `@tiptap/markdown` in v3.7.0.

**Decision:** Stay with `tiptap-markdown@0.8.x` for v1.0, plan migration for later.

**Rationale:**
- Current package works well for our needs
- TipTap v3 has breaking changes requiring significant migration
- Official package is new, may have undiscovered issues
- Table serialization in current package is working

**Migration Path (for future):**
1. Wait for TipTap v3 to stabilize
2. Test official `@tiptap/markdown` in a branch
3. Migrate as part of v1.2 or major refactor

**Consequences:**
- ✅ Stable, known working implementation for v1.0
- ✅ Avoid premature major dependency changes
- ⚠️ Technical debt: will need migration eventually
- ⚠️ May miss improvements in official package

---

## 2026-01-30 - Phase 2 Implementation & Review

### Context
Phase 2 focused on table editing and file operations. Builder implemented features, then Reviewer conducted extensive interactive testing that uncovered 8 bugs requiring fixes.

### What Was Built

**Table Editing:**
- GFM table support via @tiptap/extension-table suite
- Contextual TableToolbar with add/delete row/column buttons
- CSS styling with visible borders, header accents, selection highlighting
- ProseMirror integration with `fixTables()` for consistency

**File Operations:**
- `useFileSystem` hook with File System Access API + fallbacks
- `useAutoSave` hook with 2-second debounce
- `FileIndicator` component showing dirty state and file path
- Keyboard shortcuts: Ctrl+O (open), Ctrl+S (save)

**Developer Experience:**
- `ErrorBoundary` component for graceful crash handling
- `dev.bat` and `dev.ps1` launch scripts

---

#### ADR-019: GFM Table Compliance Guards
**Status:** Accepted  
**Date:** 2026-01-30

**Context:** During Phase 2 review, discovered that TipTap table commands allow operations that produce invalid GFM tables (which require exactly one header row as the first row).

**Invalid Operations Identified:**
1. Deleting the header row (GFM requires header)
2. Adding rows above the header row (header must be first)
3. Creating nested tables (not supported in GFM)
4. Deleting the last column (leaves empty table)

**Decision:** Implement client-side guards in TableToolbar to prevent invalid operations:

```typescript
// Helper to detect header cell position
function isInHeaderCell(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'tableHeader') return true;
    if (node.type.name === 'table') break;
  }
  return false;
}

// Helper to count columns
function getTableColumnCount(editor: Editor): number { ... }

// Guards applied:
const canDeleteRow = !isInHeaderCell(editor);
const canDeleteColumn = getTableColumnCount(editor) > 1;
const canAddRowBefore = !isInHeaderCell(editor);
const canInsertTable = !editor.isActive('table'); // No nesting
```

**Rationale:**
- Prevent users from creating files that won't render correctly elsewhere
- Better UX than allowing action then showing error
- Guards use ProseMirror tree walking for reliable detection
- Disabled buttons provide visual feedback

**Consequences:**
- ✅ All table operations produce valid GFM
- ✅ Clear visual feedback (disabled buttons)
- ✅ No confusing error messages
- ⚠️ Slightly restrictive (can't experiment with invalid structures)

---

#### ADR-020: Table Feature Limitations (GFM Constraints)
**Status:** Accepted  
**Date:** 2026-01-30

**Context:** During Phase 2.5 research, investigated three table enhancements. Each revealed GFM limitations.

**Features Investigated:**

1. **Column Alignment Persistence** (`textAlign` → `:---`, `:---:`, `---:`)
   - `tiptap-markdown` hardcodes delimiter as `---` with no alignment logic
   - Custom serializer would require forking/extending the deprecated package
   
2. **Column Width Resize**
   - TipTap supports `resizable: true` with `colwidth` attribute
   - GFM has no width syntax, widths are visual-only
   
3. **Merge Cells** (colspan/rowspan)
   - TipTap fully supports merge operations
   - `tiptap-markdown` detects merged cells and falls back to HTML output

**Decision:** Accept visual-only behavior for v1.0:

| Feature | v1.0 Action | Future (v1.2+) |
|---------|-------------|----------------|
| Alignment | Visual-only, document limitation | Revisit after `@tiptap/markdown` migration |
| Resize | Enable `resizable: true`, widths not saved | Consider frontmatter storage if users demand |
| Merge cells | Enable with `html: true` in config | Already works with HTML fallback |

**Rationale:**
- GFM is deliberately simple; fighting it adds complexity
- Visual features still improve editing UX even if not persisted
- HTML fallback for merge cells is acceptable for power users
- Migration to `@tiptap/markdown` (TipTap 3.7+) may solve alignment

**Consequences:**
- ✅ Keeps v1.0 scope manageable
- ✅ Clear documentation prevents user confusion
- ✅ Merge cells available for power users who accept HTML output
- ⚠️ Alignment-heavy documents lose formatting on save (documented)
- ⚠️ Column widths reset on reload (visual-only)

**Research Reference:** See `docs/research/PHASE2.5_TABLE_ENHANCEMENTS.md`

---

### Bugs Found & Fixed During Review

| # | Severity | Issue | Root Cause | Fix |
|---|----------|-------|------------|-----|
| 1 | 🔴 Critical | Delete row/column deletes entire table | Missing `can()` guards | Added `editor.can().deleteRow()` checks + `fixTables()` |
| 2 | 🔴 Critical | Tables not rendering (no visible borders) | Wrong CSS selectors | Changed `.ProseMirror .editor-table` to `.ProseMirror table` |
| 3 | 🟡 Medium | Header row deletable (invalid GFM) | No header detection | Added `isInHeaderCell()` helper |
| 4 | 🟡 Medium | Nested tables creatable (invalid GFM) | No active-table check | Added `editor.isActive('table')` guard |
| 5 | 🟡 Medium | Toolbar buttons disappear after ops | Missing re-render trigger | Added `selectionUpdate` + `transaction` event subscriptions |
| 6 | 🟡 Medium | Add Row Above works in header | No position check | Added `canAddRowBefore` state |
| 7 | 🟢 Minor | Header/selection styling unclear | Insufficient CSS contrast | Added accent border + blue selection tint |
| 8 | 🟢 Minor | Delete column enabled with 1 column | No column count check | Added `getTableColumnCount()` helper |

### Key Technical Insights

**ProseMirror Tree Walking:**
To reliably detect cell type, walk up from `$from.depth` checking `node.type.name`. Don't rely on CSS classes or DOM inspection.

**TipTap Event Subscription:**
Toolbar state must update on both `selectionUpdate` (cursor moved) and `transaction` (content changed). Using `useEffect` with cleanup:

```typescript
useEffect(() => {
  const update = () => setUpdateKey(k => k + 1);
  editor.on('selectionUpdate', update);
  editor.on('transaction', update);
  return () => {
    editor.off('selectionUpdate', update);
    editor.off('transaction', update);
  };
}, [editor]);
```

**Table Repair After Mutations:**
Always call `fixTables()` after delete operations to ensure ProseMirror table model stays consistent.

---

## 2026-02-08 - Phase 4 Complete

### Completion Summary

**Status:** ✅ Approved by Reviewer (after 5+ rounds of bug fixes)  
**Build:** Passing (0 errors, 0 warnings)  

### What Was Built

1. **Image Handling**
   - `ImageInsertModal` — 3-tab dialog (URL / Local File / Embed as Base64)
   - Drag-drop and clipboard paste both route through ImageInsertModal
   - `CustomImage` TipTap extension with `localPath` attribute
   - `imageHelpers.ts` — base64 conversion, filename sanitization, file size formatting
   - `useImageAssets` hook — FS API wrapper (partially unused after redesign)
   - BubbleMenu image button + Ctrl+Shift+I shortcut
   - Ctrl+Space to force BubbleMenu at cursor position

2. **Table of Contents**
   - `useTOC` hook — extracts headings from ProseMirror document tree
   - `TOCPanel` sidebar component with hierarchical indent + active highlight
   - Click-to-scroll using `requestAnimationFrame` + `scrollIntoView`
   - Active heading tracking via scroll listener + manual set on click

3. **Keyboard Shortcuts Help**
   - `ShortcutsModal` — grouped by category, searchable
   - `shortcuts.ts` — centralized shortcut definitions
   - Ctrl+H trigger (changed from Ctrl+? due to browser conflict)
   - Header keyboard button

### Key Decisions Made

---

#### ADR-021: Local File Tab Redesign (Drop FS API Dependency)
**Status:** Accepted  
**Date:** 2026-02-08

**Context:** The original spec called for an assets-folder approach using the File System Access API to save images to `assets/` next to the `.md` file. Testing on Brave browser revealed that the FS API is blocked entirely, even with Shields down.

**Decision:** Replace FS API-dependent Local File tab with a simple editable path field. User types a relative path (e.g., `photo.png` or `assets/photo.png`), and the app:
1. Reads the file data into a base64 data URL for editor display
2. Stores the relative path in the `localPath` attribute
3. On markdown serialization, outputs the `localPath` instead of the data URL

**Alternatives Considered:**
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| FS API + assets folder | Full management, auto-save images | Blocked on Brave, Firefox, Safari | Rejected |
| Path field (chosen) | Works everywhere, simple, no API dependency | User must manage files separately | Accepted |
| Base64 only | Zero setup | Bloats markdown files | Available as separate tab |

**Consequences:**
- ✅ Works on all browsers identically
- ✅ Simpler code, fewer moving parts
- ✅ `useImageAssets.saveImage` kept for potential future use
- ⚠️ User must place image files in the correct location manually
- ⚠️ Round-trip is lossy: re-opening doesn't restore data URL display

---

#### ADR-022: CustomImage Extension for Dual-Path Display
**Status:** Accepted  
**Date:** 2026-02-08

**Context:** When a user inserts a local image with a relative path like `photo.png`, the browser resolves it to `http://localhost:5173/photo.png` which fails. The image needs to display in the editor (data URL) while serializing differently to markdown (relative path).

**Decision:** Extend TipTap's `Image` with a `localPath` attribute. The custom markdown serializer checks for `localPath` first, falling back to `src`. Stored as `data-local-path` HTML attribute.

**Data Flow:**
```
User picks file → Read as data URL → Store in src (display)
                → Type path → Store in localPath (markdown output)
Serialize → if localPath: ![alt](localPath) else: ![alt](src)
```

**Consequences:**
- ✅ Images display correctly in editor via data URL
- ✅ Markdown contains clean relative paths
- ⚠️ Intentionally lossy round-trip for local images (data URL lost on re-open)
- ⚠️ VS Code extension will solve this naturally (full filesystem access)

---

#### ADR-023: VS Code Extension — Option A (After v1.0)
**Status:** Accepted  
**Date:** 2026-02-08

**Context:** RendMD's rendered-first editing is an ideal fit for a VS Code custom editor. User stated this is the "ultimate use case, more so than the web version." Research confirmed `CustomTextEditorProvider` API is purpose-built for this, with ~70-80% code reuse from the web app.

**Options Evaluated:**
| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| A (chosen) | Build VS Code extension after web v1.0 | Battle-tested core, clean extraction | Delays "ultimate use case" |
| B | Parallel development now | Earlier VS Code delivery | Premature abstraction, split focus |
| C | Pivot to VS Code-first after Phase 4 | Fastest to personal use case | Web app stalls |

**Decision:** Option A — finish web v1.0, then extract shared core into monorepo and build VS Code extension wrapper as v1.2.

**Architecture (researched):**
- `CustomTextEditorProvider` registers for `*.md` / `*.markdown`
- Priority: `"option"` (users choose "Open With", not forced default)
- Webview loads bundled React/TipTap app
- Sync: TextDocument ↔ Webview via `postMessage` / `WorkspaceEdit`
- Theming: map `--vscode-*` CSS variables → RendMD `--color-*` variables

**Monorepo Structure (planned):**
```
packages/core/    — Shared TipTap extensions, components, hooks
packages/web/     — Web app (current Vite build)
packages/vscode/  — VS Code extension wrapper
```

**Consequences:**
- ✅ Web app becomes battle-tested before extraction
- ✅ Clean separation of concerns
- ✅ Nearly zero competition in VS Code marketplace
- ⚠️ Delays VS Code extension to ~v1.2 timeframe
- ⚠️ Monorepo migration is non-trivial refactor

**Research Reference:** See `docs/research/VSCODE_EXTENSION.md`

---

### Bugs Found & Fixed During Phase 4 Review

| # | Severity | Issue | Root Cause | Fix |
|---|----------|-------|------------|-----|
| 1 | 🔴 Critical | TOC freeze on click | `setTextSelection` with stale ProseMirror positions | Removed `setTextSelection`, use DOM `scrollIntoView` |
| 2 | 🔴 Critical | Local File tab always shows "Save first" | FS API check returns false on Brave | Complete redesign: editable path field, no FS API |
| 3 | 🟡 Medium | Ctrl+? not working | Browser intercepts Ctrl+Shift+/ | Changed to Ctrl+H |
| 4 | 🟡 Medium | TOC active highlight not updating on click | No manual `setActiveTocId` after scroll | Added explicit `setActiveTocId` call |
| 5 | 🟡 Medium | Relative image path not displaying | Browser resolves to `localhost:5173/` | CustomImage ext: data URL for display, localPath for markdown |
| 6 | 🟢 Minor | No H3 button in BubbleMenu | Not in original implementation | Added `Heading3` button |
| 7 | 🟢 Minor | No Image button in BubbleMenu | Not in original implementation | Added `Image` button with callback |

---

## 2026-02-08 - Phase 5 Complete

### Completion Summary

**Status:** ✅ Approved by Reviewer (after 1 round of fixes)  
**Build:** 0 errors, 0 warnings  
**Bundle:** Main chunk 370 KB (113 KB gzip) — down from 1,121 KB

### What Was Built

1. **Export Features**
   - `ExportDropdown` with HTML export, PDF (print), copy as rich text
   - `exportHelpers.ts` — `captureThemeVariables()` resolves CSS variables to concrete values for standalone HTML
   - `print.css` — comprehensive print stylesheet hiding UI, black on white, page break control
   - Clipboard API integration with HTML + plain text MIME types

2. **Bundle Optimization**
   - `manualChunks` function in Vite splitting TipTap/ProseMirror into 749 KB vendor chunk
   - `React.lazy` for SourceEditor, ImageInsertModal, ShortcutsModal, SettingsModal
   - All lazy components wrapped in conditional guards to prevent premature chunk loading
   - **Result: 370 KB main chunk (was 1,121 KB) — 67% reduction**

3. **Toast Notifications**
   - Separate `toastStore.ts` Zustand store with auto-dismiss (4 seconds)
   - Entry + exit animations (opacity slide, `requestAnimationFrame` based)
   - 3 types: success, error, info; `role="alert"` for accessibility

4. **UX Polish**
   - `EmptyState.tsx` — welcome screen on fresh load (Open File + Shortcuts buttons)
   - `Tooltip.tsx` — applied to all icon buttons in Header (6) and BubbleMenu (13) with shortcut hints
   - Suspense loading fallbacks for lazy components

5. **Settings Modal**
   - Theme selector, font size control, auto-save toggle
   - Font size via CSS variable `--editor-font-size`, persisted
   - `useAutoSave` respects `autoSaveEnabled` flag
   - Global Escape key handler via `document.addEventListener`

### Key Decisions Made

---

#### ADR-024: Separate Toast Store
**Status:** Accepted  
**Date:** 2026-02-08

**Context:** Toast notifications need global access from exports, file ops, and future features. Options: extend `editorStore` or create a dedicated store.

**Decision:** Separate `toastStore.ts` with its own Zustand instance.

**Rationale:**
- Single responsibility — toasts are transient UI, not editor state
- No need for persistence (toasts are ephemeral)
- Module-level `nextId` counter keeps it simple
- Any module can `import { addToast } from '@/stores/toastStore'` without coupling to editor state

**Consequences:**
- ✅ Clean separation of concerns
- ✅ Minimal API surface (`addToast`, `removeToast`, `toasts`)
- ⚠️ Two stores to know about (acceptable given simplicity)

---

#### ADR-025: Browser Print for PDF Export
**Status:** Accepted  
**Date:** 2026-02-08

**Context:** Users need PDF export. Options: (1) `window.print()` with CSS, (2) jsPDF library, (3) html2canvas + jsPDF, (4) Puppeteer/headless browser.

**Decision:** Use `window.print()` with a dedicated `print.css` stylesheet.

**Rationale:**
- Zero additional bundle cost (CSS only)
- Browser handles pagination, headers/footers, margins
- Users choose printer AND "Save as PDF" from the same dialog
- Print stylesheets are well-understood technology
- jsPDF would add ~200KB+ for marginal benefit

**print.css approach:**
- Hide all UI (header, sidebar, toolbar, debug panel, toast)
- Show only editor content
- Force black text on white background (ignore theme)
- `break-inside: avoid` on code blocks, tables, blockquotes
- Scoped selectors to avoid affecting third-party content

**Consequences:**
- ✅ Zero bundle cost
- ✅ Consistent with user expectations (print dialog = PDF)
- ⚠️ Limited control over PDF appearance (browser-dependent)
- ⚠️ Not suitable for programmatic PDF generation

---

#### ADR-026: CSS Variable Font Size with Persistence
**Status:** Accepted  
**Date:** 2026-02-08

**Context:** Users want to control editor font size. Need a mechanism that affects both the rendered editor (ProseMirror) and the source editor (textarea overlay) simultaneously.

**Decision:** Use a CSS custom property `--editor-font-size` set via inline style on the root `App` div, consumed by both ProseMirror and SourceEditor CSS. Value persisted via Zustand persist middleware.

**Data Flow:**
```
Settings Modal → editorStore.setFontSize(n) → Zustand persist → localStorage
App.tsx reads fontSize → sets style={{ '--editor-font-size': `${fontSize}px` }}
ProseMirror CSS: font-size: var(--editor-font-size, 16px)
SourceEditor CSS: font-size: var(--editor-font-size, 14px)
```

**Note:** ProseMirror defaults to 16px, SourceEditor to 14px for their respective fallbacks. This is intentional — monospace reads better slightly smaller.

**Consequences:**
- ✅ Single control point for both editors
- ✅ CSS cascading handles specificity naturally
- ✅ Persists across sessions
- ⚠️ Different defaults between views (documented as intentional)

---

#### ADR-027: Deferred Features — Search, File Browser, Recent Files
**Status:** Accepted  
**Date:** 2026-02-08

**Context:** The Phase 5 spec included in-document search, recent files, and folder navigation. These were evaluated and deferred.

**Deferred Items:**

| Feature | Reason | Target |
|---------|--------|--------|
| In-document search | Browser Ctrl+F works; VS Code extension gets it free; TipTap search plugin would be ~300 LOC | v1.1 or VS Code ext |
| Recent files | Requires IndexedDB for FileSystemFileHandle storage; moderate complexity | v1.1 |
| File browser sidebar | `SidebarState` already supports `'files'` panel type; needs FS API directory handles | v1.1 |
| Default view mode setting | Low impact — users can toggle manually | v1.1 |
| Sidebar default setting | Low impact | v1.1 |

**Consequences:**
- ✅ Phase 5 ships focused and polished
- ✅ Deferred items have clear homes in future versions
- ⚠️ No in-document search for v1.0 (browser Ctrl+F is the mitigation)

---

### Bugs Found & Fixed During Phase 5 Review

| # | Severity | Issue | Root Cause | Fix |
|---|----------|-------|------------|-----|
| 1 | 🟡 Medium | ShortcutsModal lazy chunk loaded on startup | Not wrapped in conditional guard | Wrapped in `{shortcutsModalOpen && <Suspense>...}` |
| 2 | 🟡 Medium | EmptyState created but never shown | Not wired into App.tsx | Shows when `!content && !storedFilePath` |
| 3 | 🟡 Medium | SettingsModal Escape only works with inner div focus | Used `onKeyDown` on div | Switched to `useEffect` + `document.addEventListener('keydown')` |
| 4 | 🟡 Medium | Tooltip component unused | Created but not applied | Applied to all Header (6) and BubbleMenu (13) buttons |
| 5 | 🟢 Minor | Toast entry animation missing | No enter transition | Added `isEntered` state with `requestAnimationFrame` |
| 6 | 🟢 Minor | PDF export no user feedback | `window.print()` is silent | Added `addToast('Opening print dialog…', 'info')` |
| 7 | 🟢 Minor | Print CSS `button` selector too broad | Targeted all buttons | Scoped to `body > div > header button` and `aside button` |

---

## 2026-02-08 — Phase 6: Testing, Documentation & v1.0 Release

### Summary

Phase 6 delivered the quality, confidence, and documentation needed for v1.0.0. Vitest was configured with 77 unit tests across 5 test files covering pure utility functions and store logic. An accessibility audit with `eslint-plugin-jsx-a11y` achieved 0 lint errors. Full documentation was created: README rewrite, MIT LICENSE, and CONTRIBUTING.md. `package.json` bumped to 1.0.0. All dev artifacts are behind `import.meta.env.DEV` guards.

Reviewer identified 2 medium issues: (1) round-trip integration tests not created, (2) PROJECT_PLAN.md not updated. Fix #2 resolved immediately. Fix #1 requires Builder to create `src/test/roundtrip.test.ts` with headless TipTap editor in jsdom — see implementation spec below.

#### ADR-028: Test Strategy — Vitest + Headless TipTap

**Date:** 2026-02-08  
**Status:** Accepted

**Context:** Need automated tests for v1.0 confidence. Two categories: (1) pure utility functions with no DOM dependency, (2) markdown round-trip fidelity requiring a TipTap editor instance.

**Decision:** Use Vitest with jsdom environment. Unit tests for pure functions (frontmatterParser, imageHelpers, cn, editorStore, exportHelpers). Integration tests for round-trip use headless `new Editor()` from `@tiptap/core` with a test-specific extension set that replaces `CodeBlockShiki` (which uses `ReactNodeViewRenderer` — incompatible with jsdom) with plain `CodeBlock`.

**Rationale:**
- Vitest integrates natively with Vite — zero extra config for path aliases, plugins, etc.
- jsdom is sufficient for store tests and headless editor (no visual rendering needed)
- Swapping CodeBlockShiki for CodeBlock in tests preserves markdown serialization behavior while avoiding ReactNodeViewRenderer DOM requirements
- 77 unit tests cover the highest-risk pure logic; round-trip tests validate the editor's core promise

**Consequences:**
- ✅ Fast, reliable test suite (~2s total run time)
- ✅ No browser test infrastructure needed for v1.0
- ⚠️ CodeBlockShiki rendering is not tested (visual-only, covered by manual testing)
- ⚠️ No component rendering tests — deferred to v1.1 with more complex test setup

#### ADR-029: MIT License

**Date:** 2026-02-08  
**Status:** Accepted

**Context:** v1.0 release needs a license. Options: MIT, Apache 2.0, GPL, ISC.

**Decision:** MIT License.

**Rationale:**
- Aligns with entire dependency ecosystem (TipTap: MIT, React: MIT, Vite: MIT, Zustand: MIT)
- Maximum permissiveness encourages adoption and contribution
- Simple, well-understood, no patent clauses to worry about
- Matches project philosophy: "open source package" for everyone

**Consequences:**
- ✅ No friction for contributors, forks, or commercial use
- ⚠️ No copyleft protection — forks can close source (acceptable trade-off for adoption)

---

### Issues Found During Phase 6 Review

| # | Severity | Issue | Root Cause | Fix |
|---|----------|-------|------------|-----|
| 1 | 🟡 Medium | Round-trip integration tests not created | Builder didn't implement spec 6B | Create `src/test/roundtrip.test.ts` with headless TipTap |
| 2 | 🟡 Medium | PROJECT_PLAN.md not updated to v1.0.0 | Missed spec 6E.4 | ✅ Fixed — version, status, phases, milestones all updated |
| 3 | 🟢 Minor | LICENSE year says "2025" | Spec said "2026" | Cosmetic — actual copyright year is debatable |

---

## Session Log

| Date | Session | Key Activities | Outcomes |
|------|---------|----------------|----------|
| 2026-01-29 | Kickoff | Project conception, brainstorming, initial documentation | Design doc, project plan, chronicle created |
| 2026-01-29 | Strategy | Competitive analysis, feature philosophy, AI planning | ADRs 007-009, market positioning defined |
| 2026-01-29 | Phase 0 | Project scaffolding, TipTap setup, basic layout | Foundation complete, Reviewer approved |
| 2026-01-29 | Retrospective | Review Phase 0, plan testing strategy, scope Phase 1 | ADRs 010-012, Phase 0.5 and 1.5 added |
| 2026-01-29 | Phase 0.5 | Round-trip validation, debug infrastructure | Fidelity confirmed, debug panel built |
| 2026-01-30 | Phase 1 | Core editing features, BubbleMenu, popovers, shortcuts | ADR-013, Reviewer approved |
| 2026-01-30 | Phase 1.5 | Theme system, Shiki syntax highlighting | ADRs 014-015, all four themes working |
| 2026-01-30 | Phase 2 Research | File System API, table extensions, serialization | ADRs 016-018, technical brief complete |
| 2026-01-30 | Phase 2 | Tables, file ops, GFM guards, bug fixes | ADR-019, 8 bugs found/fixed, Reviewer approved |
| 2026-01-30 | Phase 2.5 Research | Table enhancement feasibility (alignment, resize, merge) | ADR-020, limitations documented, research complete |
| 2026-01-30 | Phase 2.5 | Table toolbar with alignment, grid picker, keyboard nav | Column alignment working, grid picker for table creation |
| 2026-01-30 | Phase 3 | Source view, frontmatter panel, view mode persistence | Three-way view mode, Shiki-highlighted source, YAML frontmatter UI |
| 2026-02-08 | Phase 4 Review | Image handling, TOC, shortcuts help, 5+ bug fix rounds | ADRs 021-023, Local File tab redesigned, CustomImage extension |
| 2026-02-08 | VS Code Research | Evaluated CustomTextEditorProvider, webview API, competition | Research doc created, decided Option A (after v1.0) |
| 2026-02-08 | Phase 5 Review | Export, bundle optimization, UX polish, settings | 7 fixes, main chunk 370 KB (was 1,121 KB), all 10 criteria met |
| 2026-02-08 | Phase 6 | Tests (77 unit), a11y audit, docs (README/LICENSE/CONTRIBUTING), v1.0.0 | ADRs 028-029, 2 medium issues found, Fix #2 done, Fix #1 pending |

---

## Lessons Learned

### 2026-01-29 - Phase 0 Foundation

**What happened:**
Phase 0 completed successfully but revealed that `tiptap-markdown` lacks TypeScript definitions, requiring `@ts-expect-error` workarounds.

**What we learned:**
- Always check npm package typing status before committing to dependencies
- Community TipTap extensions may have gaps in type coverage
- Build passing doesn't mean IDE experience is perfect

**What we'll do differently:**
- Research typing status during tech evaluation
- Consider creating local type declarations for untyped packages
- Document workarounds immediately in code comments

---

### 2026-01-29 - Scope Management

**What happened:**
Reviewer feedback led to creating Phase 0.5 and 1.5 to manage scope.

**What we learned:**
- Validating core assumptions (markdown round-trip) should happen before building features
- Polish items can delay core features if not managed
- Brief follow-up sprints keep main sprints focused

**What we'll do differently:**
- Always validate core dependencies early
- Separate "must have" from "polish" explicitly
- Use .5 phases for validation and polish

---

### 2026-01-30 - Phase 2 Table Implementation

**What happened:**
Initial table implementation looked complete but interactive review uncovered 8 bugs. TipTap table extensions work well for basic operations but don't enforce GFM constraints, allowing users to create invalid markdown structures.

**What we learned:**
- TipTap table commands allow operations that produce invalid GFM (delete header, nest tables, add rows above header)
- CSS selectors for ProseMirror-rendered tables need to target `table` directly, not wrapper classes
- Toolbar state must subscribe to both `selectionUpdate` and `transaction` events to stay in sync
- ProseMirror tree walking (`$from.node(depth)`) is more reliable than DOM inspection for detecting cell types
- `fixTables()` should be called after any table mutation to maintain model consistency

**What we'll do differently:**
- Test GFM compliance explicitly during table feature development
- Build guard functions early when working with constrained formats
- Use interactive review sessions for complex UI components
- Create helper functions for tree walking patterns - they're reusable

---

### 2026-01-30 - Phase 3 Source View & Frontmatter

**What happened:**
Implemented three-way view mode (render/split/source) with Shiki syntax highlighting and YAML frontmatter panel. Initial implementation had several bugs discovered during manual testing:
1. Source editor text moved when typing (CSS mismatch between textarea and Shiki output)
2. Source view didn't show content on initial load (store not populated until user edits)
3. Tags field couldn't accept commas (parsing happened on every keystroke)
4. Custom fields didn't persist (empty string was treated as "remove field")
5. View mode didn't persist after refresh (Zustand persist merge function issues)

**What we learned:**
- Overlay-based syntax highlighting requires *exact* CSS matching between textarea and highlighted output - font-family, font-size, line-height, whitespace all must match
- Shiki generates its own inline styles that need to be overridden with `!important`
- TipTap's `onUpdate` only fires on user edits, not on initial content - use `onCreate` to sync initial state
- Input fields that parse on change create poor UX - parse on blur instead for multi-character delimiters
- Zustand persist `merge` function needs explicit null-checking for reliable hydration
- Helper functions that remove "empty" values can break create-then-edit workflows

**What we'll do differently:**
- Test overlay editors with actual typing, not just visual inspection
- Initialize state stores on component mount, not just on user interaction
- Distinguish between "empty value" and "remove field" in data helpers
- Test persistence by actually refreshing the page during development

---

## 2026-02-08 — v1.0.1 User Testing & Research

### Context
v1.0.0 shipped with 97 tests passing, 0 lint/build errors. Manual user testing revealed 3 bugs and a UX discoverability gap. Additionally researched video/media support for future versions.

### Bugs Found

| Bug | Severity | Root Cause |
|-----|----------|------------|
| Editor can't scroll | **Critical** | CSS height chain broken — `w-full` div in Editor.tsx not a flex column, child `h-full overflow-y-auto` never activates (no constrained height) |
| PDF/print shows UI chrome | Medium | `print.css` missing selectors for `.frontmatter-panel`, `.table-toolbar`, debug panel |
| Rich text paste looks awful | Medium | `editor.getHTML()` has no inline styles; `editor.getText()` strips all formatting for plain text fallback |

### UX Issue: Toolbar Discoverability
"Insert Table" was the only visible toolbar button. BubbleMenu with 13 formatting buttons (Bold, Italic, Headings, Lists, Link, Image, etc.) is invisible until text selection or Ctrl+Space — users who don't know these shortcuts see an editor with no formatting tools.

**Decision:** Create a persistent `EditorToolbar` with the same buttons as BubbleMenu, always visible. Keep BubbleMenu for contextual use on selection. Add "Ctrl+Space for inline menu" hint.

### ADR-030: Video/Media Support (Deferred)
**Status:** Proposed (deferred to v1.1+)  
**Date:** 2026-02-08

**Context:** User asked about GIF/mp4/webm/YouTube support.

**Research Findings:**
- **GIFs already work** — they're images, rendered via `<img>` tag
- `@tiptap/extension-youtube` — official extension, paste-to-embed, iframe-based
- Custom Video node feasible following CustomImage pattern (render `<video controls>`)
- TipTap v3.10.0+ has `ResizableNodeView` for resize handles on media nodes

**Markdown serialization challenge:** Standard markdown has no video syntax.
- **Option A (recommended):** Image syntax with extension detection — `![video](clip.mp4)`. Editor detects `.mp4`/`.webm` extensions and renders `<video>` instead of `<img>`. Other renderers show broken image or link. Most portable.
- **Option B:** HTML tags `<video src="clip.mp4">` — blocked by our `html: false` markdown config
- **Option C:** Custom directives `:::video{src="clip.mp4"}:::` — TipTap v3 approach, non-standard markdown

**Decision:** Defer to v1.1+. Option A (image syntax for local files) + `@tiptap/extension-youtube` for embeds. Estimated effort: M-L.

### Artifacts Created
- `docs/specs/v1.0.1-user-testing-bugs.md` — Detailed bug analysis with root causes and fix code
- `.github/agents/HANDOFF_BUILDER_v1.0.1.md` — Complete builder handoff spec
- `tests/fixtures/stress-test.md` — Adversarial 16-section stress test file

### Lessons Learned
- **Flex layout debugging:** When `overflow-y-auto` doesn't scroll, trace the height chain upward — every ancestor needs a constrained height (`h-screen`, `flex-1`, or explicit height). A single `w-full` without `overflow-hidden` breaks the chain.
- **Rich text clipboard:** `editor.getHTML()` outputs semantic HTML with no styles — paste targets (Word, Gmail, Docs) need inline CSS. Always provide both `text/html` and `text/plain` MIME types via `ClipboardItem`.
- **Print CSS auditing:** After adding any new UI component, check `@media print` rules. Easy to forget.
- **Toolbar discoverability:** If a feature requires keyboard shortcuts or hidden gestures, add a static entry point. "Hidden power tools" are invisible to new users.

### 2026-02-08 - Phase 4 Image & Navigation Implementation

**What happened:**
Phase 4 required 5+ rounds of reviewer bug fixes before approval. Two critical bugs stood out: (1) TOC click froze the editor due to stale ProseMirror positions, and (2) Local File tab was completely broken on Brave because the File System Access API is blocked. The Local File tab was redesigned mid-review to remove the FS API dependency entirely.

**What we learned:**
- **Never use `setTextSelection` with positions from a cached list** — ProseMirror positions become stale after any document change. Use DOM-based scrolling (`scrollIntoView`) instead.
- **Don't assume Chrome-like browser APIs are available** — Brave is Chromium-based but blocks FS API. Always feature-detect AND have a non-API fallback that's equally functional.
- **Dual-attribute TipTap extensions are powerful** — CustomImage stores data URL in `src` for display and relative path in `localPath` for serialization. This pattern applies to any case where editor display differs from output format.
- **Browser keyboard shortcuts are a minefield** — Ctrl+? (Ctrl+Shift+/) is intercepted by browsers. Always test shortcut combinations in multiple browsers before committing.
- **Simpler solutions often emerge during review** — The editable path field is simpler, more portable, and more maintainable than the original FS API-based assets folder approach.

**What we'll do differently:**
- Test on Brave (and other privacy-focused browsers) during development, not just review
- Prefer DOM APIs over ProseMirror position-based operations for navigation
- Test keyboard shortcuts in Chrome, Firefox, Edge, AND Brave
- Consider "what if the browser API doesn't exist?" for every new browser API dependency

---

### 2026-02-08 - Phase 5 Bundle Optimization & Polish

**What happened:**
Phase 5 focused on bundle optimization, exports, and UX polish. The main chunk dropped from 1,121 KB to 370 KB (67% reduction) through vendor splitting and `React.lazy`. However, the reviewer found that 4 of the 7 new features were created but not properly wired up: ShortcutsModal was lazy-loaded but its chunk was fetched on startup (missing conditional guard), EmptyState was created but never rendered, Tooltip component existed but was applied to zero buttons, and SettingsModal's Escape key only worked when a specific div had focus.

**What we learned:**
- **`React.lazy` needs conditional guards, not just `<Suspense>`** — wrapping a lazy component in `<Suspense>` alone still triggers the chunk load when React encounters the component in the tree. Must also wrap in `{condition && <Suspense><LazyComponent/></Suspense>}` to defer chunk loading until actually needed.
- **"Create component" ≠ "integrate component"** — a component file can exist, pass lint, pass build, and still not appear anywhere in the rendered app. Always verify integration, not just creation.
- **Global keyboard listeners beat `onKeyDown` for modals** — `onKeyDown` on a div requires the div to have focus, which is fragile. `useEffect` + `document.addEventListener('keydown')` catches Escape regardless of focus state.
- **Print CSS selectors need tight scoping** — a bare `button { display: none }` in `@media print` hides every button on any page. Scope to the app's DOM structure: `body > div > header button`.
- **Animations need two frames** — CSS transitions from `opacity: 0` to `opacity: 1` don't animate if the element starts at `opacity: 0` in the same render frame. Use `requestAnimationFrame` to set the "entered" state after mount, giving the browser a paint frame at the initial state first.
- **`manualChunks` as a function catches transitive deps** — the object-style config (`{ 'vendor-react': ['react'] }`) only matches direct imports. A function that checks `id.includes('node_modules/@tiptap')` captures ProseMirror internals like `orderedmap`, `rope-sequence`, `crelt` that the object style misses.

**What we'll do differently:**
- Always verify lazy-loaded components are NOT fetched on pageload (check Network tab)
- Add integration verification to review checklist: "Is the component actually rendered?"
- Use `document.addEventListener` pattern for all modal Escape handlers
- Test `@media print` in browser print preview during development
- For entry animations, always use the `requestAnimationFrame` mounted-state pattern

---

### 2026-02-08 - Phase 6 Testing & Release Preparation

**What happened:**
Phase 6 delivered 77 unit tests across 5 files, an a11y audit with eslint-plugin-jsx-a11y (0 errors), complete documentation (README rewrite, MIT LICENSE, CONTRIBUTING.md), and a clean v1.0.0 version bump. However, the round-trip integration tests (spec 6B) were not implemented by Builder despite being listed as Priority 4 / High Impact. The existing `roundtrip.ts` utility provides the core logic (`testRoundTrip` function), but creating a headless TipTap editor in jsdom requires swapping `CodeBlockShiki` for plain `CodeBlock` because `ReactNodeViewRenderer` doesn't work without a real DOM.

**What we learned:**
- **Separation of "unit" and "integration" is critical in specs** — Builder implemented all 5 unit test files (pure functions, no DOM) but skipped the integration test that requires creating editor instances. The effort boundary wasn't explicit enough.
- **ReactNodeViewRenderer blocks headless testing** — Any TipTap extension that uses `ReactNodeViewRenderer` (like CodeBlockShiki) requires a full React DOM. Headless `new Editor()` with jsdom can handle plain ProseMirror extensions only. Solution: create a test-specific extension set.
- **Documentation updates are easily forgotten** — PROJECT_PLAN.md was listed in the spec but wasn't updated. Needs to be a checklist item, not buried in a sub-phase.
- **77 unit tests provide high confidence for pure logic** — frontmatterParser edge cases (CRLF, unicode, special chars), imageHelpers sanitization, and store action tests caught the kinds of bugs that would otherwise surface during manual testing.

**What we'll do differently:**
- Explicitly separate "no-DOM" tests from "needs-editor" tests in future specs
- Provide a ready-to-use `createTestEditor()` factory in specs that require headless TipTap
- Add "update PROJECT_PLAN.md" as a mandatory final checklist item
- For any TipTap extension using ReactNodeViewRenderer, document the test workaround upfront

---

### Template for Future Entries

```markdown
### [Date] - [Topic]

**What happened:**
[Description of the situation]

**What we learned:**
[Key insight or lesson]

**What we'll do differently:**
[Action items or process changes]
```

---

## Inspiration Sources

### Products We Admire

| Product | What We Take | What We Avoid |
|---------|--------------|---------------|
| **Typora** | Rendered-first UX, polish, attention to detail | Closed source, no AI, $15 price |
| **Notion** | AI integration patterns, clean UI, block interactions | Proprietary format, vendor lock-in |
| **Obsidian** | Local-first philosophy, plugin architecture | Complexity, not rendered-first |
| **Milkdown** | Open source ethos, plugin design | Less polish, no AI |
| **VS Code** | Keyboard-first, command palette, extension model | Complexity for non-developers |

### Design References
- Apple Human Interface Guidelines (typography, whitespace)
- Linear (interaction design, keyboard shortcuts)
- Vercel (dark theme, glassmorphism)
- Raycast (command palette, speed)

---

## Glossary

| Term | Definition |
|------|------------|
| Rendered-first | Editing paradigm where the visual output is the primary editing surface |
| Frontmatter | YAML metadata block at the start of a markdown file, delimited by `---` |
| Round-trip | Converting MD → editor model → MD without losing information or formatting |
| Glassmorphism | UI design trend using frosted glass effects (blur, transparency) |
| TipTap | React-friendly wrapper around ProseMirror editor framework |
| ProseMirror | Low-level, highly customizable rich-text editor toolkit |
| GFM | GitHub Flavored Markdown - extended markdown syntax with tables, task lists, etc. |
| WYSIWYG | "What You See Is What You Get" - editing where display matches output |
| ADR | Architecture Decision Record - documented technical decision with context and rationale |
| BYOK | Bring Your Own Key - user provides their own API key for services |
| TipTap | React-friendly wrapper around ProseMirror editor |
| Bubble Menu | Floating toolbar that appears on text selection |
| Round-trip | Parse → Edit → Serialize cycle that preserves content fidelity |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-01-29 | Initial document creation |
| 0.2.0 | 2026-01-29 | Phase 0 complete, ADRs 010-012, lessons learned |
| 0.3.0 | 2026-01-29 | Phase 0.5 complete, round-trip validation, debug infrastructure |
| 0.4.0 | 2026-01-30 | Phase 1 complete, ADR-013 (Floating UI), core editing features |
| 0.5.0 | 2026-01-30 | Phase 1.5 complete, ADRs 014-015 (Shiki, themes), 4-theme system |
| 0.6.0 | 2026-01-30 | Phase 2 research complete, ADRs 016-018, technical brief || 0.7.0 | 2026-01-30 | Phase 2 complete, ADR-019 (GFM guards), tables + file ops |
| 0.8.0 | 2026-01-30 | Phase 2.5 complete, table toolbar with alignment + grid picker |
| 0.9.0 | 2026-01-30 | Phase 3 complete, source view + frontmatter panel + view mode persistence |
| 1.0.0 | 2026-02-08 | Phase 4 complete, ADRs 021-023, image handling + TOC + shortcuts modal |
| — | 2026-02-08 | VS Code extension research complete, ADR-023 (Option A: after v1.0) |
| 1.1.0 | 2026-02-08 | Phase 5 complete, ADRs 024-027, exports + bundle optimization + UX polish |
| 1.2.0 | 2026-02-08 | Phase 6 complete, ADRs 028-029, 77 tests + a11y + docs + v1.0.0 release |
| 1.3.0 | 2026-02-08 | v1.0.1 user testing: 3 bugs found + toolbar UX gap + media research |
| 1.4.0 | 2026-02-08 | Draft persistence: ADR-030, Zustand getter hydration bug found & fixed |

---

## 2026-02-08 - Draft Persistence & The Zustand Getter Hydration Bug

### Context
Implementing draft persistence so that unsaved editor content, frontmatter, and file name survive page refresh (F5). Used Zustand's `persist` middleware with `partialize`/`merge` to selectively persist document state alongside existing view preferences in `rendmd-preferences` localStorage key.

### What Was Built
- Expanded `PersistedState` in `editorStore.ts` to include `content`, `frontmatter`, `fileName`, `isDirty` (was only `viewMode`, `theme`, `fontSize`, `autoSaveEnabled`)
- Added `visibilitychange` handler in `App.tsx` to flush draft to localStorage when tab goes hidden (protects against tab discard)
- Custom `merge` function with `??` fallbacks for safe partial hydration
- 4 new persistence tests (total now 101)

### The Bug: Zustand Getter + Hydration Merge Crash

**Severity:** Critical — silently broke ALL persistence (content AND preferences)  
**Time to diagnose:** ~4 hours across multiple sessions  
**Root cause:** A JavaScript getter on the Zustand store's initial state object

#### The Problem

The store had a legacy compatibility property using a getter:

```typescript
// BROKEN — this crashes during Zustand hydration
get showSource() {
  return get().viewMode === 'source';
}
```

During Zustand's persist middleware hydration, the `merge` function does:

```typescript
merge: (persistedState, currentState) => ({
  ...currentState,     // ← This spread TRIGGERS the getter
  ...persistedState,
})
```

When JavaScript spreads `currentState`, it evaluates ALL getters. The `showSource` getter calls `get()`, but during hydration merge, the store's `get()` function returns `undefined` because the store hasn't been fully initialized yet. This throws:

```
TypeError: Cannot read properties of undefined (reading 'viewMode')
```

Zustand catches this error internally and **silently falls back to an empty state**, making it appear as though localStorage was never read. No console error appears unless you add `onRehydrateStorage` error logging.

#### Why It Was Hard to Find

1. **No visible error** — Zustand catches the merge exception and logs nothing by default
2. **Worked before persistence expansion** — The old `partialize` only saved 4 preference fields, and the default `merge` (shallow spread) happened to avoid triggering the getter in certain code paths
3. **Red herrings** — We investigated:
   - Custom `createJSONStorage` wrappers (removed, didn't help)
   - Hydration timing / async gates (`useState`, `useSyncExternalStore`, `onFinishHydration` — all failed)
   - Editor `onCreate` overwriting restored content with `INITIAL_CONTENT`
4. **The getter looked innocent** — `get showSource()` is standard JavaScript, and it worked fine during normal runtime. The failure only occurs during the narrow window of hydration merge

#### The Fix

Replace the getter with a plain property:

```typescript
// FIXED — plain value, no getter
showSource: false,
```

This is safe because:
- `showSource` was unused by any component (dead legacy code)
- `toggleSource` already delegates to `cycleViewMode()`
- If a computed `showSource` is ever needed, use a Zustand selector: `useEditorStore(s => s.viewMode === 'source')`

#### Diagnostic Approach That Cracked It

The breakthrough was adding layered diagnostic logging:

1. **Pre-Zustand raw check** — `localStorage.getItem()` at module scope BEFORE Zustand initializes → Confirmed data WAS in localStorage
2. **`onRehydrateStorage` error callback** — Caught the `TypeError: Cannot read properties of undefined (reading 'viewMode')` that Zustand normally swallows
3. **`merge` function logging** — Confirmed merge was called with correct data but crashed during `{ ...currentState }` spread

The stack trace pointed directly at the `get showSource()` getter line, making the fix obvious once visible.

---

### ADR-030: No JavaScript Getters in Zustand Store Initial State
**Status:** Accepted  
**Date:** 2026-02-08

**Context:** A legacy `get showSource()` getter in the Zustand store's initial state object caused a silent crash during persist middleware hydration. The getter called `get()` (the Zustand store accessor), which returns `undefined` during the hydration merge phase. This silently broke all persistence.

**Decision:** Never use JavaScript getters (`get prop()`) in Zustand store initial state objects. Use plain properties or external selectors instead.

**Rationale:**
- Object spread (`{ ...obj }`) evaluates getters, and Zustand's persist middleware spreads `currentState` during merge
- During hydration, the store's `get()` function is not yet initialized
- The failure is silent — Zustand catches the error internally and falls back to empty state
- This cost ~4 hours of debugging across multiple sessions

**Alternatives Considered:**
- Wrapping getter in try/catch — fragile, masks deeper issues
- Using `Object.defineProperty` — same spread problem
- Making `merge` avoid spreading `currentState` — breaks Zustand's contract

**Rules:**
```typescript
// ❌ NEVER — getters calling get() crash during hydration merge
get derivedProp() { return get().someField === 'value'; }

// ✅ OK — plain property  
derivedProp: false,

// ✅ OK — external selector (computed outside store)
const useDerivedProp = () => useEditorStore(s => s.someField === 'value');
```

**Consequences:**
- ✅ Persistence works reliably
- ✅ No silent hydration failures
- ⚠️ Computed properties must use selectors instead of getters (minor ergonomic cost)

---

## 2026-02-08 - Mobile Responsiveness Audit

### Context
After deploying to Cloudflare Pages (`rendmd.pages.dev`), testing on a phone revealed the app is **barely functional on mobile**. A comprehensive audit of all 18+ component files identified **20 issues** across 3 severity levels.

### Key Findings
- **Zero responsive `@media` queries** (only `@media print`)
- **Only 8 uses of `sm:` breakpoint** — no `md:`, `lg:`, `xl:` anywhere
- **No touch-specific handlers** in the entire codebase
- **No safe-area-inset, no PWA, no `viewport-fit=cover`**

### Critical Issues (P0)
1. **Sidebar** — Fixed `w-56` (224px) leaves 151px for editor on 375px screen
2. **BubbleMenu** — ~550px minimum width overflows entire viewport
3. **Header** — 14+ interactive elements crammed into 375px
4. **Split view** — Hard-coded `w-1/2` = 187px per pane on phone

### Architecture Decision

#### ADR-031: Mobile-First Responsive Strategy
**Status:** Proposed  
**Date:** 2026-02-08

**Context:** RendMD was built desktop-first with no mobile considerations. Now deployed publicly, mobile access is essential.

**Decision:** Implement responsive design using `md:` (768px) as the primary mobile/desktop breakpoint. Key patterns:
- Sidebar becomes an overlay drawer on mobile (fixed + z-index + backdrop)
- Header collapses secondary actions into an overflow menu (⋮)
- Split view disabled below 768px
- BubbleMenu disabled on touch devices (persistent toolbar covers all formatting)
- Tooltips disabled on touch (no hover exists)
- Use `h-dvh` instead of `h-screen` for iOS Safari
- `@media (pointer: coarse)` for touch-specific adjustments (44px tap targets)

**Rationale:** 768px is the standard tablet/desktop threshold. Touch detection via `ontouchstart` + `maxTouchPoints` is reliable. Overlay sidebar is the proven mobile pattern (Google Docs, Notion, etc.).

**Full Spec:** `docs/specs/mobile-optimization.md`

---

## 2026-02-08 - v1.0.2 Issues Found During Mobile Testing

### Theme System Bug — Dual Theme Systems

**Severity:** High — theme selection broken in MobileMenu and SettingsModal.

**Root cause:** Two independent theme systems exist. The `useTheme()` hook (used by ThemeDropdown) manages its own `useState` + localStorage (`rendmd-theme`) and applies CSS classes to the DOM. The Zustand store's `setTheme()` (used by MobileMenu and SettingsModal) only updates store state — it never touches the DOM. Result: desktop theme dropdown works, mobile menu and settings theme selectors don't.

**Decision:** Unify into Zustand store as single source of truth. Delete `useTheme` hook. Store's `setTheme` will apply CSS classes directly. `onRehydrateStorage` applies theme on page load. Also remove redundant theme selector from SettingsModal.

### Missing "New File" Feature

No way to create a new document or reset the editor. Once content is loaded, the only option is "Open File" from disk. Adding `newFile()` store action + starter templates (Blank, TODO List, Meeting Notes, Project README) to showcase RendMD's rendering capabilities.

### ShortcutsModal Mobile Keyboard

Auto-focus on the search input triggers the software keyboard on mobile, blocking the modal content. Fix: conditional focus (skip on touch devices) + top-align modal on mobile instead of vertically centered.

**Builder Handoff:** `.github/agents/HANDOFF_BUILDER_v1.0.2.md`

### v1.0.2 Implementation Complete

**Date:** 2026-02-08

All three tasks implemented. 0 TypeScript errors, 101/101 tests passing.

**Task A — Unified Theme System:**
- `setTheme` in Zustand store now applies CSS classes to `<html>` directly
- Added `toggleDarkLight` action and `useIsDark` selector to store
- Theme applied on hydration via `onRehydrateStorage`
- ThemeDropdown, Editor, SourceEditor migrated to use store
- Deleted standalone `useTheme` hook — single source of truth achieved
- Removed redundant theme selector from SettingsModal

**Task B — New File + Templates:**
- `newFile()` store action resets content, frontmatter, filePath, fileName, file handle
- 4 starter templates: Blank, Note, README, Blog Post (with dynamic date)
- Template picker grid in EmptyState (2×2 mobile, 4-col desktop)
- "New" button in Header + MobileMenu, Ctrl+N keyboard shortcut

**Task C — ShortcutsModal Mobile Fix:**
- Conditional auto-focus: skips on touch devices, focuses on desktop
- Modal top-aligned on mobile (`items-start pt-12`), centered on desktop

#### ADR-032: Extract Shared File Handle to Avoid Circular Dependencies
**Status:** Accepted  
**Date:** 2026-02-08

**Context:** The `newFile()` action in `editorStore.ts` needs to clear the file handle (so "Save" doesn't overwrite the previous file). The file handle was stored as a module-level variable in `useFileSystem.ts`, which imports from `editorStore.ts`. Having `editorStore.ts` import from `useFileSystem.ts` would create a circular dependency.

**Decision:** Extract the shared file handle into a standalone module `src/utils/fileHandle.ts`. Both `editorStore.ts` and `useFileSystem.ts` import from it. Re-exports from `useFileSystem.ts` maintain backward compatibility.

**Consequences:**
- ✅ No circular dependency
- ✅ `newFile()` can clear the file handle directly
- ✅ Backward-compatible — existing `getSharedFileHandle`/`setSharedFileHandle` imports still work
- ⚠️ One more utility file, but it's small and single-purpose

---

## 2026-02-08 - v1.0.3 Mobile UX Improvements

### Changes Implemented

**Mobile View Toggle + Swipe Gestures:**
- `ViewModeToggle` moved out of `hidden sm:flex` container — always visible in header
- On mobile: Render + Source buttons (Split already hidden via `md:inline-flex`)
- New `useSwipeGesture` hook: swipe left → source, swipe right → render
- Touch-only, 50px threshold, vertical scroll guard prevents interference with page scrolling

**Theme Menu Stays Open:**
- Removed `close()` from `handleTheme` in MobileMenu — users can tap through all 4 themes to compare without reopening the menu

**Toolbar Wrap + Collapsible:**
- Changed toolbar from `overflow-x-auto` (horizontal scroll) to `flex-wrap` — all buttons visible at once, wrapping to multiple rows on narrow screens
- Added collapse toggle (chevron button) — hides toolbar for distraction-free writing
- Collapse state persisted in Zustand store
- Table grid picker right-edge overflow fixed (anchors right on mobile)

**Builder Handoff:** `.github/agents/HANDOFF_BUILDER_v1.0.3.md`