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
| 0.6.0 | 2026-01-30 | Phase 2 research complete, ADRs 016-018, technical brief |
