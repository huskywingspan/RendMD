# Builder Handoff: Phase 1.5 - Polish & Enhancements

> **Phase:** 1.5  
> **Goal:** Syntax highlighting, theme system, and code block polish  
> **Prerequisites:** Phase 1 complete  
> **Estimated Steps:** 4 (consolidated for efficiency)

---

## Context

Phase 1 delivered core editing. Phase 1.5 adds the polish that makes RendMD feel premium:
- Code blocks that actually highlight syntax (Shiki)
- Theme switching between all four planned themes
- Small UX wins (copy button, language labels)

**Bundle Size Note:** Shiki adds ~300KB+ to bundle. This is acceptable for now; optimization is Phase 5.

---

## Step 1: Theme System Foundation

**Task:** Create `useTheme` hook, define all four theme CSS files, wire up persistence.

### Create useTheme Hook

Create `src/hooks/useTheme.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { ThemeName } from '@/types';

const THEME_STORAGE_KEY = 'rendmd-theme';
const DEFAULT_THEME: ThemeName = 'dark-basic';

export interface UseThemeReturn {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleDarkLight: () => void;
  isDark: boolean;
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidTheme(stored)) {
      return stored as ThemeName;
    }
    return DEFAULT_THEME;
  });

  const isDark = theme.startsWith('dark');

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('dark-basic', 'light-basic', 'dark-glass', 'light-glass');
    
    // Add current theme class
    root.classList.add(theme);
    
    // Persist to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
  }, []);

  const toggleDarkLight = useCallback(() => {
    setThemeState((current) => {
      const isGlass = current.includes('glass');
      const isDarkNow = current.startsWith('dark');
      
      if (isGlass) {
        return isDarkNow ? 'light-glass' : 'dark-glass';
      }
      return isDarkNow ? 'light-basic' : 'dark-basic';
    });
  }, []);

  return { theme, setTheme, toggleDarkLight, isDark };
}

function isValidTheme(value: string): value is ThemeName {
  return ['dark-basic', 'light-basic', 'dark-glass', 'light-glass'].includes(value);
}
```

### Create hooks/index.ts

Create `src/hooks/index.ts`:

```typescript
export { useTheme } from './useTheme';
export type { UseThemeReturn } from './useTheme';
```

### Define Theme CSS Files

Create `src/themes/dark-basic.css`:

```css
/* Dark Basic Theme - Clean, high contrast, professional */
.dark-basic {
  --theme-bg-primary: #0d1117;
  --theme-bg-secondary: #161b22;
  --theme-bg-tertiary: #21262d;
  --theme-text-primary: #e6edf3;
  --theme-text-secondary: #8b949e;
  --theme-text-muted: #6e7681;
  --theme-accent: #58a6ff;
  --theme-accent-hover: #79b8ff;
  --theme-border: #30363d;
  --theme-border-subtle: #21262d;
  
  /* Code highlighting background */
  --theme-code-bg: #161b22;
}
```

Create `src/themes/light-basic.css`:

```css
/* Light Basic Theme - Clean, professional, high readability */
.light-basic {
  --theme-bg-primary: #ffffff;
  --theme-bg-secondary: #f6f8fa;
  --theme-bg-tertiary: #eaeef2;
  --theme-text-primary: #1f2328;
  --theme-text-secondary: #656d76;
  --theme-text-muted: #8b949e;
  --theme-accent: #0969da;
  --theme-accent-hover: #0550ae;
  --theme-border: #d0d7de;
  --theme-border-subtle: #eaeef2;
  
  /* Code highlighting background */
  --theme-code-bg: #f6f8fa;
  
  /* Scrollbar adjustments for light theme */
  color-scheme: light;
}

.light-basic ::-webkit-scrollbar-track {
  background: var(--theme-bg-secondary);
}

.light-basic ::-webkit-scrollbar-thumb {
  background: var(--theme-border);
}

.light-basic ::-webkit-scrollbar-thumb:hover {
  background: var(--theme-text-muted);
}
```

Create `src/themes/dark-glass.css`:

```css
/* Dark Glass Theme - Glassmorphism, modern, premium feel */
.dark-glass {
  --theme-bg-primary: #0a0a0f;
  --theme-bg-secondary: rgba(22, 27, 34, 0.8);
  --theme-bg-tertiary: rgba(33, 38, 45, 0.8);
  --theme-text-primary: #e6edf3;
  --theme-text-secondary: #8b949e;
  --theme-text-muted: #6e7681;
  --theme-accent: #7c3aed;
  --theme-accent-hover: #8b5cf6;
  --theme-border: rgba(139, 148, 158, 0.2);
  --theme-border-subtle: rgba(139, 148, 158, 0.1);
  
  /* Code highlighting background */
  --theme-code-bg: rgba(22, 27, 34, 0.9);
  
  /* Glass effects */
  --glass-blur: 12px;
  --glass-saturation: 180%;
}

.dark-glass .glass-panel {
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
}
```

Create `src/themes/light-glass.css`:

```css
/* Light Glass Theme - Glassmorphism, airy, elegant */
.light-glass {
  --theme-bg-primary: #f0f4f8;
  --theme-bg-secondary: rgba(255, 255, 255, 0.7);
  --theme-bg-tertiary: rgba(255, 255, 255, 0.5);
  --theme-text-primary: #1a202c;
  --theme-text-secondary: #4a5568;
  --theme-text-muted: #718096;
  --theme-accent: #6366f1;
  --theme-accent-hover: #4f46e5;
  --theme-border: rgba(0, 0, 0, 0.1);
  --theme-border-subtle: rgba(0, 0, 0, 0.05);
  
  /* Code highlighting background */
  --theme-code-bg: rgba(255, 255, 255, 0.8);
  
  /* Glass effects */
  --glass-blur: 12px;
  --glass-saturation: 120%;
  
  color-scheme: light;
}

.light-glass .glass-panel {
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturation));
}

.light-glass ::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.3);
}

.light-glass ::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
}
```

Create `src/themes/index.css`:

```css
/* Theme imports - all themes in one file */
@import './dark-basic.css';
@import './light-basic.css';
@import './dark-glass.css';
@import './light-glass.css';
```

### Update index.css to Import Themes

Add to the top of `src/index.css` (after tailwind import):

```css
@import './themes/index.css';
```

Also update the `:root` section to be a fallback (the theme classes will override):

```css
/* Base/fallback variables - overridden by theme classes */
:root {
  /* Keep existing variables as fallback */
}
```

### Remove .gitkeep from hooks folder

Delete `src/hooks/.gitkeep` since we now have actual files.

**Handoff:** Tell Reviewer: *"Step 1 complete. Theme system with useTheme hook and all four theme CSS files. Please verify theme switching works."*

---

## Step 2: Wire Theme Toggle to Header

**Task:** Connect the Moon button in Header to toggle themes, add theme dropdown.

### Update Header Component

Replace `src/components/Header/Header.tsx`:

```typescript
import { useState, useRef, useEffect } from 'react';
import { Menu, Moon, Sun, Settings, Code, ChevronDown, Check } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useTheme } from '@/hooks';
import { cn } from '@/utils/cn';
import type { ThemeName } from '@/types';

const THEME_OPTIONS: { value: ThemeName; label: string; icon: 'sun' | 'moon' }[] = [
  { value: 'dark-basic', label: 'Dark', icon: 'moon' },
  { value: 'light-basic', label: 'Light', icon: 'sun' },
  { value: 'dark-glass', label: 'Dark Glass', icon: 'moon' },
  { value: 'light-glass', label: 'Light Glass', icon: 'sun' },
];

export function Header(): JSX.Element {
  const { fileName, isDirty, showSource, toggleSidebar, toggleSource } = useEditorStore();
  const { theme, setTheme, toggleDarkLight, isDark } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-12 bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-border)] flex items-center justify-between px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} className="text-[var(--theme-text-secondary)]" />
        </button>
        
        <span className="font-semibold text-[var(--theme-text-primary)]">RendMD</span>
        
        {fileName && (
          <span className="text-[var(--theme-text-secondary)] text-sm flex items-center gap-1">
            <span className="text-[var(--theme-text-muted)]">•</span>
            {fileName}
            {isDirty && <span className="text-[var(--theme-accent)]">•</span>}
          </span>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        {/* Theme toggle with dropdown */}
        <div className="relative" ref={themeMenuRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="flex items-center gap-1 p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            aria-label="Theme settings"
          >
            {isDark ? (
              <Moon size={18} className="text-[var(--theme-text-secondary)]" />
            ) : (
              <Sun size={18} className="text-[var(--theme-text-secondary)]" />
            )}
            <ChevronDown size={14} className="text-[var(--theme-text-muted)]" />
          </button>
          
          {showThemeMenu && (
            <div className="absolute right-0 top-full mt-1 py-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg shadow-lg min-w-[160px] z-50">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setShowThemeMenu(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--theme-bg-tertiary)] transition-colors",
                    theme === option.value && "text-[var(--theme-accent)]"
                  )}
                >
                  {option.icon === 'moon' ? <Moon size={14} /> : <Sun size={14} />}
                  <span className="flex-1">{option.label}</span>
                  {theme === option.value && <Check size={14} />}
                </button>
              ))}
              
              <div className="border-t border-[var(--theme-border)] mt-1 pt-1">
                <button
                  onClick={() => {
                    toggleDarkLight();
                    setShowThemeMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--theme-bg-tertiary)] transition-colors text-[var(--theme-text-secondary)]"
                >
                  <span className="flex-1">Quick Toggle</span>
                  <kbd className="text-xs bg-[var(--theme-bg-tertiary)] px-1.5 py-0.5 rounded">⌘D</kbd>
                </button>
              </div>
            </div>
          )}
        </div>
        
        <button
          className="p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} className="text-[var(--theme-text-secondary)]" />
        </button>
        
        <button
          onClick={toggleSource}
          className={cn(
            "p-1.5 rounded transition-colors",
            showSource 
              ? "bg-[var(--theme-accent)]/20 text-[var(--theme-accent)]" 
              : "hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]"
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

### Add Global Keyboard Shortcut for Theme Toggle

Add to `src/App.tsx` (or create a keyboard hook):

```typescript
import { useEffect } from 'react';
import { useTheme } from '@/hooks';

// Inside App component:
const { toggleDarkLight } = useTheme();

useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    // Cmd/Ctrl + D for dark/light toggle
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault();
      toggleDarkLight();
    }
  }
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleDarkLight]);
```

**Handoff:** Tell Reviewer: *"Step 2 complete. Theme toggle in header with dropdown menu and Cmd+D shortcut. Please test all four themes and persistence."*

---

## Step 3: Shiki Syntax Highlighting

**Task:** Install Shiki, create custom TipTap extension for highlighted code blocks.

### Install Shiki

```bash
npm install shiki
```

### Create Shiki Code Block Extension

Create `src/components/Editor/extensions/ShikiCodeBlock.ts`:

```typescript
import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// We'll use a simpler approach: style the code block and 
// apply Shiki highlighting via a React component wrapper

export const ShikiCodeBlock = Node.create({
  name: 'codeBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,

  addAttributes() {
    return {
      language: {
        default: null,
        parseHTML: element => {
          const classAttr = element.firstElementChild?.getAttribute('class');
          if (classAttr) {
            const match = classAttr.match(/language-(\w+)/);
            return match ? match[1] : null;
          }
          return null;
        },
        renderHTML: attributes => {
          if (!attributes.language) return {};
          return {
            'data-language': attributes.language,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'code-block' }),
      ['code', {}, 0],
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
      // Tab within code block inserts actual tab
      Tab: () => {
        if (this.editor.isActive('codeBlock')) {
          return this.editor.commands.insertContent('\t');
        }
        return false;
      },
    };
  },
});
```

### Create CodeBlockComponent with Shiki

Create `src/components/Editor/CodeBlockComponent.tsx`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { Copy, Check, ChevronDown } from 'lucide-react';
import { codeToHtml } from 'shiki';

const COMMON_LANGUAGES = [
  'javascript', 'typescript', 'python', 'rust', 'go', 'java', 
  'html', 'css', 'json', 'yaml', 'markdown', 'bash', 'sql',
  'c', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin'
];

export function CodeBlockComponent({ node, updateAttributes, extension }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);
  
  const language = node.attrs.language || 'text';
  const code = node.textContent;

  // Apply Shiki highlighting
  useEffect(() => {
    let cancelled = false;
    
    async function highlight() {
      try {
        const html = await codeToHtml(code, {
          lang: language === 'text' ? 'plaintext' : language,
          theme: 'github-dark', // We'll make this dynamic with theme later
        });
        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch (e) {
        // Language not supported, fall back to plain
        if (!cancelled) {
          setHighlightedHtml('');
        }
      }
    }
    
    highlight();
    return () => { cancelled = true; };
  }, [code, language]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleLanguageSelect = useCallback((lang: string) => {
    updateAttributes({ language: lang });
    setShowLangMenu(false);
  }, [updateAttributes]);

  return (
    <NodeViewWrapper className="code-block-wrapper relative my-4 group">
      {/* Toolbar */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {/* Language selector */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded hover:bg-[var(--theme-border)] transition-colors"
          >
            {language}
            <ChevronDown size={12} />
          </button>
          
          {showLangMenu && (
            <div className="absolute right-0 top-full mt-1 py-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[120px] z-50">
              {COMMON_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  className={`w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--theme-bg-tertiary)] transition-colors ${
                    language === lang ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-text-secondary)]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="p-1.5 text-xs bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] rounded hover:bg-[var(--theme-border)] transition-colors"
          title="Copy code"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
      </div>
      
      {/* Language label (always visible) */}
      <div className="absolute top-2 left-3 text-xs text-[var(--theme-text-muted)] font-mono">
        {language}
      </div>
      
      {/* Code content - we show both editable and highlighted overlay */}
      <pre className="code-block pt-8 relative">
        <NodeViewContent as="code" className="relative z-10" />
      </pre>
    </NodeViewWrapper>
  );
}
```

### Update Extensions to Use NodeView

Update `src/components/Editor/extensions/index.ts`:

```typescript
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { CustomKeyboardShortcuts } from './keyboard-shortcuts';
import { CodeBlockComponent } from '../CodeBlockComponent';

export const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    // Disable built-in code block, we use custom
    codeBlock: false,
  }),
  // Custom code block with Shiki
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockComponent);
    },
  }).configure({
    HTMLAttributes: {
      class: 'code-block',
    },
  }),
  Placeholder.configure({
    placeholder: 'Start writing, or paste markdown...',
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'editor-link',
    },
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'editor-image',
    },
    allowBase64: true,
  }),
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: 'editor-table',
    },
  }),
  TableRow,
  TableCell,
  TableHeader,
  Markdown.configure({
    html: false,
    transformPastedText: true,
    transformCopiedText: true,
  }),
  CustomKeyboardShortcuts,
];
```

### Install Code Block Extension Dependency

```bash
npm install @tiptap/extension-code-block-lowlight lowlight
```

**Note:** We use `CodeBlockLowlight` as the base because it handles parsing well, but we override the view with our Shiki-powered component.

### Add Code Block Wrapper Styles

Add to `src/components/Editor/editor-styles.css`:

```css
/* Code Block Wrapper (for copy button, language selector) */
.code-block-wrapper {
  position: relative;
}

.code-block-wrapper .code-block {
  background-color: var(--theme-code-bg);
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  padding: 1rem;
  padding-top: 2.5rem; /* Space for language label */
  overflow-x: auto;
  margin: 0;
}

.code-block-wrapper .code-block code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  background: none;
  padding: 0;
}

/* Shiki generated styles override */
.code-block-wrapper .shiki {
  background-color: transparent !important;
  margin: 0;
  padding: 0;
}
```

**Handoff:** Tell Reviewer: *"Step 3 complete. Shiki syntax highlighting with language selector and copy button. Please test code blocks with various languages."*

---

## Step 4: Final Integration and Testing

**Task:** Ensure everything works together, fix any issues, run full validation.

### Update App.tsx for Theme Support

Update `src/App.tsx` to include theme initialization:

```typescript
import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { useEditorStore } from '@/stores/editorStore';
import { useTheme } from '@/hooks';

function App(): JSX.Element {
  const { showSidebar } = useEditorStore();
  const { toggleDarkLight } = useTheme();

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + D for dark/light toggle
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        toggleDarkLight();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDarkLight]);

  return (
    <div className="h-screen flex flex-col bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)]">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {showSidebar && <Sidebar />}
        <Editor />
      </div>
    </div>
  );
}

export default App;
```

### Test Checklist

Run through these manually:

1. **Theme Switching:**
   - Click theme dropdown → select each theme → verify colors change
   - Refresh page → verify theme persists
   - Press Cmd+D → verify dark/light toggle

2. **Code Blocks:**
   - Create code block (type ``` or Ctrl+Alt+C)
   - Change language via dropdown
   - Verify syntax highlighting appears
   - Click copy button → verify code copied
   - Language label shows in corner

3. **Round-Trip:**
   - Load `tests/fixtures/markdown-test-suite.md`
   - Check debug panel for input vs output
   - Verify code block languages preserved

4. **Build:**
   ```bash
   npm run lint
   npm run build
   ```

### Document Bundle Size

After build, note the new bundle size in Chronicle:
```bash
# Check dist folder size
Get-ChildItem -Path dist -Recurse | Measure-Object -Property Length -Sum
```

**Handoff:** Tell Reviewer: *"Step 4 complete. Phase 1.5 implementation finished. Please run full review per REVIEWER_PHASE1.5_HANDOFF.md."*

---

## Files Created/Modified This Phase

**New Files:**
- `src/hooks/useTheme.ts`
- `src/hooks/index.ts`
- `src/themes/dark-basic.css`
- `src/themes/light-basic.css`
- `src/themes/dark-glass.css`
- `src/themes/light-glass.css`
- `src/themes/index.css`
- `src/components/Editor/CodeBlockComponent.tsx`

**Modified Files:**
- `src/components/Header/Header.tsx`
- `src/components/Editor/extensions/index.ts`
- `src/components/Editor/editor-styles.css`
- `src/index.css`
- `src/App.tsx`
- `package.json` (new dependencies: shiki, lowlight, code-block-lowlight)

**Deleted Files:**
- `src/hooks/.gitkeep`

---

## Notes for Builder

1. **Shiki is async** - Highlighting happens after render, which is fine for editing
2. **Theme CSS is additive** - Classes on `<html>` override `:root` variables
3. **Test in all themes** - Especially glass themes with transparency
4. **Bundle size will increase** - This is expected, we'll optimize in Phase 5

**Ready to start? Begin with Step 1.**
