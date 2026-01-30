# RendMD - Project Plan

> **Version:** 0.1.0  
> **Last Updated:** 2026-01-29  
> **Status:** Planning

---

## Project Identity

**Name:** RendMD  
**Tagline:** *Intelligent. Elegant. Your data. Open source.*  
**Positioning:** The thinking person's markdown editor.

## Project Philosophy

> **"Make markdown a more accessible format for the everyday writer, developer, or anyone who uses a computer, in an elegant open source package."**

---

## Development Phases

### Phase 0: Foundation (Week 1)
**Goal:** Project setup, basic rendering, development environment

#### Project Scaffolding
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure path aliases (`@/components`, `@/hooks`, etc.)
- [ ] Set up ESLint + Prettier with consistent rules
- [ ] Create folder structure per architecture spec
- [ ] Add `.github/copilot-instructions.md`

#### Styling Foundation
- [ ] Configure Tailwind CSS with CSS variables
- [ ] Create `themes/base.css` with variable definitions
- [ ] Implement dark basic theme (primary dev theme)
- [ ] Set up theme switching infrastructure

#### Editor Setup
- [ ] Install TipTap and required extensions
- [ ] Set up basic markdown extension (tiptap-markdown)
- [ ] Create `Editor.tsx` wrapper component
- [ ] Verify markdown round-trip (load → edit → serialize)

#### Layout
- [ ] Create base layout (header, sidebar, main editor area)
- [ ] Implement responsive container
- [ ] Add placeholder components for future features
- [ ] Basic markdown file loading (hardcoded test file)

**Deliverable:** Can open a markdown string and edit basic text

**Success Criteria:**
1. `npm run dev` starts without errors
2. Can type in editor and see formatted output
3. Markdown serializes correctly on change
4. Dark theme looks intentional (not broken)

---

### Phase 1: Core Editing (Weeks 2-3)
**Goal:** Full inline editing for all common markdown elements

#### Week 2: Text Elements
- [ ] Paragraph inline editing with visual states
- [ ] Heading editing with level toggle (H1-H6)
- [ ] Bold/italic/code inline formatting
- [ ] Selection-based formatting toolbar (bubble menu)
- [ ] Bullet and numbered lists
- [ ] List indent/outdent
- [ ] Task list checkboxes

#### Week 3: Rich Elements
- [ ] Link editing (click → popover with URL/text)
- [ ] Image display and edit popover
- [ ] Blockquote editing
- [ ] Horizontal rule handling
- [ ] Code block with syntax highlighting (Shiki)
- [ ] Code block language selector

**Deliverable:** Can edit all standard markdown elements inline

**Success Criteria:**
1. All GFM elements render correctly
2. Click any element to edit it
3. Bubble menu appears on text selection
4. Links are clickable (Ctrl+Click opens, Click edits)
5. Code blocks have syntax highlighting
6. Round-trip preserves all formatting

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
**Goal:** Export, search, UX polish

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

**Deliverable:** Feature-complete application

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

| Milestone | Target | Key Deliverable |
|-----------|--------|-----------------|
| M0: Foundation | End of Week 1 | Basic editing works |
| M1: Core Editing | End of Week 3 | All elements editable |
| M2: Files & Tables | End of Week 4 | File ops + tables |
| M3: Source & Themes | End of Week 5 | Source view, frontmatter, 4 themes |
| M4: Images & Nav | End of Week 6 | Images + TOC |
| M5: Polish | End of Week 7 | Export + search |
| M6: Release | End of Week 8 | v1.0.0 |

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

### Tonight's Goals (2026-01-29)
Focus on Phase 0 foundation:
1. Project scaffolding (Vite + React + TS)
2. Tailwind configuration with CSS variables
3. Basic layout structure
4. TipTap integration with markdown
5. Dark basic theme implementation

This sets up the development environment and proves the core concept works.

---

## Resources & Links

- [TipTap Documentation](https://tiptap.dev/docs)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shiki Syntax Highlighter](https://shiki.matsu.io/)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [Zustand](https://github.com/pmndrs/zustand)
