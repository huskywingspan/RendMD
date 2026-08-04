// Editor types
export interface EditorState {
  content: string;
  isDirty: boolean;
  filePath: string | null;
  fileName: string | null;
}

// View mode types
export type ViewMode = 'render' | 'source' | 'split';

// UI density types
export type UIDensity = 'compact' | 'comfortable';

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
  /** Parsed view of the header, for the frontmatter panel. Lossy. */
  frontmatter: Frontmatter | null;
  /** Everything after the frontmatter block. */
  content: string;
  /** The original input, unmodified. */
  raw: string;
  /**
   * The exact frontmatter source, delimiters and trailing newline included, or
   * '' when there is none. `block + content === raw`, always — that identity is
   * what keeps editing a document from rewriting parts of it the user did not
   * touch.
   */
  block: string;
}

// Table of Contents types
export interface TOCItem {
  id: string;
  text: string;
  level: number;
  pos: number;
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

// Recent file entry for persistent recent-files list
export interface RecentFileEntry {
  name: string;
  lastOpened: number; // Unix timestamp in ms
  handleKey?: string; // Key in IndexedDB for file handle
}
