# RendMD - Copilot Instructions

> **Project:** RendMD - The thinking person's markdown editor  
> **Tagline:** Intelligent. Elegant. Your data. Open source.

---

## Project Overview

RendMD is a **rendered-first markdown editor** that lets users edit documents from their beautifully rendered state rather than raw source. It combines the portability of markdown files with the visual editing experience of modern document processors.

### Philosophy
> "Make markdown a more accessible format for the everyday writer, developer, or anyone who uses a computer, in an elegant open source package."

### Key Differentiators
- **Rendered-first editing** - Edit the beautiful output, not raw text
- **True markdown output** - Files are portable `.md`, not proprietary
- **AI assistance (v1.1)** - BYOK model with multiple providers
- **Premium open source** - Typora quality, free and open

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 18.x |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| Editor Core | TipTap | 2.x |
| Styling | Tailwind CSS | 3.x |
| State | Zustand | 4.x |
| Icons | Lucide React | latest |
| Code Highlighting | Shiki | 1.x |

---

## Project Structure

```
src/
├── components/
│   ├── Editor/           # TipTap editor, toolbar, bubble menu
│   ├── Sidebar/          # TOC, file browser
│   ├── Header/           # App header, theme switcher
│   ├── Frontmatter/      # YAML metadata panel
│   ├── Modals/           # Link, image, settings modals
│   └── UI/               # Reusable UI primitives
├── hooks/                # Custom React hooks
├── stores/               # Zustand state stores
├── themes/               # CSS theme files
├── utils/                # Helper functions
├── types/                # TypeScript definitions
└── App.tsx
```

---

## Coding Standards

### TypeScript
- **Strict mode enabled** - No implicit any
- **Explicit return types** on exported functions
- **Interface over type** for object shapes (unless union needed)
- **Descriptive names** - No single-letter variables except loops

```typescript
// ✅ Good
interface EditorState {
  content: string;
  isDirty: boolean;
  filePath: string | null;
}

export function parseMarkdown(source: string): ParsedDocument {
  // ...
}

// ❌ Bad
type ES = { c: string; d: boolean; f: string | null };
export const parse = (s) => { /* ... */ };
```

### React Components
- **Functional components only** - No class components
- **Named exports** - Avoid default exports (except pages/routes)
- **Props interface** - Define explicitly, suffix with `Props`
- **Destructure props** in function signature

```typescript
// ✅ Good
interface EditorToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  disabled?: boolean;
}

export function EditorToolbar({ onBold, onItalic, disabled = false }: EditorToolbarProps) {
  return (/* ... */);
}

// ❌ Bad
export default function Toolbar(props) {
  return (/* ... */);
}
```

### Hooks
- **Prefix with `use`** - `useFileSystem`, `useTheme`
- **Single responsibility** - One hook, one purpose
- **Return object for multiple values** - Easier to extend

```typescript
// ✅ Good
export function useAutoSave(content: string, filePath: string | null) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // ...
  
  return { isSaving, lastSaved, saveNow };
}
```

### State Management (Zustand)
- **Slice pattern** for large stores
- **Selectors** for derived state
- **Actions** as store methods

```typescript
// ✅ Good
interface EditorStore {
  content: string;
  isDirty: boolean;
  setContent: (content: string) => void;
  markClean: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  content: '',
  isDirty: false,
  setContent: (content) => set({ content, isDirty: true }),
  markClean: () => set({ isDirty: false }),
}));
```

### Styling (Tailwind)
- **Use CSS variables** for theming (defined in theme files)
- **Semantic class grouping** - Layout, then spacing, then visual
- **Extract components** when Tailwind strings get long

```tsx
// ✅ Good - Using theme variables
<button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] rounded-md hover:bg-[var(--color-accent-hover)] transition-colors">

// ✅ Good - Extracted for reuse
const buttonStyles = "flex items-center gap-2 px-4 py-2 rounded-md transition-colors";
```

### File Naming
- **Components:** PascalCase - `EditorToolbar.tsx`
- **Hooks:** camelCase with use prefix - `useFileSystem.ts`
- **Utils:** camelCase - `markdownHelpers.ts`
- **Types:** camelCase or PascalCase - `types.ts` or `EditorTypes.ts`
- **CSS:** kebab-case - `dark-basic.css`

---

## Architecture Patterns

### Editor Data Flow
```
User Edit → TipTap/ProseMirror → Document Model → Markdown Serializer → Store → File System
```

### Theme System
- CSS variables defined in theme files
- Theme class applied to `<html>` element
- Components use `var(--color-*)` references
- Theme preference stored in localStorage

### File Operations
- Use File System Access API when available
- Fallback to `<input type="file">` + download
- Auto-save with 2-second debounce
- Track dirty state for unsaved changes indicator

### Frontmatter Handling
1. On file load: Extract YAML between `---` delimiters
2. Parse with `yaml` library
3. Pass content (without frontmatter) to editor
4. On save: Serialize frontmatter + content back together

---

## Component Guidelines

### Editor Components
- TipTap extensions go in `components/Editor/extensions/`
- Each extension is a folder with `index.ts` + supporting files
- Bubble menu appears on text selection
- Floating menu appears on empty lines (optional)

### UI Components
- Build on Radix UI primitives where possible
- Support keyboard navigation
- Include proper ARIA attributes
- Support all four themes

### Modals
- Use a modal manager or portal
- Trap focus when open
- Close on Escape key
- Close on backdrop click (configurable)

---

## Testing Approach

### Unit Tests
- Test utility functions thoroughly
- Test hooks with `@testing-library/react-hooks`
- Mock TipTap editor for component tests

### Integration Tests
- Test markdown round-trip (parse → edit → serialize)
- Test file operations with mock File System API
- Test theme switching

### Manual Testing
- Test with complex markdown documents
- Test all four themes
- Test keyboard navigation
- Cross-browser: Chrome, Firefox, Edge

---

## Common Tasks

### Adding a New TipTap Extension
1. Create folder in `components/Editor/extensions/`
2. Define the extension using TipTap's API
3. Register in main editor configuration
4. Add toolbar/menu controls if needed
5. Ensure markdown serialization works

### Adding a New Theme
1. Create CSS file in `themes/` directory
2. Define all CSS variables (copy from existing theme)
3. Add to theme list in `useTheme` hook
4. Test all components in new theme

### Adding a New Keyboard Shortcut
1. Define in TipTap extension or editor config
2. Add to shortcuts documentation
3. Include in help modal (Ctrl+?)

---

## AI Integration Notes (v1.1)

When implementing AI features:
- All API calls happen client-side (no backend)
- Keys stored encrypted in localStorage
- Support streaming responses for better UX
- Always show what's being sent to AI (transparency)
- Graceful degradation when no API key configured

### Provider Adapter Pattern
```typescript
interface AIProvider {
  name: string;
  generateCompletion(prompt: string, options: AIOptions): Promise<AIResponse>;
  streamCompletion(prompt: string, options: AIOptions): AsyncIterable<string>;
}
```

---

## Documentation

### Code Comments
- **Why, not what** - Explain reasoning, not mechanics
- **JSDoc for exports** - Document public APIs
- **TODO format:** `// TODO(username): Description`

### Commit Messages
- **Conventional commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- **Present tense:** "Add feature" not "Added feature"
- **Reference issues:** `feat: add table editing (#123)`

---

## Quick Reference

### Key Files
| Purpose | File |
|---------|------|
| App entry | `src/App.tsx` |
| Editor component | `src/components/Editor/Editor.tsx` |
| Editor store | `src/stores/editorStore.ts` |
| Theme hook | `src/hooks/useTheme.ts` |
| File system hook | `src/hooks/useFileSystem.ts` |
| Base theme variables | `src/themes/base.css` |

### Important Dependencies
| Package | Purpose |
|---------|---------|
| `@tiptap/react` | React bindings for TipTap |
| `@tiptap/starter-kit` | Basic editor functionality |
| `@tiptap/extension-*` | Additional TipTap features |
| `tiptap-markdown` | Markdown import/export |
| `shiki` | Syntax highlighting |
| `yaml` | Frontmatter parsing |
| `zustand` | State management |
| `lucide-react` | Icons |

### Keyboard Shortcuts (Default)
| Action | Shortcut |
|--------|----------|
| Save | Ctrl+S |
| Open | Ctrl+O |
| Bold | Ctrl+B |
| Italic | Ctrl+I |
| Code | Ctrl+` |
| Link | Ctrl+K |
| Toggle source | Ctrl+/ |
| Heading 1-6 | Ctrl+1 to Ctrl+6 |

---

## Getting Help

- **Design decisions:** See `docs/DESIGN_DOCUMENT.md`
- **Project plan:** See `docs/PROJECT_PLAN.md`
- **Past decisions:** See `docs/PROJECT_CHRONICLE.md`
- **TipTap docs:** https://tiptap.dev/docs
- **ProseMirror guide:** https://prosemirror.net/docs/guide/
