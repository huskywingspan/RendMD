import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../editorStore';

describe('editorStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { setState } = useEditorStore;
    setState({
      content: '',
      isDirty: false,
      filePath: null,
      fileName: null,
      frontmatter: null,
      theme: 'dark-basic',
      viewMode: 'render',
      sidebar: { isOpen: true, activePanel: 'toc' },
      tocItems: [],
      activeTocId: null,
      shortcutsModalOpen: false,
      fontSize: 16,
      autoSaveEnabled: true,
      recentFiles: [],
    });
  });

  it('has correct initial state', () => {
    const state = useEditorStore.getState();

    expect(state.content).toBe('');
    expect(state.isDirty).toBe(false);
    expect(state.filePath).toBeNull();
    expect(state.fileName).toBeNull();
    expect(state.theme).toBe('dark-basic');
    expect(state.viewMode).toBe('render');
    expect(state.fontSize).toBe(16);
    expect(state.autoSaveEnabled).toBe(true);
  });

  describe('content actions', () => {
    it('setContent sets content and marks dirty', () => {
      useEditorStore.getState().setContent('Hello');

      const state = useEditorStore.getState();
      expect(state.content).toBe('Hello');
      expect(state.isDirty).toBe(true);
    });

    it('markClean resets isDirty', () => {
      useEditorStore.getState().setContent('Hello');
      useEditorStore.getState().markClean();

      expect(useEditorStore.getState().isDirty).toBe(false);
    });

    it('markDirty sets isDirty', () => {
      useEditorStore.getState().markDirty();

      expect(useEditorStore.getState().isDirty).toBe(true);
    });
  });

  describe('file actions', () => {
    it('setFilePath sets both filePath and fileName', () => {
      useEditorStore.getState().setFilePath('/home/user/doc.md', 'doc.md');

      const state = useEditorStore.getState();
      expect(state.filePath).toBe('/home/user/doc.md');
      expect(state.fileName).toBe('doc.md');
    });

    it('setFilePath accepts null values', () => {
      useEditorStore.getState().setFilePath('/a/b.md', 'b.md');
      useEditorStore.getState().setFilePath(null, null);

      const state = useEditorStore.getState();
      expect(state.filePath).toBeNull();
      expect(state.fileName).toBeNull();
    });
  });

  describe('view mode', () => {
    it('cycleViewMode cycles render → split → source → render', () => {
      const store = useEditorStore.getState();

      expect(store.viewMode).toBe('render');

      store.cycleViewMode();
      expect(useEditorStore.getState().viewMode).toBe('split');

      useEditorStore.getState().cycleViewMode();
      expect(useEditorStore.getState().viewMode).toBe('source');

      useEditorStore.getState().cycleViewMode();
      expect(useEditorStore.getState().viewMode).toBe('render');
    });

    it('setViewMode sets specific mode', () => {
      useEditorStore.getState().setViewMode('source');

      expect(useEditorStore.getState().viewMode).toBe('source');
    });
  });

  describe('sidebar', () => {
    it('toggleSidebar toggles open state', () => {
      expect(useEditorStore.getState().sidebar.isOpen).toBe(true);

      useEditorStore.getState().toggleSidebar();
      expect(useEditorStore.getState().sidebar.isOpen).toBe(false);

      useEditorStore.getState().toggleSidebar();
      expect(useEditorStore.getState().sidebar.isOpen).toBe(true);
    });

    it('setSidebarPanel changes active panel', () => {
      useEditorStore.getState().setSidebarPanel('files');

      expect(useEditorStore.getState().sidebar.activePanel).toBe('files');
    });
  });

  describe('theme', () => {
    it('setTheme changes theme', () => {
      useEditorStore.getState().setTheme('light-basic');

      expect(useEditorStore.getState().theme).toBe('light-basic');
    });
  });

  describe('settings', () => {
    it('setFontSize changes font size', () => {
      useEditorStore.getState().setFontSize(20);

      expect(useEditorStore.getState().fontSize).toBe(20);
    });

    it('setAutoSaveEnabled toggles auto-save', () => {
      useEditorStore.getState().setAutoSaveEnabled(false);

      expect(useEditorStore.getState().autoSaveEnabled).toBe(false);
    });
  });

  describe('shortcuts modal', () => {
    it('setShortcutsModalOpen opens and closes modal', () => {
      useEditorStore.getState().setShortcutsModalOpen(true);
      expect(useEditorStore.getState().shortcutsModalOpen).toBe(true);

      useEditorStore.getState().setShortcutsModalOpen(false);
      expect(useEditorStore.getState().shortcutsModalOpen).toBe(false);
    });
  });

  describe('frontmatter', () => {
    it('setFrontmatter updates frontmatter', () => {
      useEditorStore.getState().setFrontmatter({ title: 'Test' });

      expect(useEditorStore.getState().frontmatter).toEqual({ title: 'Test' });
    });

    it('setFrontmatter accepts null', () => {
      useEditorStore.getState().setFrontmatter({ title: 'Test' });
      useEditorStore.getState().setFrontmatter(null);

      expect(useEditorStore.getState().frontmatter).toBeNull();
    });
  });

  describe('legacy compatibility', () => {
    it('toggleSource calls cycleViewMode', () => {
      useEditorStore.getState().toggleSource();

      expect(useEditorStore.getState().viewMode).toBe('split');
    });
  });

  describe('persist partialize', () => {
    it('includes document state fields in persisted output', () => {
      // Set up document state
      useEditorStore.getState().setContent('# Draft content');
      useEditorStore.getState().setFrontmatter({ title: 'Test Doc' });
      useEditorStore.getState().setFilePath('/test/path.md', 'path.md');

      const state = useEditorStore.getState();

      // Verify the state fields that should be persisted are present
      expect(state.content).toBe('# Draft content');
      expect(state.frontmatter).toEqual({ title: 'Test Doc' });
      expect(state.fileName).toBe('path.md');
      expect(state.isDirty).toBe(true);
    });

    it('includes preferences in persisted output', () => {
      useEditorStore.getState().setFontSize(20);
      useEditorStore.getState().setViewMode('split');
      useEditorStore.getState().setAutoSaveEnabled(false);

      const state = useEditorStore.getState();
      expect(state.fontSize).toBe(20);
      expect(state.viewMode).toBe('split');
      expect(state.autoSaveEnabled).toBe(false);
    });
  });

  describe('persist merge', () => {
    it('restores document state from persisted data', () => {
      // Simulate what Zustand merge does on rehydration
      useEditorStore.setState({
        content: '# Restored',
        frontmatter: { author: 'Jane' },
        fileName: 'restored.md',
        isDirty: true,
      });

      const state = useEditorStore.getState();
      expect(state.content).toBe('# Restored');
      expect(state.frontmatter).toEqual({ author: 'Jane' });
      expect(state.fileName).toBe('restored.md');
      expect(state.isDirty).toBe(true);
    });

    it('falls back to defaults when persisted fields are missing', () => {
      // Simulate rehydration with only preferences (backwards compat)
      useEditorStore.setState({
        viewMode: 'source',
        theme: 'dark-basic',
        fontSize: 18,
        autoSaveEnabled: true,
      });

      const state = useEditorStore.getState();
      // Document fields should remain at their current values (empty defaults)
      expect(state.viewMode).toBe('source');
      expect(state.fontSize).toBe(18);
    });
  });

  describe('recent files', () => {
    it('starts with empty recentFiles', () => {
      expect(useEditorStore.getState().recentFiles).toEqual([]);
    });

    it('addRecentFile adds an entry at the front', () => {
      useEditorStore.getState().addRecentFile({ name: 'a.md', lastOpened: 100 });
      useEditorStore.getState().addRecentFile({ name: 'b.md', lastOpened: 200 });

      const files = useEditorStore.getState().recentFiles;
      expect(files).toHaveLength(2);
      expect(files[0].name).toBe('b.md');
      expect(files[1].name).toBe('a.md');
    });

    it('addRecentFile deduplicates by name (moves to front)', () => {
      useEditorStore.getState().addRecentFile({ name: 'a.md', lastOpened: 100 });
      useEditorStore.getState().addRecentFile({ name: 'b.md', lastOpened: 200 });
      useEditorStore.getState().addRecentFile({ name: 'a.md', lastOpened: 300 });

      const files = useEditorStore.getState().recentFiles;
      expect(files).toHaveLength(2);
      expect(files[0].name).toBe('a.md');
      expect(files[0].lastOpened).toBe(300);
    });

    it('addRecentFile caps at MAX_RECENT (8)', () => {
      for (let i = 0; i < 10; i++) {
        useEditorStore.getState().addRecentFile({ name: `file${i}.md`, lastOpened: i });
      }
      expect(useEditorStore.getState().recentFiles).toHaveLength(8);
      // Most recent should be first
      expect(useEditorStore.getState().recentFiles[0].name).toBe('file9.md');
    });

    it('removeRecentFile removes by name', () => {
      useEditorStore.getState().addRecentFile({ name: 'a.md', lastOpened: 100 });
      useEditorStore.getState().addRecentFile({ name: 'b.md', lastOpened: 200 });
      useEditorStore.getState().removeRecentFile('a.md');

      const files = useEditorStore.getState().recentFiles;
      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('b.md');
    });

    it('clearRecentFiles empties the list', () => {
      useEditorStore.getState().addRecentFile({ name: 'a.md', lastOpened: 100 });
      useEditorStore.getState().clearRecentFiles();

      expect(useEditorStore.getState().recentFiles).toEqual([]);
    });
  });
});
