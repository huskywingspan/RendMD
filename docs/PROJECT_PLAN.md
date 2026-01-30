# RendMD - Project Plan

> **Version:** 0.4.0  
> **Last Updated:** 2026-01-30  
> **Status:** Phase 1.5 Complete, Preparing Phase 2

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

### Phase 2: Tables & File Ops (Week 4)
**Goal:** Table editing and local file system integration

#### Table Editing
- [ ] Table rendering with cell navigation
- [ ] Click cell to edit
- [ ] Add/remove row buttons
- [ ] Add/remove column buttons
- [ ] Column alignment controls
- [ ] Tab navigation between cells

#### File Operations
- [ ] File System Access API integration
- [ ] Open file dialog
- [ ] Save / Save As
- [ ] Auto-save with debounce (2s default)
- [ ] Dirty state indicator (unsaved changes)
- [ ] Keyboard shortcuts (Ctrl+O, Ctrl+S)

**Deliverable:** Can open, edit tables, and save .md files locally

---

### Phase 3: Source View & Frontmatter (Week 5)
**Goal:** Source toggle, frontmatter support, remaining themes

#### Source View
- [ ] Toggle button in header
- [ ] Source panel component (side panel)
- [ ] **Editable source view** (not read-only)
- [ ] Bidirectional sync (edit either view)
- [ ] Syntax highlighting for markdown source
- [ ] Same keyboard shortcuts work in both views
- [ ] Sync scroll between rendered/source
- [ ] Keyboard shortcut (Ctrl+/)
- [ ] Persist preference

#### Frontmatter
- [ ] YAML parsing with `yaml` library
- [ ] Frontmatter panel UI (collapsible)
- [ ] Form fields for common properties (title, author, date, tags)
- [ ] Custom field editor (key-value pairs)
- [ ] Sync changes back to markdown
- [ ] Theme override from frontmatter

#### Theming Completion
- [ ] Light basic theme
- [ ] Dark glassmorphism theme
- [ ] Light glassmorphism theme
- [ ] Theme switcher UI in header
- [ ] Theme persistence (localStorage)

**Deliverable:** Source view works, frontmatter editable, all themes complete

---

### Phase 4: Images & Navigation (Week 6)
**Goal:** Image handling, table of contents, keyboard shortcuts

#### Image Handling
- [ ] Image popover (alt text, URL editing)
- [ ] Drag-drop image upload
- [ ] Paste image from clipboard
- [ ] "Store locally or URL" choice dialog
- [ ] Create `assets/` folder when needed
- [ ] Copy image to assets with unique name
- [ ] Relative path generation

#### Table of Contents
- [ ] Auto-generate from headings
- [ ] Sidebar panel with toggle
- [ ] Click to scroll to section
- [ ] Highlight current section on scroll
- [ ] Nesting depth visualization

#### Keyboard Shortcuts
- [ ] Full shortcut implementation (see Design Doc)
- [ ] Shortcut help modal (Ctrl+?)
- [ ] Undo/redo with proper history

**Deliverable:** Full image workflow, navigable documents

---

### Phase 5: Polish & Advanced (Week 7)
**Goal:** Export, search, UX polish, performance optimization

#### Export Features
- [ ] Export to PDF (browser print with print stylesheet)
- [ ] Export to standalone HTML
- [ ] Copy as rich text (for pasting into other apps)

#### Search
- [ ] Find in document (Ctrl+F)
- [ ] Highlight matches
- [ ] Navigate between matches

#### UX Polish
- [ ] Loading states
- [ ] Error handling and user feedback
- [ ] Empty state design (no file open)
- [ ] Welcome/onboarding for first use
- [ ] Tooltips on all buttons

#### File Browser
- [ ] Recent files list
- [ ] Folder navigation sidebar (optional)

#### Bundle Size Optimization
- [ ] Analyze bundle with `vite-bundle-visualizer`
- [ ] Identify largest dependencies
- [ ] Implement code-splitting for:
  - [ ] Source view panel (lazy load)
  - [ ] Shiki highlighter (lazy load on first code block)
  - [ ] Export functionality (lazy load)
- [ ] Target: <500KB initial bundle (currently 732KB)
- [ ] Document optimization decisions

**Deliverable:** Feature-complete, optimized application

---

### Phase 6: Testing & Release (Week 8)
**Goal:** Bug fixes, performance, documentation, v1.0 release

#### Testing
- [ ] Performance profiling (large documents)
- [ ] Edge case handling (malformed markdown)
- [ ] Complex table round-trip testing
- [ ] Frontmatter edge cases
- [ ] Cross-browser testing (Chrome, Firefox, Edge)

#### Accessibility
- [ ] Keyboard navigation audit
- [ ] Screen reader testing
- [ ] Color contrast verification
- [ ] Focus indicators

#### Documentation
- [ ] README with setup instructions
- [ ] User guide / help documentation
- [ ] Contributing guide
- [ ] License selection (open source)

#### Release
- [ ] Final UI polish pass
- [ ] Version bump to 1.0.0
- [ ] GitHub repository setup
- [ ] Release notes

**Deliverable:** v1.0.0 release

---

## Milestones Summary

| Milestone | Target | Key Deliverable | Status |
|-----------|--------|-----------------|--------|
| M0: Foundation | End of Week 1 | Basic editing works | ✅ Complete |
| M0.5: Validation | Pre-Phase 1 | Markdown round-trip verified | 🔄 Next |
| M1: Core Editing | End of Week 3 | All elements editable | ⏳ Planned |
| M1.5: Enhancements | Post-Week 3 | Syntax highlighting, themes | ⏳ Planned |
| M2: Files & Tables | End of Week 4 | File ops + tables | ⏳ Planned |
| M3: Source & Themes | End of Week 5 | Source view, frontmatter, 4 themes | ⏳ Planned |
| M4: Images & Nav | End of Week 6 | Images + TOC | ⏳ Planned |
| M5: Polish | End of Week 7 | Export + search + optimization | ⏳ Planned |
| M6: Release | End of Week 8 | v1.0.0 | ⏳ Planned |

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

### v1.2 - Advanced Features
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
