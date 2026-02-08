# RendMD - Project Plan

> **Version:** 1.0.0  
> **Last Updated:** 2026-02-08  
> **Status:** Phase 6 Complete — v1.0.0 Released

---

## Project Identity

**Name:** RendMD  
**Tagline:** *Intelligent. Elegant. Your data. Open source.*  
**Positioning:** The thinking person's markdown editor.

## Project Philosophy

> **"Make markdown a more accessible format for the everyday writer, developer, or anyone who uses a computer, in an elegant open source package."**

---

## Development Phases

### Phase 0: Foundation (Week 1) ✅ COMPLETE
**Goal:** Project setup, basic rendering, development environment

#### Project Scaffolding
- [x] Initialize Vite + React + TypeScript project
- [x] Configure path aliases (`@/components`, `@/hooks`, etc.)
- [x] Set up ESLint + Prettier with consistent rules
- [x] Create folder structure per architecture spec
- [x] Add `.github/copilot-instructions.md`

#### Styling Foundation
- [x] Configure Tailwind CSS with CSS variables
- [x] Create `themes/base.css` with variable definitions
- [x] Implement dark basic theme (primary dev theme)
- [x] Set up theme switching infrastructure

#### Editor Setup
- [x] Install TipTap and required extensions
- [x] Set up basic markdown extension (tiptap-markdown)
- [x] Create `Editor.tsx` wrapper component
- [x] Verify markdown round-trip (load → edit → serialize)

#### Layout
- [x] Create base layout (header, sidebar, main editor area)
- [x] Implement responsive container
- [x] Add placeholder components for future features
- [x] Basic markdown file loading (hardcoded test file)

**Deliverable:** Can open a markdown string and edit basic text ✅

**Success Criteria:**
1. ✅ `npm run dev` starts without errors
2. ✅ Can type in editor and see formatted output
3. ✅ Markdown serializes correctly on change
4. ✅ Dark theme looks intentional (not broken)

**Phase 0 Completion Notes:**
- Completed: 2026-01-29
- Bundle size: 732KB (tracked for optimization in Phase 5)
- Known issue: `tiptap-markdown` lacks TypeScript types (documented workaround)
- Reviewer approved, all success criteria met

---

### Phase 0.5: Markdown Round-Trip Validation (Pre-Phase 1) ✅ COMPLETE
**Goal:** Validate core markdown processing before building on top of it

#### Test Data Generation
- [x] Create `tests/fixtures/markdown-test-suite.md` with comprehensive test cases
- [x] Include all GFM elements: headings, lists, tables, code blocks, links, images
- [x] Include edge cases: nested lists (3+ levels), complex tables, mixed formatting
- [x] Include frontmatter variations

#### Validation Strategy
- [x] Create `tests/utils/roundtrip.test.ts` for automated validation
- [x] Implement visual diff tool for rendered output comparison
- [x] Document any known limitations in Chronicle

#### Debug Infrastructure
- [x] Add markdown debug panel (dev mode only) showing:
  - Raw input markdown
  - ProseMirror document JSON
  - Serialized output markdown
  - Diff highlighting between input/output
- [x] Add console logging for parse/serialize steps (toggleable)

**Deliverable:** Confidence that markdown processing is reliable ✅

**Success Criteria:**
1. ✅ All GFM elements survive round-trip
2. ✅ Known limitations documented
3. ✅ Debug tools available for troubleshooting

**Phase 0.5 Completion Notes:**
- Completed: 2026-01-29
- Test suite: 505 lines covering all GFM elements
- Known transformations documented (list markers, horizontal rules, reference links)
- Debug panel built with 4 tabs (Input, Output, Document, Diff)

---

### Phase 1: Core Editing (Weeks 2-3) ✅ COMPLETE
**Goal:** Full inline editing for all common markdown elements

#### Week 2: Text Elements
- [x] Paragraph inline editing with visual states
- [x] Heading editing with level toggle (H1-H6)
- [x] Bold/italic/code inline formatting
- [x] Selection-based formatting toolbar (bubble menu)
- [x] Bullet and numbered lists
- [x] List indent/outdent
- [x] Task list checkboxes

#### Week 3: Rich Elements
- [x] Link editing (click → popover with URL/text)
- [x] Image display and edit popover
- [x] Blockquote editing
- [x] Horizontal rule handling
- [x] Code block display (basic styling, no syntax highlighting yet)
- [x] Code block language indicator

**Deliverable:** Can edit all standard markdown elements inline ✅

**Success Criteria:**
1. ✅ All GFM elements render correctly
2. ✅ Click any element to edit it
3. ✅ Bubble menu appears on text selection
4. ✅ Links are clickable (Ctrl+Click opens, Click edits)
5. ✅ Code blocks display correctly (styling deferred to 1.5)
6. ✅ Round-trip preserves all formatting

**Phase 1 Completion Notes:**
- Completed: 2026-01-30
- BubbleMenu with formatting controls (bold, italic, code, strikethrough, link)
- LinkPopover with Floating UI positioning
- ImagePopover for alt text and URL editing
- Keyboard shortcuts extension (Ctrl+B, Ctrl+I, etc.)

---

### Phase 1.5: Polish & Enhancements (Post-Phase 1 Sprint) ✅ COMPLETE
**Goal:** Quick wins and polish items that didn't fit in Phase 1 scope

#### Code Block Enhancements
- [x] Shiki integration for syntax highlighting
- [x] Code block language selector dropdown
- [x] Copy code button

#### Theme System
- [x] Wire up theme toggle in header (dark/light quick switch)
- [x] Theme dropdown with all four options
- [x] Theme persistence to localStorage

#### Developer Experience
- [x] Markdown debug panel refinements
- [x] Performance baseline measurement

**Deliverable:** Polished Phase 1 with syntax highlighting and theme switching ✅

**Success Criteria:**
1. ✅ Code blocks have accurate syntax highlighting
2. ✅ Theme toggle works and persists
3. ✅ All four theme options selectable

**Phase 1.5 Completion Notes:**
- Completed: 2026-01-30
- Shiki integration with theme-aware highlighting (github-dark/light-default)
- CodeBlockComponent with language selector (17 languages) and copy button
- useTheme hook with localStorage persistence and isDark computed property
- ThemeDropdown with quick toggle (sun/moon) + full 4-theme selector
- 4 complete CSS theme files (~60 variables each)
- Build passes, bundle includes lazy-loaded Shiki language chunks

---

### Phase 2: Tables & File Ops (Week 4) ✅ COMPLETE
**Goal:** Table editing and local file system integration

#### Table Editing
- [x] Table rendering with cell navigation
- [x] Click cell to edit
- [x] Add/remove row buttons
- [x] Add/remove column buttons
- [x] GFM compliance guards (protect header, prevent nesting)
- [x] Contextual TableToolbar with smart button states
- [x] Column alignment controls *(completed in Phase 2.5)*
- [x] Tab navigation between cells *(completed in Phase 2.5)*

#### File Operations
- [x] File System Access API integration (useFileSystem hook)
- [x] Open file dialog
- [x] Save / Save As
- [x] Auto-save with debounce (2s default, useAutoSave hook)
- [x] Dirty state indicator (FileIndicator component)
- [x] Keyboard shortcuts (Ctrl+O, Ctrl+S)

**Deliverable:** Can open, edit tables, and save .md files locally ✅

**Phase 2 Completion Notes:**
- Completed: 2026-01-31
- Table CSS with visible borders, header styling, blue selection highlight
- GFM guards: header row protection, nested table prevention, add-row-above-header disabled
- Delete column disabled when only 1 column left
- ErrorBoundary component for graceful error handling
- Dev scripts: dev.bat, dev.ps1

---

### Phase 2.5: Table Enhancements (Post-Phase 2 Sprint) ✅ COMPLETE
**Goal:** Advanced table UX and remaining table features

#### Grid Selection for Table Insertion
- [x] Grid picker component (like Google Docs/Word)
- [x] Hover to preview table size (e.g., "3×4 table")
- [x] Click to insert with selected dimensions
- [x] Replace current table insert button/command

#### Table Navigation & Alignment
- [x] Tab navigation between cells (Tab = next, Shift+Tab = prev)
- [x] Enter creates new row at end of table
- [x] Column alignment controls (left/center/right)
- [x] Visual alignment indicators in header

**Deliverable:** Premium table insertion and navigation experience ✅

**Phase 2.5 Completion Notes:**
- Completed: 2026-01-30
- TableGridPicker component for visual table size selection
- Tab/Shift+Tab cell navigation
- Column alignment toolbar (visual-only per ADR-020, GFM limitation)
- Alignment markers (`:---:`) not persisted to markdown (documented)

---

### Phase 3: Source View & Frontmatter (Week 5) ✅ COMPLETE
**Goal:** Source toggle, frontmatter support, remaining themes

#### Source View
- [x] Toggle button in header (three-way: render / split / source)
- [x] Source panel component (side panel)
- [x] **Editable source view** (not read-only)
- [x] Bidirectional sync (edit either view)
- [x] Syntax highlighting for markdown source (Shiki)
- [x] Same keyboard shortcuts work in both views
- [ ] Sync scroll between rendered/source *(deferred)*
- [x] Keyboard shortcut (Ctrl+/)
- [x] Persist preference

#### Frontmatter
- [x] YAML parsing with `yaml` library
- [x] Frontmatter panel UI (collapsible, above editor)
- [x] Form fields for common properties (title, author, date, tags)
- [x] Custom field editor (key-value pairs)
- [x] Sync changes back to markdown
- [ ] Theme override from frontmatter *(deferred)*

#### Theming Completion
- [x] Light basic theme *(completed in Phase 1.5)*
- [x] Dark glassmorphism theme *(completed in Phase 1.5)*
- [x] Light glassmorphism theme *(completed in Phase 1.5)*
- [x] Theme switcher UI in header *(completed in Phase 1.5)*
- [x] Theme persistence (localStorage) *(completed in Phase 1.5)*

**Deliverable:** Source view works, frontmatter editable, all themes complete ✅

**Phase 3 Completion Notes:**
- Completed: 2026-01-30 (commit 94bfe11)
- Three-way view mode toggle (render / split / source)
- Shiki-highlighted source editor with overlay textarea
- YAML frontmatter panel with collapsible UI above editor
- Form fields for title, author, date, tags + custom key-value pairs
- View mode persisted to localStorage via Zustand persist
- 5 bugs found and fixed during manual testing (CSS overlay, initial sync, tag parsing, custom field persistence, Zustand hydration)

---

### Phase 4: Images & Navigation (Week 6) ✅ COMPLETE
**Goal:** Image handling, table of contents, keyboard shortcuts

#### Image Handling
- [x] Image popover (alt text, URL editing) *(Phase 1)*
- [x] Drag-drop image onto editor → opens ImageInsertModal
- [x] Paste image from clipboard → same flow
- [x] ImageInsertModal with 3 tabs: URL / Local File / Embed (Base64)
- [x] CustomImage extension with `localPath` attribute for markdown serialization
- [x] Base64 embed with lazy conversion and >5MB file size warning
- [x] Local File tab with editable path field (no FS API dependency)
- [x] Image button in BubbleMenu + Ctrl+Shift+I shortcut
- [x] Ctrl+Space to force BubbleMenu at cursor without selection
- [ ] ~~Assets folder auto-creation~~ *(descoped — replaced by simpler path-field approach)*

#### Table of Contents
- [x] `useTOC` hook: extract headings from ProseMirror document
- [x] TOCPanel sidebar component with hierarchical indent
- [x] Click to scroll to section (requestAnimationFrame + scrollIntoView)
- [x] Active heading highlight on scroll + manual set on click
- [x] Nesting depth visualization via indentation

#### Keyboard Shortcuts
- [x] ShortcutsModal: grouped by category, searchable
- [x] Ctrl+H shortcut trigger *(changed from Ctrl+? due to browser conflict)*
- [x] Header keyboard button to open shortcuts modal
- [x] Undo/redo via TipTap history extension *(existing from Phase 0)*

**Deliverable:** Full image workflow, navigable documents ✅

**Phase 4 Completion Notes:**
- Completed: 2026-02-08
- 5+ rounds of reviewer bug fixes
- Local File tab redesigned mid-review: FS API dependency removed for browser portability
- CustomImage extension stores data URL in `src` (display) + relative path in `localPath` (markdown output)
- TOC freeze bug fixed: removed `setTextSelection`, uses DOM `scrollIntoView` instead
- Ctrl+? changed to Ctrl+H due to browser shortcut conflict
- Build: 0 errors, 0 warnings

---

### Phase 5: Polish & Advanced (Week 7) ✅ COMPLETE
**Goal:** Export, search, UX polish, performance optimization

#### Export Features
- [x] Export to PDF (browser `window.print()` with print stylesheet)
- [x] Export to standalone HTML (embedded theme CSS, computed variable values)
- [x] Copy as rich text (HTML + plain text MIME types via Clipboard API)
- [x] ExportDropdown component with keyboard/a11y support

#### Search
- [ ] ~~Find in document~~ *(deferred — browser Ctrl+F works; VS Code extension gets it free)*
- [ ] ~~Highlight matches~~ *(deferred)*
- [ ] ~~Navigate between matches~~ *(deferred)*

#### UX Polish
- [x] Loading states (Suspense fallbacks for lazy-loaded components)
- [x] Error handling and user feedback (toast notification system)
- [x] Empty state design (welcome screen with Open File + Shortcuts buttons)
- [x] Tooltips on all icon-only buttons (Header + BubbleMenu, with shortcut hints)

#### Settings
- [x] SettingsModal: theme, font size, auto-save toggle (lazy-loaded)
- [x] Font size persisted via CSS variable `--editor-font-size`
- [x] Auto-save toggle persisted, `useAutoSave` respects flag
- [ ] ~~Default view mode setting~~ *(deferred — low priority)*
- [ ] ~~Sidebar default setting~~ *(deferred — low priority)*

#### File Browser
- [ ] ~~Recent files list~~ *(deferred to v1.1 — requires IndexedDB handle storage)*
- [ ] ~~Folder navigation sidebar~~ *(deferred to v1.1)*

#### Bundle Size Optimization
- [x] `manualChunks` function for TipTap/ProseMirror vendor splitting
- [x] `React.lazy` for SourceEditor, ImageInsertModal, ShortcutsModal, SettingsModal
- [x] Suspense fallbacks for all lazy-loaded components
- [x] **Main chunk: 370 KB (113 KB gzip)** — down from 1,121 KB, well under 500 KB target

**Deliverable:** Feature-complete, optimized application ✅

**Phase 5 Completion Notes:**
- Completed: 2026-02-08
- 1 round of reviewer fixes (7 issues: lazy load guards, empty state wiring, tooltips applied, toast animation, print CSS scoping)
- Bundle: 370 KB main (113 KB gzip), 749 KB vendor-tiptap, 4 lazy chunks
- Toast system: separate Zustand store, auto-dismiss, entry/exit animations
- Theme variables captured via `getComputedStyle` for standalone HTML export
- Build: 0 errors, 0 warnings

---

### Phase 6: Testing & Release (Week 8) ✅ COMPLETE
**Goal:** Bug fixes, performance, documentation, v1.0 release

#### Testing
- [x] Vitest installed + configured (jsdom, globals, setup file)
- [x] 77 unit tests across 5 files, all passing
- [x] `frontmatterParser.test.ts` — 30 tests (parse, serialize, update, tags, edge cases)
- [x] `imageHelpers.test.ts` — 19 tests (sanitize, generate, isImage, formatSize)
- [x] `cn.test.ts` — 9 tests (merge, conditional, Tailwind conflicts)
- [x] `editorStore.test.ts` — 17 tests (all actions, view cycling, sidebar, settings)
- [x] `exportHelpers.test.ts` — 2 tests (HTML escape, print call)
- [x] `roundtrip.test.ts` — markdown round-trip integration tests
- [x] Test scripts: `test`, `test:watch`, `test:coverage`
- [ ] ~~Performance profiling (large documents)~~ *(deferred — manual spot-check sufficient for v1.0)*
- [ ] ~~Cross-browser automated testing~~ *(manual verification performed)*

#### Accessibility
- [x] `eslint-plugin-jsx-a11y` installed and configured (flat config)
- [x] 0 lint errors (including a11y rules)
- [x] ARIA attributes added: ImagePopover, LinkPopover, TableGridPicker, ImageInsertModal, SettingsModal
- [x] `role="dialog"`, `aria-modal`, `aria-label` on all modals
- [x] `role="grid"`, `role="gridcell"`, keyboard handler on TableGridPicker
- [x] `htmlFor`/`id` on all label+input pairs
- [ ] ~~Screen reader testing~~ *(deferred — structural a11y in place)*
- [ ] ~~Color contrast automated verification~~ *(manual check sufficient)*

#### Documentation
- [x] README.md — full rewrite with features, setup, shortcuts, browser support, roadmap
- [x] LICENSE — MIT license
- [x] CONTRIBUTING.md — setup, standards, TipTap/theme guides, PR process

#### Release
- [x] Dev artifacts guarded behind `import.meta.env.DEV`
- [x] No unguarded `console.log` in production build
- [x] Version bump to 1.0.0
- [ ] ~~GitHub repository setup~~ *(deferred — separate from code)*
- [ ] ~~Release notes~~ *(deferred — derivable from chronicle)*

**Deliverable:** v1.0.0 release ✅

**Phase 6 Completion Notes:**
- Completed: 2026-02-08
- 77 unit tests + round-trip integration tests, all passing
- jsx-a11y lint: 0 errors, ARIA attributes on all interactive components
- README, LICENSE (MIT), CONTRIBUTING.md — all created
- Build: 0 errors, 0 warnings, 370 KB main (113 KB gzip)
- `package.json` version: 1.0.0

---

## Milestones Summary

| Milestone | Target | Key Deliverable | Status |
|-----------|--------|-----------------|--------|
| M0: Foundation | End of Week 1 | Basic editing works | ✅ Complete |
| M0.5: Validation | Pre-Phase 1 | Markdown round-trip verified | ✅ Complete |
| M1: Core Editing | End of Week 3 | All elements editable | ✅ Complete |
| M1.5: Enhancements | Post-Week 3 | Syntax highlighting, themes | ✅ Complete |
| M2: Files & Tables | End of Week 4 | File ops + tables | ✅ Complete |
| M2.5: Table UX | Post-Week 4 | Grid insert, tab nav, alignment | ✅ Complete |
| M3: Source & Themes | End of Week 5 | Source view, frontmatter, 4 themes | ✅ Complete |
| M4: Images & Nav | End of Week 6 | Images + TOC | ✅ Complete |
| M5: Polish | End of Week 7 | Export + search + optimization | ✅ Complete |
| M6: Release | End of Week 8 | v1.0.0 | ✅ Complete |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TipTap markdown serialization edge cases | Medium | High | Early testing with complex docs |
| Table editing complexity | Medium | Medium | Start simple, iterate |
| Glassmorphism performance | Low | Low | Use `will-change`, optimize blur |
| File System API browser support | Low | Medium | Graceful fallback to file input |
| Scope creep | High | Medium | Strict MVP focus, backlog features |
| Image asset management edge cases | Medium | Low | Clear file naming conventions |
| Frontmatter parsing errors | Low | Medium | Graceful fallback, show raw if invalid |

---

## Definition of Done (per feature)

- [ ] Feature works as specified
- [ ] No console errors or warnings
- [ ] Responsive to window resize
- [ ] Keyboard accessible where applicable
- [ ] Works in all four themes
- [ ] Markdown round-trip preserves content
- [ ] Code is typed (no `any` without good reason)
- [ ] Edge cases handled gracefully

---

## Technology Decisions Log

| Decision | Choice | Rationale | Date |
|----------|--------|-----------|------|
| Frontend framework | React 18 | TipTap integration, ecosystem | 2026-01-29 |
| Editor library | TipTap | Markdown support, extensible | 2026-01-29 |
| Styling | Tailwind + CSS vars | Fast dev, theming | 2026-01-29 |
| Build tool | Vite | Speed, modern defaults | 2026-01-29 |
| State management | Zustand | Lightweight, simple | 2026-01-29 |
| Code highlighting | Shiki | Theme-aware, accurate | 2026-01-29 |
| YAML parsing | yaml (npm) | Robust, well-maintained | 2026-01-29 |
| Source view | Side panel, hidden default | Rendered-first philosophy | 2026-01-29 |
| Image handling | URL + local assets | Flexibility | 2026-01-29 |
| Frontmatter | YAML with form UI | User-friendly metadata | 2026-01-29 |

---

## Out of Scope (v1.0)

The following are explicitly NOT in v1.0:
- AI writing assistance (targeted for v1.1)
- Collaborative editing
- Cloud sync / storage
- Mobile-specific UI (responsive is fine, dedicated mobile UX is not)
- Plugin/extension system
- Custom theme editor UI
- Vim/Emacs keybindings
- Multiple document tabs
- Git integration
- Mermaid diagrams (consider for v1.1)
- Math/KaTeX support (consider for v1.1)

---

## Post-v1.0 Roadmap Preview

### v1.1 - AI & Intelligence
- [ ] AI provider integration (OpenAI, Anthropic, Google, Ollama)
- [ ] BYOK (Bring Your Own Key) system with local encryption
- [ ] Continue writing / autocomplete
- [ ] Improve writing (selection-based)
- [ ] Summarize, expand, translate features
- [ ] Custom prompt support

### v1.2 - VS Code Extension + Advanced Features
- [ ] **VS Code Extension** (CustomTextEditorProvider, see `docs/research/VSCODE_EXTENSION.md`)
- [ ] Monorepo refactor: extract `packages/core`, `packages/web`, `packages/vscode`
- [ ] Mermaid diagram support
- [ ] Math/KaTeX equations
- [ ] Document templates
- [ ] Advanced export options

### v2.0 - Extensibility
- [ ] Plugin API architecture
- [ ] Community theme system
- [ ] Collaborative editing foundation

---

## Sprint Planning Notes

### Phase 0 (2026-01-29) ✅ COMPLETE
Focus on Phase 0 foundation:
1. ✅ Project scaffolding (Vite + React + TS)
2. ✅ Tailwind configuration with CSS variables
3. ✅ Basic layout structure
4. ✅ TipTap integration with markdown
5. ✅ Dark basic theme implementation

**Result:** Development environment working, core concept proven.

### Next: Phase 0.5 - Markdown Validation
Before building more features, validate the foundation:
1. Create comprehensive markdown test file
2. Build debug infrastructure for visibility
3. Test and document round-trip fidelity
4. Identify any tiptap-markdown limitations

### Then: Phase 1 - Core Editing
With validated foundation, build editing features:
1. Bubble menu and toolbar
2. All text formatting
3. Lists and task lists
4. Links and images
5. Blockquotes and code blocks (basic)

---

## Resources & Links

- [TipTap Documentation](https://tiptap.dev/docs)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shiki Syntax Highlighter](https://shiki.matsu.io/)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [Zustand](https://github.com/pmndrs/zustand)
