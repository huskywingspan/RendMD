# RendMD - Design Document

> **Version:** 0.1.0 (Initial Draft)  
> **Last Updated:** 2026-01-29  
> **Status:** Planning

---

## 1. Vision & Goals

### 1.1 Project Identity

**Name:** RendMD  
**Tagline:** *Intelligent. Elegant. Your data. Open source.*  
**Positioning:** The thinking person's markdown editor.

### 1.2 Project Philosophy

> **"Make markdown a more accessible format for the everyday writer, developer, or anyone who uses a computer, in an elegant open source package."**

### 1.3 Product Vision
RendMD is a **rendered-first markdown editor** that lets users edit documents from their beautifully rendered state rather than raw source. It combines the portability of markdown files with the visual editing experience of modern document processors.

### 1.4 Core Principles
1. **Rendered-First Editing** - The rendered view IS the editor
2. **Markdown Fidelity** - Output is always clean, portable `.md`
3. **Premium Feel** - Polished UI with thoughtful animations and typography
4. **Lightweight** - Fast load, minimal dependencies, no bloat
5. **Extensible Theming** - Beautiful defaults, customizable for power users
6. **Open Source** - Community-driven, transparent development
7. **Privacy-First** - Your data stays yours; AI features use your own keys
8. **Accessible** - Keyboard navigable, screen reader friendly, inclusive design

### 1.5 Target Users

| Persona | Needs | How RendMD Helps |
|---------|-------|------------------|
| **Developer** | Write docs, READMEs, notes | Clean markdown output, code block support, dark theme |
| **Technical Writer** | Professional documentation | Tables, frontmatter, export options, light theme |
| **Everyday Writer** | Blog posts, notes, journals | No syntax to learn, just click and type |
| **Student** | Notes, papers, assignments | Free, beautiful, works offline |
| **Knowledge Worker** | Meeting notes, wikis | AI assistance (v1.1), quick formatting |

### 1.6 Design Principles

#### Visual Design
- **Typography-first:** Content is king; UI should fade into the background
- **Purposeful whitespace:** Let content breathe
- **Subtle interactions:** Hover states and transitions should feel natural
- **Consistent iconography:** Lucide icons throughout
- **Color with meaning:** Accent colors for actions, semantic colors for states

#### Interaction Design
- **Direct manipulation:** Click to edit, drag to move
- **Progressive disclosure:** Simple by default, power features discoverable
- **Keyboard-first:** Every action has a shortcut
- **Instant feedback:** No action without response
- **Forgiving:** Easy undo, confirm destructive actions

---

## 2. Feature Specification

### 2.1 Core Editing (MVP)

#### Inline Text Editing
- Click any text block (paragraph, heading, list item) to enter edit mode
- Edit directly in place with a subtle visual indicator (border/highlight)
- Press Escape or click outside to confirm
- Markdown formatting preserved during round-trip

**Interaction Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│  IDLE STATE                                                  │
│  "Your paragraph text here..."                              │
│                                                              │
│  [User clicks paragraph]                                     │
│           ↓                                                  │
├─────────────────────────────────────────────────────────────┤
│  HOVER STATE                                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ "Your paragraph text here..."              [subtle bg] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [User clicks]                                               │
│           ↓                                                  │
├─────────────────────────────────────────────────────────────┤
│  EDITING STATE                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ "Your paragraph text here...|"         [accent border] │ │
│  └────────────────────────────────────────────────────────┘ │
│  [Bubble menu appears on text selection]                     │
│                                                              │
│  [Escape / Click outside / Tab to next]                      │
│           ↓                                                  │
│  Back to IDLE STATE                                          │
└─────────────────────────────────────────────────────────────┘
```

#### Table Editing
- Visual table with clickable cells
- Toolbar or context menu for:
  - Add/remove rows and columns
  - Align columns (left/center/right)
  - Convert to/from table
- Tab to move between cells

**Table UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  Table Toolbar: [⬆️ Row] [⬇️ Row] [⬅️ Col] [➡️ Col] [≡ Align] [🗑️] │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┬────────────┬────────────┐                      │
│  │ Header 1   │ Header 2   │ Header 3   │  <- Bold, bg color  │
│  ├────────────┼────────────┼────────────┤                      │
│  │ Cell 1     │ Cell 2     │ [Editing] │  <- Blue border     │
│  ├────────────┼────────────┼────────────┤                      │
│  │ Cell 4     │ Cell 5     │ Cell 6     │                      │
│  └────────────┴────────────┴────────────┘                      │
│  [+] Add row                                                 │
└─────────────────────────────────────────────────────────────┘
```

**Table Interactions:**
| Action | Trigger | Result |
|--------|---------|--------|
| Edit cell | Click cell | Focus with cursor |
| Navigate | Tab / Shift+Tab | Move to next/prev cell |
| Navigate | Arrow keys | Move between cells |
| Add row | Click [+] or Ctrl+Enter | New row below |
| Add column | Toolbar button | New column right |
| Delete row | Toolbar or right-click | Remove current row |
| Delete column | Toolbar or right-click | Remove current column |
| Align | Toolbar dropdown | Left/center/right |

#### Link Editing
- Clickable links open in browser (Ctrl+Click or configurable)
- Click without modifier opens edit popover:
  - Display text field
  - URL field
  - Remove link button
- Auto-detect URLs when pasting

**Link Popover:**
```
┌─────────────────────────────────────┐
│  Edit Link                    ×  │
├─────────────────────────────────────┤
│  Text                             │
│  ┌───────────────────────────────┐ │
│  │ Link display text           │ │
│  └───────────────────────────────┘ │
│  URL                              │
│  ┌───────────────────────────────┐ │
│  │ https://example.com         │ │
│  └───────────────────────────────┘ │
│                                   │
│  [🔗 Open]  [Remove]  [Save]      │
└─────────────────────────────────────┘
```

#### Supported Markdown Elements
| Element | Edit Method | Notes |
|---------|-------------|-------|
| Paragraphs | Inline edit | Direct typing |
| Headings (H1-H6) | Inline edit + level toggle | Button or keyboard |
| Bold/Italic/Code | Selection toolbar | Standard formatting |
| Links | Click → popover | URL + text |
| Images | Click → popover | URL + alt text, local or remote |
| Code blocks | Click → editor pane | Syntax highlighting |
| Blockquotes | Inline edit | Visual indent |
| Lists (ul/ol) | Inline edit + controls | Indent/outdent, type toggle |
| Tables | Cell click + toolbar | Full table manipulation |
| Horizontal rules | Click → delete/move | Simple element |
| Task lists | Checkbox + inline edit | Toggle state |
| Frontmatter | Dedicated UI panel | YAML metadata editing |

#### Bubble Menu (Selection Toolbar)
Appears when user selects text:

```
┌─────────────────────────────────────────────────────────────┐
│  "Selected text in the document"                            │
│        ↑                                                     │
│  ┌───────────────────────────────────────┐                  │
│  │ B │ I │ S │ ` │ 🔗 │ H▾ │ • │ 1. │ ⋮ │                  │
│  └───────────────────────────────────────┘                  │
│   Bold Italic Strike Code Link Heading Lists  More          │
└─────────────────────────────────────────────────────────────┘
```

**Bubble Menu Actions:**
| Button | Action | Shortcut |
|--------|--------|----------|
| **B** | Bold | Ctrl+B |
| **I** | Italic | Ctrl+I |
| **S** | Strikethrough | Ctrl+Shift+S |
| **`** | Inline code | Ctrl+` |
| **🔗** | Insert/edit link | Ctrl+K |
| **H▾** | Heading level dropdown | Ctrl+1-6 |
| **•** | Bullet list | Ctrl+Shift+8 |
| **1.** | Numbered list | Ctrl+Shift+9 |
| **⋮** | More options | - |

### 2.2 Source View Toggle

#### Behavior
- Toggle button in header to show/hide raw markdown source
- **Hidden by default** - rendered view is primary
- When visible, shows in a collapsible side panel or bottom panel
- **Source view is fully editable** - changes sync to rendered view
- All editing tools work in both views (toolbar, shortcuts, etc.)
- Bidirectional sync: edit in either view, other updates

#### UI States
| Mode | Layout | Editing |
|------|--------|--------|
| Rendered Only (default) | Full width rendered | Full editing in rendered view |
| Side-by-side | 50/50 split | Edit either view, both stay synced |
| Source Only | Full width source | Full editing in source view |

#### Source View Features
- Syntax highlighting for markdown
- Same keyboard shortcuts as rendered view
- Line numbers (optional)
- Find/replace works in both views
- Cursor position syncs between views (best effort)

### 2.3 Image Handling

#### Dual Strategy
Support both URL references and local asset storage:

##### Option A: URL Reference
- Image stored externally (web URL, CDN, etc.)
- Markdown: `![alt](https://example.com/image.png)`
- Pros: No local storage needed, smaller repo
- Cons: Dependent on external availability

##### Option B: Local Assets
- Images copied to `assets/` folder relative to document
- Markdown: `![alt](./assets/image-name.png)`
- Auto-rename to avoid conflicts (timestamp or hash prefix)
- Pros: Fully portable, works offline
- Cons: Increases folder size

##### UI Flow
1. User drags/drops or pastes image
2. Popup asks: "Store locally or link to URL?"
3. If local: copy to `./assets/`, generate relative path
4. If URL: prompt for URL or use clipboard URL

#### Image Popover
- Click image to open edit popover
- Fields: Alt text, URL/path, optional caption
- Buttons: Replace, Download (if remote), Delete

### 2.4 Frontmatter Support

#### YAML Metadata Block
```yaml
---
title: Document Title
author: Name
date: 2026-01-29
tags: [markdown, documentation]
theme: dark-basic
---
```

#### UI Treatment
- Frontmatter displayed in a collapsible panel above document
- Styled as a form/card, not raw YAML (for non-technical users)
- Raw YAML view available via toggle
- Common fields with dedicated inputs:
  - Title (text)
  - Author (text)
  - Date (date picker)
  - Tags (tag input with autocomplete)
  - Theme (dropdown)
- Custom fields supported (key-value editor)

#### Behavior
- Frontmatter is optional
- If present, parsed and displayed in panel
- Changes sync back to YAML in markdown file
- Theme field can override app theme for specific document

### 2.5 Theming System

#### Theme Architecture
```
themes/
├── base.css           # Shared variables, typography scale
├── dark-basic.css     # Dark theme - legibility focused
├── light-basic.css    # Light theme - legibility focused  
├── dark-glass.css     # Dark glassmorphism
└── light-glass.css    # Light glassmorphism
```

#### CSS Variable Structure
```css
:root {
  /* Colors */
  --color-bg-primary: ...;
  --color-bg-secondary: ...;
  --color-bg-tertiary: ...;
  --color-text-primary: ...;
  --color-text-secondary: ...;
  --color-text-muted: ...;
  --color-accent: ...;
  --color-accent-hover: ...;
  --color-border: ...;
  --color-border-subtle: ...;
  
  /* Semantic Colors */
  --color-success: ...;
  --color-warning: ...;
  --color-error: ...;
  --color-info: ...;
  
  /* Typography */
  --font-family-body: ...;
  --font-family-heading: ...;
  --font-family-mono: ...;
  --font-size-base: ...;
  --font-size-sm: ...;
  --font-size-lg: ...;
  --line-height-body: ...;
  --line-height-heading: ...;
  
  /* Spacing */
  --spacing-xs: ...;
  --spacing-sm: ...;
  --spacing-md: ...;
  --spacing-lg: ...;
  --spacing-xl: ...;
  
  /* Effects (glassmorphism) */
  --blur-amount: ...;
  --glass-bg: ...;
  --glass-border: ...;
  --shadow-sm: ...;
  --shadow-md: ...;
  --shadow-lg: ...;
  
  /* Transitions */
  --transition-fast: ...;
  --transition-normal: ...;
}
```

#### Theme Priorities
1. **Dark Basic** - Primary development theme, clean and readable
2. **Light Basic** - Accessibility, professional documents
3. **Dark Glassmorphism** - Premium visual appeal
4. **Light Glassmorphism** - Premium light variant

#### Theme Design Guidelines

**Basic Themes:**
- Focus on legibility and information density
- High contrast ratios (WCAG AA minimum)
- Minimal decorative elements
- Clear visual hierarchy through typography
- Subtle borders and shadows

**Dark Basic Color Palette:**
| Variable | Value | Usage |
|----------|-------|-------|
| `--color-bg-primary` | `#0d1117` | Main background |
| `--color-bg-secondary` | `#161b22` | Sidebar, cards |
| `--color-bg-tertiary` | `#21262d` | Hover states |
| `--color-text-primary` | `#e6edf3` | Main text |
| `--color-text-secondary` | `#8b949e` | Muted text |
| `--color-accent` | `#58a6ff` | Links, actions |
| `--color-border` | `#30363d` | Borders |

**Light Basic Color Palette:**
| Variable | Value | Usage |
|----------|-------|-------|
| `--color-bg-primary` | `#ffffff` | Main background |
| `--color-bg-secondary` | `#f6f8fa` | Sidebar, cards |
| `--color-bg-tertiary` | `#eaeef2` | Hover states |
| `--color-text-primary` | `#1f2328` | Main text |
| `--color-text-secondary` | `#656d76` | Muted text |
| `--color-accent` | `#0969da` | Links, actions |
| `--color-border` | `#d0d7de` | Borders |

**Glassmorphism Themes:**
- Frosted glass effect with `backdrop-filter: blur()`
- Semi-transparent backgrounds
- Subtle gradient overlays
- Floating card aesthetic
- Soft, diffused shadows
- Background image/gradient support

### 2.6 File Operations

#### Local File Access
- Open `.md` files from filesystem
- Save changes back to original file
- Save As to new location
- Auto-save with configurable debounce (default: 2 seconds after last edit)
- Dirty state indicator in header (dot or asterisk)

#### File Browser (Phase 2)
- Sidebar showing folder structure
- Quick navigation between documents
- Recent files list
- Drag and drop to open

#### File System Access API
- Primary: Chrome/Edge File System Access API
- Fallback: `<input type="file">` + download for save
- Persist file handles for quick re-open

### 2.7 Navigation & UX

#### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| Save | Ctrl+S |
| Open | Ctrl+O |
| New | Ctrl+N |
| Bold | Ctrl+B |
| Italic | Ctrl+I |
| Code | Ctrl+` |
| Link | Ctrl+K |
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z / Ctrl+Y |
| Find | Ctrl+F |
| Heading 1-6 | Ctrl+1 through Ctrl+6 |
| Toggle source | Ctrl+/ |
| Toggle sidebar | Ctrl+\ |

#### Table of Contents
- Auto-generated from headings
- Collapsible sidebar panel
- Click to scroll to section
- Highlights current section based on scroll position
- Shows nesting depth visually

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18+ | Rich ecosystem, TipTap integration |
| Language | TypeScript | Type safety for complex editor state |
| Build Tool | Vite | Fast development, optimized builds |
| Editor Core | TipTap | ProseMirror-based, markdown extensions |
| Markdown Parser | remark + unified | GFM support, extensible |
| Styling | Tailwind CSS | Rapid development, CSS variables |
| Icons | Lucide React | Clean, consistent icon set |
| Code Highlighting | Shiki | Accurate, theme-aware highlighting |
| File Access | File System Access API | Native browser capability |
| State Management | Zustand | Lightweight, simple API |
| YAML Parsing | yaml (npm) | Frontmatter handling |

### 3.2 Component Architecture

```
src/
├── components/
│   ├── Editor/
│   │   ├── Editor.tsx              # Main TipTap editor wrapper
│   │   ├── EditorToolbar.tsx       # Formatting toolbar
│   │   ├── BubbleMenu.tsx          # Selection-based menu
│   │   ├── SourceView.tsx          # Raw markdown panel
│   │   └── extensions/             # Custom TipTap extensions
│   │       ├── TableExtension/
│   │       ├── LinkExtension/
│   │       ├── ImageExtension/
│   │       └── FrontmatterExtension/
│   ├── Sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── TableOfContents.tsx
│   │   └── FileBrowser.tsx
│   ├── Header/
│   │   ├── Header.tsx
│   │   ├── ThemeSwitcher.tsx
│   │   └── FileControls.tsx
│   ├── Frontmatter/
│   │   ├── FrontmatterPanel.tsx
│   │   └── FrontmatterForm.tsx
│   ├── Modals/
│   │   ├── LinkModal.tsx
│   │   ├── ImageModal.tsx
│   │   └── SettingsModal.tsx
│   └── UI/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Dropdown.tsx
│       ├── Toggle.tsx
│       └── Tooltip.tsx
├── hooks/
│   ├── useFileSystem.ts            # File operations
│   ├── useTheme.ts                 # Theme switching
│   ├── useAutoSave.ts              # Debounced auto-save
│   ├── useFrontmatter.ts           # YAML parsing
│   └── useTableOfContents.ts       # TOC generation
├── stores/
│   ├── editorStore.ts              # Document state
│   ├── uiStore.ts                  # UI state (panels, modals)
│   └── settingsStore.ts            # User preferences
├── themes/
│   ├── base.css
│   ├── dark-basic.css
│   ├── light-basic.css
│   ├── dark-glass.css
│   └── light-glass.css
├── utils/
│   ├── markdown.ts                 # MD parsing/serialization
│   ├── frontmatter.ts              # YAML helpers
│   ├── fileHelpers.ts              # File path utilities
│   └── imageHelpers.ts             # Image processing
├── types/
│   └── index.ts                    # TypeScript definitions
└── App.tsx
```

### 3.3 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                     User Interaction                     │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    TipTap Editor                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  ProseMirror │───▶│   Document  │───▶│   Markdown  │  │
│  │    State     │    │    Model    │    │  Serializer │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Zustand Store                          │
│  • Current document content (markdown string)            │
│  • Frontmatter (parsed object)                           │
│  • File path / dirty state                               │
│  • Theme selection                                       │
│  • UI state (sidebar, modals, source view)               │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              File System Access API                      │
│  • Read .md files                                        │
│  • Write changes                                         │
│  • Manage assets folder                                  │
│  • Auto-save                                             │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Markdown Round-Trip Strategy

**Challenge:** Edits in rendered HTML must serialize back to clean markdown.

**Solution:** TipTap's markdown extension handles this via:
1. **Parse:** MD → ProseMirror document model (using remark)
2. **Edit:** User edits modify document model
3. **Serialize:** Document model → MD string

**Key Considerations:**
- Use remark/unified ecosystem for parsing (GFM support)
- Custom serializer rules for edge cases
- Preserve formatting choices where possible (e.g., `-` vs `*` for lists)
- Frontmatter separated before parsing, rejoined after serialization
- Test round-trip with complex documents

### 3.5 Frontmatter Processing

```
┌──────────────────────────────────────────────────────────┐
│                    .md File Contents                      │
│  ---                                                      │
│  title: My Doc                                            │
│  ---                                                      │
│  # Content here                                           │
└─────────────────────────┬────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Frontmatter Parser                          │
│  1. Detect --- delimiters                                │
│  2. Extract YAML block                                   │
│  3. Parse with yaml library                              │
│  4. Return { frontmatter: object, content: string }      │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│  Frontmatter Panel  │       │   TipTap Editor     │
│  (Form UI)          │       │   (Content only)    │
└─────────────────────┘       └─────────────────────┘
```

---

## 4. UI/UX Design

### 4.1 Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [☰]  RendMD  [file.md]              [◐ Theme ▾] [⚙] [Source]   │  <- Header
├──────┬───────────────────────────────────────────────────────────┤
│      │ ┌─ Frontmatter ──────────────────────────────────────┐    │
│ TOC  │ │ Title: My Document    Author: Name    Date: Today  │    │
│      │ └────────────────────────────────────────────────────┘    │
│ ───  │                                                           │
│ Intro│  # Document Title                                         │
│ Setup│                                                           │
│ Usage│  Your rendered markdown content appears here,             │
│  •Sub│  fully editable. Click any element to edit.               │
│      │                                                           │
│      │  | Column 1 | Column 2 |                                  │
│      │  |----------|----------|                                  │
│      │  | Cell     | Cell     |  <- Click to edit                │
│      │                                                           │
│      │  ![Image](./assets/photo.png)  <- Click for options       │
│      │                                                           │
└──────┴───────────────────────────────────────────────────────────┘
 ~200px                        flex-grow
```

### 4.2 With Source View Open

```
┌──────────────────────────────────────────────────────────────────┐
│  [☰]  RendMD  [file.md]              [◐ Theme ▾] [⚙] [Source ✓] │
├──────┬────────────────────────────────┬──────────────────────────┤
│      │                                │ ---                      │
│ TOC  │  # Document Title              │ title: My Document       │
│      │                                │ ---                      │
│ ───  │  Your rendered content...      │                          │
│ Intro│                                │ # Document Title         │
│ Setup│                                │                          │
│ Usage│                                │ Your rendered content... │
│      │                                │                          │
└──────┴────────────────────────────────┴──────────────────────────┘
 ~200px          ~50%                            ~50%
```

### 4.3 Interaction States

| Element | Default | Hover | Editing |
|---------|---------|-------|---------|
| Paragraph | Normal text | Subtle highlight | Blue border, cursor |
| Link | Accent color, underline | Darker, cursor pointer | Popover open |
| Table cell | Normal | Row highlight | Cell focused, blue border |
| Code block | Syntax colored | Slight lift shadow | Full editor mode |
| Image | Normal | Overlay with edit icon | Popover open |
| Frontmatter | Collapsed or card | Expand indicator | Form fields active |

### 4.4 Glassmorphism Design Notes

For glass themes:
- Background: Subtle gradient or image (user-configurable)
- Panels: `backdrop-filter: blur(12px)`, semi-transparent bg
- Cards: Elevated with soft shadows
- Borders: 1px semi-transparent white/black
- Avoid pure white/black text (use 90% opacity)
- Sidebar and header as floating glass panels
- Content area slightly more opaque for readability

### 4.5 Responsive Behavior

| Viewport | Sidebar | Source View | Layout |
|----------|---------|-------------|--------|
| Desktop (>1200px) | Visible, collapsible | Side-by-side option | Full features |
| Tablet (768-1200px) | Overlay/drawer | Bottom panel | Condensed toolbar |
| Mobile (<768px) | Hidden, hamburger | Separate view | Simplified UI |

---

## 5. Future Considerations

### 5.1 AI Writing Assistance (v1.1 Target)

A key differentiator: integrated AI assistance with BYOK (Bring Your Own Key) model.

#### Supported Providers
| Provider | Models | Notes |
|----------|--------|-------|
| OpenAI | GPT-4o, GPT-4o-mini | Most popular |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Haiku | Strong writing |
| Google | Gemini Pro, Gemini Flash | Good value |
| Ollama | Llama, Mistral, etc. | Local, private |
| OpenRouter | Any | Aggregator option |

#### AI Features
| Feature | Description | UI |
|---------|-------------|----|
| **Continue Writing** | Generate next paragraph(s) | Cursor position or selection |
| **Improve Writing** | Rewrite for clarity, tone, grammar | Selection → popup |
| **Summarize** | Condense selected text or document | Selection or command |
| **Expand** | Elaborate on a point | Selection → inline |
| **Translate** | Convert to another language | Selection → modal |
| **Explain** | Simplify or add context | Selection → popup |
| **Custom Prompt** | User-defined instruction | Command palette |

#### Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    AI Service Layer                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Provider   │    │   Request   │    │  Response   │  │
│  │  Adapters   │───▶│   Router    │───▶│  Handler    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Local Encrypted Key Storage                 │
│  • Keys never sent to our servers (there are none)       │
│  • Encrypted in localStorage or system keychain          │
│  • User manages their own API costs                      │
└─────────────────────────────────────────────────────────┘
```

#### Privacy Model
- **No backend required** - Direct API calls from browser
- **BYOK** - User provides and manages their own API keys
- **Local encryption** - Keys encrypted at rest
- **Transparent** - User sees exactly what's sent to AI
- **Optional** - AI features entirely opt-in

### 5.2 Other Future Features (Post-MVP)
- Collaborative editing (CRDT-based)
- Plugin system for custom extensions
- Cloud sync (optional, user's own storage)
- Mobile-responsive layout
- PWA support for offline use
- Custom themes marketplace
- Document templates
- Vim/Emacs keybindings (optional)
- Multiple document tabs
- Full-text search across files
- Version history / git integration

### 5.2 Deployment Options (Post-Local)
- Self-hosted Docker container
- Electron/Tauri desktop app
- Cloud-hosted SaaS (if demand exists)
- VS Code extension variant

---

## 6. Resolved Questions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Source view toggle? | Yes, hidden by default | Essential for power users, but rendered-first is the paradigm |
| Image handling | Both URL and local assets | Flexibility for different use cases |
| Frontmatter support | Yes, with form UI | Improves usability for metadata |

---

## Appendix A: Inspiration & References

- [Typora](https://typora.io) - Rendered-first editing, premium polish ($15 paid)
- [Notion](https://notion.so) - AI integration, UX patterns (SaaS, not true markdown)
- [Obsidian](https://obsidian.md) - Plugin ecosystem, local-first (not rendered-first)
- [Milkdown](https://milkdown.dev) - Open source markdown WYSIWYG, plugin architecture
- [Mark Text](https://marktext.app) - Open source Typora alternative (less maintained)
- [TipTap](https://tiptap.dev) - Editor framework documentation
- [ProseMirror](https://prosemirror.net) - Underlying editor technology

## Appendix C: Competitive Positioning

### Market Gap
RendMD fills a specific gap:

| Need | Typora | Notion | Obsidian | Milkdown | **RendMD** |
|------|--------|--------|----------|----------|------------|
| Rendered-first editing | ✅ | ❌ | ❌ | ✅ | ✅ |
| True markdown output | ✅ | ❌ | ✅ | ✅ | ✅ |
| Open source | ❌ | ❌ | ❌ | ✅ | ✅ |
| AI assistance | ❌ | ✅ | 🔌 | ❌ | ✅ (planned) |
| Premium polish | ✅ | ✅ | ✅ | ⚠️ | ✅ (goal) |
| No vendor lock-in | ✅ | ❌ | ✅ | ✅ | ✅ |
| Free | ❌ | ⚠️ | ⚠️ | ✅ | ✅ |

### Value Proposition
> **"Notion's intelligence. Typora's elegance. Your data. Open source."**

### Feature Philosophy: Strategically Complete

Not feature-dense. Not minimal. **Strategically complete:**

| Tier | Focus | Examples |
|------|-------|----------|
| **Core (v1.0)** | Flawless fundamentals | Editing, themes, files, navigation |
| **Power (v1.x)** | Key differentiators | AI assistance, advanced export |
| **Extensible (v2.0)** | Community growth | Plugin API, theme marketplace |

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| Rendered-first | Editing paradigm where the visual output is the primary editing surface |
| Frontmatter | YAML metadata block at the start of a markdown file |
| Round-trip | Converting MD → HTML → MD without losing information |
| Glassmorphism | UI design trend using frosted glass effects |
| TipTap | React-friendly wrapper around ProseMirror editor |
| GFM | GitHub Flavored Markdown - extended markdown syntax |
