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
