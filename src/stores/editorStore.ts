import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EditorState, Frontmatter, ThemeName, SidebarState, ViewMode } from '@/types';

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
  
  // View mode (render / source / split)
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  cycleViewMode: () => void;
  
  // Legacy compatibility
  showSource: boolean;
  toggleSource: () => void;
}

// Persisted state for view preferences
interface PersistedState {
  viewMode: ViewMode;
  theme: ThemeName;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
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
      viewMode: 'render',
      
      // Legacy compatibility
      get showSource() {
        return get().viewMode === 'source';
      },

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

      // View mode
      setViewMode: (viewMode) => set({ viewMode }),
      cycleViewMode: () => set((state) => {
        const modes: ViewMode[] = ['render', 'split', 'source'];
        const currentIndex = modes.indexOf(state.viewMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        return { viewMode: modes[nextIndex] };
      }),
      
      // Legacy toggle (cycles through modes)
      toggleSource: () => get().cycleViewMode(),
    }),
    {
      name: 'rendmd-preferences',
      partialize: (state): PersistedState => ({
        viewMode: state.viewMode,
        theme: state.theme,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedState | undefined;
        return {
          ...currentState,
          viewMode: persisted?.viewMode ?? currentState.viewMode,
          theme: persisted?.theme ?? currentState.theme,
        };
      },
    }
  )
);
