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

## Session Log

| Date | Session | Key Activities | Outcomes |
|------|---------|----------------|----------|
| 2026-01-29 | Kickoff | Project conception, brainstorming, initial documentation | Design doc, project plan, chronicle created |
| 2026-01-29 | Strategy | Competitive analysis, feature philosophy, AI planning | ADRs 007-009, market positioning defined |

---

## Lessons Learned

*This section will be populated as development progresses.*

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
