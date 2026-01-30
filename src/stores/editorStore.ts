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
