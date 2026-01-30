# Builder Agent - Phase 0 Handoff

> **Project:** RendMD - The thinking person's markdown editor  
> **Phase:** 0 - Foundation  
> **Date:** 2026-01-29  
> **Prerequisite:** Reviewer has initialized git repository

---

## Your Mission

You are the **Builder** agent. Your task is to scaffold the Vite + React + TypeScript project and implement the foundation for Phase 0.

---

## Pre-Flight Check

Confirm Reviewer has completed:
- [x] Git repository initialized at `L:\RendMD`
- [x] `.gitignore` exists
- [x] `README.md` exists
- [x] 2 commits in history

**Verified on 2026-01-29:**
```
e5dbed2 (HEAD -> master) chore: add project infrastructure
903b743 docs: initial project documentation
```

**VS Code workspace configured:**
- [.vscode/settings.json](.vscode/settings.json) - Prettier, ESLint, Tailwind
- [.vscode/extensions.json](.vscode/extensions.json) - Recommended extensions

---

## Task 1: Scaffold Vite Project

### Create Vite Project

```powershell
npm create vite@latest . -- --template react-ts
```

> **Note:** The `.` installs in current directory. Say "yes" to install in non-empty directory.

### Install Core Dependencies

```powershell
npm install

# TipTap Editor
npm install @tiptap/react @tiptap/starter-kit @tiptap/pm @tiptap/extension-placeholder

# Markdown support
npm install tiptap-markdown

# State management
npm install zustand

# Icons
npm install lucide-react

# Utilities
npm install clsx tailwind-merge

# YAML parsing (for frontmatter)
npm install yaml
```

### Install Dev Dependencies

```powershell
# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Code quality
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier eslint-config-prettier eslint-plugin-react-hooks

# Types
npm install -D @types/node
```

---

## Task 2: Configure Tailwind CSS

### Update `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme colors will be CSS variables
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
      },
      fontFamily: {
        body: 'var(--font-family-body)',
        heading: 'var(--font-family-heading)',
        mono: 'var(--font-family-mono)',
      },
    },
  },
  plugins: [],
}
```

### Update `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Base theme variables - Dark Basic (default) */
:root {
  /* Colors */
  --color-bg-primary: #0d1117;
  --color-bg-secondary: #161b22;
  --color-bg-tertiary: #21262d;
  --color-text-primary: #e6edf3;
  --color-text-secondary: #8b949e;
  --color-text-muted: #6e7681;
  --color-accent: #58a6ff;
  --color-accent-hover: #79b8ff;
  --color-border: #30363d;
  --color-border-subtle: #21262d;

  /* Semantic Colors */
  --color-success: #3fb950;
  --color-warning: #d29922;
  --color-error: #f85149;
  --color-info: #58a6ff;

  /* Typography */
  --font-family-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-heading: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  --font-size-base: 16px;
  --line-height-body: 1.6;
  --line-height-heading: 1.3;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

/* Global styles */
html {
  font-size: var(--font-size-base);
  line-height: var(--line-height-body);
}

body {
  font-family: var(--font-family-body);
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  margin: 0;
  min-height: 100vh;
}

/* Scrollbar styling (dark theme) */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}
```

---

## Task 3: Configure TypeScript Path Aliases

### Update `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Update `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

## Task 4: Create Project Structure

### Create Folder Structure

```powershell
# Create directories
mkdir src/components/Editor
mkdir src/components/Sidebar
mkdir src/components/Header
mkdir src/components/Frontmatter
mkdir src/components/Modals
mkdir src/components/UI
mkdir src/hooks
mkdir src/stores
mkdir src/utils
mkdir src/types
mkdir src/themes
```

### Create Type Definitions

Create `src/types/index.ts`:

```typescript
// Editor types
export interface EditorState {
  content: string;
  isDirty: boolean;
  filePath: string | null;
  fileName: string | null;
}

// Frontmatter types
export interface Frontmatter {
  title?: string;
  author?: string;
  date?: string;
  tags?: string[];
  theme?: ThemeName;
  [key: string]: unknown;
}

// Theme types
export type ThemeName = 'dark-basic' | 'light-basic' | 'dark-glass' | 'light-glass';

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  isDark: boolean;
}

// Document types
export interface ParsedDocument {
  frontmatter: Frontmatter | null;
  content: string;
  raw: string;
}

// UI types
export interface SidebarState {
  isOpen: boolean;
  activePanel: 'toc' | 'files' | null;
}

// File types
export interface FileInfo {
  name: string;
  path: string;
  handle?: FileSystemFileHandle;
}
```

---

## Task 5: Create Zustand Store

Create `src/stores/editorStore.ts`:

```typescript
import { create } from 'zustand';
import type { EditorState, Frontmatter, ThemeName, SidebarState } from '@/types';

interface EditorStore extends EditorState {
  // Content actions
  setContent: (content: string) => void;
  markClean: () => void;
  markDirty: () => void;

  // File actions
  setFilePath: (path: string | null, name: string | null) => void;
  
  // Frontmatter
  frontmatter: Frontmatter | null;
  setFrontmatter: (frontmatter: Frontmatter | null) => void;
  
  // Theme
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  
  // Sidebar
  sidebar: SidebarState;
  toggleSidebar: () => void;
  setSidebarPanel: (panel: 'toc' | 'files' | null) => void;
  
  // Source view
  showSource: boolean;
  toggleSource: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  // Initial state
  content: '',
  isDirty: false,
  filePath: null,
  fileName: null,
  frontmatter: null,
  theme: 'dark-basic',
  sidebar: {
    isOpen: true,
    activePanel: 'toc',
  },
  showSource: false,

  // Content actions
  setContent: (content) => set({ content, isDirty: true }),
  markClean: () => set({ isDirty: false }),
  markDirty: () => set({ isDirty: true }),

  // File actions
  setFilePath: (path, name) => set({ filePath: path, fileName: name }),

  // Frontmatter
  setFrontmatter: (frontmatter) => set({ frontmatter }),

  // Theme
  setTheme: (theme) => set({ theme }),

  // Sidebar
  toggleSidebar: () => set((state) => ({
    sidebar: { ...state.sidebar, isOpen: !state.sidebar.isOpen }
  })),
  setSidebarPanel: (panel) => set((state) => ({
    sidebar: { ...state.sidebar, activePanel: panel }
  })),

  // Source view
  toggleSource: () => set((state) => ({ showSource: !state.showSource })),
}));
```

---

## Task 6: Create Utility Functions

Create `src/utils/cn.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

Create `src/utils/frontmatter.ts`:

```typescript
import { parse, stringify } from 'yaml';
import type { Frontmatter, ParsedDocument } from '@/types';

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;

/**
 * Parse a markdown document and extract frontmatter
 */
export function parseDocument(raw: string): ParsedDocument {
  const match = raw.match(FRONTMATTER_REGEX);
  
  if (!match) {
    return {
      frontmatter: null,
      content: raw,
      raw,
    };
  }

  try {
    const frontmatter = parse(match[1]) as Frontmatter;
    const content = raw.slice(match[0].length);
    
    return {
      frontmatter,
      content,
      raw,
    };
  } catch (error) {
    console.warn('Failed to parse frontmatter:', error);
    return {
      frontmatter: null,
      content: raw,
      raw,
    };
  }
}

/**
 * Serialize frontmatter and content back to markdown
 */
export function serializeDocument(frontmatter: Frontmatter | null, content: string): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return content;
  }

  const yamlString = stringify(frontmatter, { lineWidth: 0 });
  return `---\n${yamlString}---\n\n${content}`;
}
```

---

## Task 7: Create Basic Layout Components

Create `src/components/Header/Header.tsx`:

```typescript
import { Menu, Moon, Settings, Code } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/utils/cn';

export function Header() {
  const { fileName, isDirty, showSource, toggleSidebar, toggleSource } = useEditorStore();

  return (
    <header className="h-12 bg-bg-secondary border-b border-border flex items-center justify-between px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} className="text-text-secondary" />
        </button>
        
        <span className="font-semibold text-text-primary">RendMD</span>
        
        {fileName && (
          <span className="text-text-secondary text-sm flex items-center gap-1">
            <span className="text-text-muted">•</span>
            {fileName}
            {isDirty && <span className="text-accent">•</span>}
          </span>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        <button
          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors"
          aria-label="Toggle dark mode"
        >
          <Moon size={18} className="text-text-secondary" />
        </button>
        
        <button
          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} className="text-text-secondary" />
        </button>
        
        <button
          onClick={toggleSource}
          className={cn(
            "p-1.5 rounded transition-colors",
            showSource ? "bg-accent/20 text-accent" : "hover:bg-bg-tertiary text-text-secondary"
          )}
          aria-label="Toggle source view"
        >
          <Code size={18} />
        </button>
      </div>
    </header>
  );
}
```

Create `src/components/Header/index.ts`:

```typescript
export { Header } from './Header';
```

Create `src/components/Sidebar/Sidebar.tsx`:

```typescript
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/utils/cn';

export function Sidebar() {
  const { sidebar } = useEditorStore();

  if (!sidebar.isOpen) return null;

  return (
    <aside className={cn(
      "w-56 bg-bg-secondary border-r border-border",
      "flex flex-col"
    )}>
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Table of Contents
        </h2>
      </div>
      
      <nav className="flex-1 p-2 overflow-y-auto">
        {/* TOC items will be generated from document headings */}
        <p className="text-text-muted text-sm p-2">
          No headings found
        </p>
      </nav>
    </aside>
  );
}
```

Create `src/components/Sidebar/index.ts`:

```typescript
export { Sidebar } from './Sidebar';
```

---

## Task 8: Create Basic Editor Component

Create `src/components/Editor/Editor.tsx`:

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { useEditorStore } from '@/stores/editorStore';
import { useEffect } from 'react';

const INITIAL_CONTENT = `# Welcome to RendMD

**The thinking person's markdown editor.**

> *Intelligent. Elegant. Your data. Open source.*

Start typing to edit this document. This is a **rendered-first** editor, which means you're editing the beautiful output directly—not raw markdown.

## Features

- **Bold** and *italic* text
- [Links](https://example.com)
- Lists and more

### Try it out!

1. Click anywhere to start editing
2. Select text to see formatting options
3. Use keyboard shortcuts (Ctrl+B for bold, etc.)

---

*Built with ❤️ for writers, developers, and thinkers everywhere.*
`;

export function Editor() {
  const { content, setContent, showSource } = useEditorStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: content || INITIAL_CONTENT,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown();
      setContent(markdown);
    },
  });

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && content && editor.storage.markdown.getMarkdown() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Rendered editor */}
      <div className={showSource ? 'w-1/2 border-r border-border' : 'w-full'}>
        <div className="h-full overflow-y-auto p-8">
          <EditorContent 
            editor={editor} 
            className="max-w-3xl mx-auto"
          />
        </div>
      </div>

      {/* Source view */}
      {showSource && (
        <div className="w-1/2 bg-bg-secondary">
          <div className="h-full overflow-y-auto p-4">
            <pre className="text-sm font-mono text-text-secondary whitespace-pre-wrap">
              {content || INITIAL_CONTENT}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
```

Create `src/components/Editor/index.ts`:

```typescript
export { Editor } from './Editor';
```

---

## Task 9: Create App Layout

Update `src/App.tsx`:

```typescript
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';

function App() {
  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Editor />
        </main>
      </div>
    </div>
  );
}

export default App;
```

Update `src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

## Task 10: Add Editor Styles

Add to `src/index.css` (after existing content):

```css
/* TipTap Editor Styles */
.ProseMirror {
  outline: none;
}

.ProseMirror p {
  margin: 1em 0;
}

.ProseMirror h1 {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: var(--line-height-heading);
  margin: 1.5rem 0 1rem;
  color: var(--color-text-primary);
}

.ProseMirror h2 {
  font-size: 1.75rem;
  font-weight: 600;
  line-height: var(--line-height-heading);
  margin: 1.5rem 0 0.75rem;
  color: var(--color-text-primary);
}

.ProseMirror h3 {
  font-size: 1.375rem;
  font-weight: 600;
  line-height: var(--line-height-heading);
  margin: 1.25rem 0 0.5rem;
  color: var(--color-text-primary);
}

.ProseMirror h4, .ProseMirror h5, .ProseMirror h6 {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: var(--line-height-heading);
  margin: 1rem 0 0.5rem;
  color: var(--color-text-primary);
}

.ProseMirror strong {
  font-weight: 600;
}

.ProseMirror em {
  font-style: italic;
}

.ProseMirror a {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ProseMirror a:hover {
  color: var(--color-accent-hover);
}

.ProseMirror code {
  font-family: var(--font-family-mono);
  font-size: 0.9em;
  background: var(--color-bg-tertiary);
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

.ProseMirror pre {
  font-family: var(--font-family-mono);
  background: var(--color-bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1rem 0;
}

.ProseMirror pre code {
  background: none;
  padding: 0;
}

.ProseMirror blockquote {
  border-left: 3px solid var(--color-accent);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--color-text-secondary);
  font-style: italic;
}

.ProseMirror ul, .ProseMirror ol {
  padding-left: 1.5rem;
  margin: 1rem 0;
}

.ProseMirror li {
  margin: 0.25rem 0;
}

.ProseMirror hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 2rem 0;
}

/* Placeholder styling */
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--color-text-muted);
  pointer-events: none;
  height: 0;
}
```

---

## Task 11: Test and Commit

### Run Development Server

```powershell
npm run dev
```

Verify:
- [ ] App loads without errors
- [ ] Dark theme is applied
- [ ] Editor shows welcome content
- [ ] Can type and edit text
- [ ] Source toggle shows markdown
- [ ] Sidebar toggle works

### Commit Phase 0 Foundation

```powershell
git add .
git commit -m "feat: implement Phase 0 foundation

- Scaffold Vite + React + TypeScript project
- Configure Tailwind CSS with CSS variables
- Implement dark basic theme
- Set up TipTap editor with markdown support
- Create Zustand store for state management
- Build basic layout (Header, Sidebar, Editor)
- Add source view toggle
- Create utility functions (cn, frontmatter parsing)

Phase 0 complete - basic editing works"
```

---

## Reference Documents

- `docs/DESIGN_DOCUMENT.md` - Technical spec, color palettes, UI mockups
- `docs/PROJECT_PLAN.md` - Phase 0 tasks checklist
- `.github/copilot-instructions.md` - Coding standards

---

## Success Criteria

1. `npm run dev` starts without errors
2. Can type in editor and see formatted output
3. Markdown serializes correctly (check source view)
4. Dark theme looks intentional and matches spec
5. Header shows file name and dirty state
6. Sidebar toggles open/closed
7. Source view toggles and shows markdown

---

## Handoff Notes for Reviewer

After completing these tasks, Reviewer should:
1. Verify all success criteria
2. Test markdown round-trip with complex content
3. Check TypeScript types are correct (no `any`)
4. Validate folder structure matches architecture
5. Review commit messages follow conventional commits

---

**You are Builder. Confirm Reviewer prerequisites, then begin with Task 1.**
