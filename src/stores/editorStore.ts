import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EditorState, Frontmatter, ThemeName, SidebarState, ViewMode, TOCItem, UIDensity, RecentFileEntry } from '@/types';
import { setSharedFileHandle } from '@/utils/fileHandle';
import { MAX_RECENT } from '@/utils/recentFiles';

interface EditorStore extends EditorState {
  // Content actions
  setContent: (content: string) => void;
  markClean: () => void;
  markDirty: () => void;
  newFile: (content?: string) => void;

  // File actions
  setFilePath: (path: string | null, name: string | null) => void;
  
  // Frontmatter
  frontmatter: Frontmatter | null;
  setFrontmatter: (frontmatter: Frontmatter | null) => void;
  
  // Theme
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleDarkLight: () => void;
  
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

  // Toolbar
  toolbarCollapsed: boolean;
  setToolbarCollapsed: (collapsed: boolean) => void;
  toggleToolbar: () => void;

  // UI Density
  uiDensity: UIDensity;
  setUIDensity: (density: UIDensity) => void;

  // Recent files
  recentFiles: RecentFileEntry[];
  addRecentFile: (entry: RecentFileEntry) => void;
  removeRecentFile: (name: string) => void;
  clearRecentFiles: () => void;

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
  toolbarCollapsed: boolean;
  uiDensity: UIDensity;
  // Document state
  content: string;
  frontmatter: Frontmatter | null;
  fileName: string | null;
  isDirty: boolean;
  // Recent files
  recentFiles: RecentFileEntry[];
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
      toolbarCollapsed: false,
      uiDensity: 'comfortable' as UIDensity,
      recentFiles: [] as RecentFileEntry[],
      
      // Legacy compatibility — plain value, not a getter
      // (Getters using get() crash during Zustand hydration merge)
      showSource: false,

      // Content actions
      setContent: (content) => set({ content, isDirty: true }),
      markClean: () => set({ isDirty: false }),
      markDirty: () => set({ isDirty: true }),
      newFile: (content = '') => {
        setSharedFileHandle(null);
        set({
          content,
          frontmatter: null,
          filePath: null,
          fileName: null,
          isDirty: false,
        });
      },

      // File actions
      setFilePath: (path, name) => set({ filePath: path, fileName: name }),

      // Frontmatter
      setFrontmatter: (frontmatter) => set({ frontmatter }),

      // Theme — applies CSS class to <html> so every component picks it up
      setTheme: (theme) => {
        const root = document.documentElement;
        root.classList.remove('dark-basic', 'light-basic', 'dark-glass', 'light-glass');
        root.classList.add(theme);
        set({ theme });
      },
      toggleDarkLight: () => {
        const current = get().theme;
        const isGlass = current.includes('glass');
        const isDark = current.startsWith('dark');
        const next: ThemeName = isGlass
          ? (isDark ? 'light-glass' : 'dark-glass')
          : (isDark ? 'light-basic' : 'dark-basic');
        get().setTheme(next);
      },

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

      // Toolbar
      setToolbarCollapsed: (toolbarCollapsed) => set({ toolbarCollapsed }),
      toggleToolbar: () => set((state) => ({ toolbarCollapsed: !state.toolbarCollapsed })),

      // UI Density
      setUIDensity: (uiDensity) => set({ uiDensity }),

      // Recent files
      addRecentFile: (entry) => set((state) => {
        const filtered = state.recentFiles.filter((f) => f.name !== entry.name);
        return { recentFiles: [entry, ...filtered].slice(0, MAX_RECENT) };
      }),
      removeRecentFile: (name) => set((state) => ({
        recentFiles: state.recentFiles.filter((f) => f.name !== name),
      })),
      clearRecentFiles: () => set({ recentFiles: [] }),

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
        toolbarCollapsed: state.toolbarCollapsed,
        uiDensity: state.uiDensity,
        content: state.content,
        frontmatter: state.frontmatter,
        fileName: state.fileName,
        isDirty: state.isDirty,
        recentFiles: state.recentFiles,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.warn('[RendMD] Failed to rehydrate:', error);
          }
          // Apply persisted theme to DOM on startup
          if (state?.theme) {
            const root = document.documentElement;
            root.classList.remove('dark-basic', 'light-basic', 'dark-glass', 'light-glass');
            root.classList.add(state.theme);
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
          toolbarCollapsed: persisted?.toolbarCollapsed ?? currentState.toolbarCollapsed,
          uiDensity: persisted?.uiDensity ?? currentState.uiDensity,
          content: persisted?.content ?? currentState.content,
          frontmatter: persisted?.frontmatter ?? currentState.frontmatter,
          fileName: persisted?.fileName ?? currentState.fileName,
          isDirty: persisted?.isDirty ?? currentState.isDirty,
          recentFiles: persisted?.recentFiles ?? currentState.recentFiles,
        };
      },
    }
  )
);

/** Selector: true when the active theme is a dark variant */
export function useIsDark(): boolean {
  return useEditorStore((s) => s.theme.startsWith('dark'));
}
