import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EditorState, Frontmatter, ThemeName, SidebarState, ViewMode, TOCItem } from '@/types';

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
  
  // Table of Contents
  tocItems: TOCItem[];
  activeTocId: string | null;
  setTocItems: (items: TOCItem[]) => void;
  setActiveTocId: (id: string | null) => void;
  
  // Shortcuts modal
  shortcutsModalOpen: boolean;
  setShortcutsModalOpen: (open: boolean) => void;

  // Settings
  fontSize: number;
  setFontSize: (size: number) => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;

  // Legacy compatibility
  showSource: boolean;
  toggleSource: () => void;
}

// Persisted state for view preferences + document draft
interface PersistedState {
  viewMode: ViewMode;
  theme: ThemeName;
  fontSize: number;
  autoSaveEnabled: boolean;
  // Document state
  content: string;
  frontmatter: Frontmatter | null;
  fileName: string | null;
  isDirty: boolean;
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
      tocItems: [],
      activeTocId: null,
      shortcutsModalOpen: false,
      fontSize: 16,
      autoSaveEnabled: true,
      
      // Legacy compatibility — plain value, not a getter
      // (Getters using get() crash during Zustand hydration merge)
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

      // Table of Contents
      setTocItems: (tocItems) => set({ tocItems }),
      setActiveTocId: (activeTocId) => set({ activeTocId }),
      
      // Shortcuts modal
      setShortcutsModalOpen: (shortcutsModalOpen) => set({ shortcutsModalOpen }),

      // Settings
      setFontSize: (fontSize) => set({ fontSize }),
      setAutoSaveEnabled: (autoSaveEnabled) => set({ autoSaveEnabled }),

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
        fontSize: state.fontSize,
        autoSaveEnabled: state.autoSaveEnabled,
        content: state.content,
        frontmatter: state.frontmatter,
        fileName: state.fileName,
        isDirty: state.isDirty,
      }),
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            console.warn('[RendMD] Failed to rehydrate:', error);
          }
        };
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedState | undefined;
        return {
          ...currentState,
          viewMode: persisted?.viewMode ?? currentState.viewMode,
          theme: persisted?.theme ?? currentState.theme,
          fontSize: persisted?.fontSize ?? currentState.fontSize,
          autoSaveEnabled: persisted?.autoSaveEnabled ?? currentState.autoSaveEnabled,
          content: persisted?.content ?? currentState.content,
          frontmatter: persisted?.frontmatter ?? currentState.frontmatter,
          fileName: persisted?.fileName ?? currentState.fileName,
          isDirty: persisted?.isDirty ?? currentState.isDirty,
        };
      },
    }
  )
);
