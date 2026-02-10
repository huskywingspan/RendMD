import { useEffect, useCallback, useState, useMemo, useRef, lazy, Suspense } from 'react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { FrontmatterPanel } from '@/components/Frontmatter';
import { ToastContainer } from '@/components/UI/Toast';
import { EmptyState } from '@/components/UI/EmptyState';
import { useFileSystem, useAutoSave, useTOC, scrollToHeading, useSwipeGesture, useScrollSync } from '@/hooks';
import { useEditorStore } from '@/stores/editorStore';
import { useAIStore } from '@/stores/aiStore';
import { serializeFrontmatter, parseFrontmatter } from '@/utils/frontmatterParser';
import { fileToBase64 } from '@/utils/imageHelpers';
import type { TOCItem } from '@/types';

// Lazy-loaded components for bundle optimization
const SourceEditor = lazy(() => import('@/components/SourceView/SourceEditor'));
const ShortcutsModal = lazy(() => import('@/components/Modals/ShortcutsModal'));
const ImageInsertModal = lazy(() => import('@/components/Modals/ImageInsertModal'));
const SettingsModal = lazy(() => import('@/components/Modals/SettingsModal'));
const SearchBar = lazy(() => import('@/components/Editor/SearchBar'));
const AIPanel = lazy(() => import('@/components/AI/AIPanel').then(m => ({ default: m.AIPanel })));
const AIBottomSheet = lazy(() => import('@/components/AI/AIBottomSheet').then(m => ({ default: m.AIBottomSheet })));

function App(): JSX.Element {
  const { 
    isDirty, content, frontmatter, filePath: storedFilePath, fileName, setContent, setFrontmatter, 
    viewMode, setViewMode, cycleViewMode, 
    shortcutsModalOpen, setShortcutsModalOpen,
    fontSize,
    newFile,
    uiDensity
  } = useEditorStore();
  const { openFile, saveFile, saveFileAs, fileHandleRef } = useFileSystem();
  
  // Auto-save functionality (2-second debounce after edits)
  const { isSaving, lastSaved } = useAutoSave(fileHandleRef);

  // Editor instance as state so useTOC re-runs when editor becomes available
  const [editorInstance, setEditorInstance] = useState<TipTapEditor | null>(null);
  
  // Initialize TOC extraction from the editor
  useTOC(editorInstance);

  // Image insert modal state
  const [imageModalFile, setImageModalFile] = useState<File | undefined>();
  const [imageModalOpen, setImageModalOpen] = useState(false);

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Search bar state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchShowReplace, setSearchShowReplace] = useState(false);

  // AI panel state
  const { isPanelOpen: aiPanelOpen } = useAIStore();

  // AI bottom sheet state (mobile)
  const [aiBottomSheetOpen, setAIBottomSheetOpen] = useState(false);
  const [mobileHasSelection, setMobileHasSelection] = useState(false);

  // Screen reader status announcements
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  // Scroll sync for split mode
  const { setRefA, setRefB, onScrollA, onScrollB } = useScrollSync();
  // Combine frontmatter + content for source view
  const fullMarkdown = serializeFrontmatter(frontmatter, content);

  // Swipe gesture for mobile view switching
  const editorAreaRef = useRef<HTMLDivElement>(null);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Compute effective view mode — no split on mobile (< 768px)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const effectiveViewMode = useMemo(() => {
    if (viewMode === 'split' && windowWidth < 768) return 'render';
    return viewMode;
  }, [viewMode, windowWidth]);

  useSwipeGesture(editorAreaRef, {
    onSwipeLeft: () => {
      if (effectiveViewMode === 'render') setViewMode('source');
    },
    onSwipeRight: () => {
      if (effectiveViewMode === 'source') setViewMode('render');
    },
    enabled: isTouchDevice,
  });

  // Handle source editor changes (parse frontmatter and content)
  const handleSourceChange = useCallback((newSource: string) => {
    const parsed = parseFrontmatter(newSource);
    setFrontmatter(parsed.frontmatter);
    setContent(parsed.content);
  }, [setContent, setFrontmatter]);

  // Editor ready callback — store instance for TOC
  const handleEditorReady = useCallback((editor: TipTapEditor) => {
    setEditorInstance(editor);
  }, []);

  // Image file handler — from drag/drop/paste in Editor
  const handleImageFile = useCallback((file: File) => {
    setImageModalFile(file);
    setImageModalOpen(true);
  }, []);

  // Image insert handlers
  const handleInsertImageUrl = useCallback((url: string, alt: string) => {
    editorInstance?.chain().focus().setImage({ src: url, alt }).run();
    setImageModalOpen(false);
    setImageModalFile(undefined);
  }, [editorInstance]);

  const handleInsertImageBase64 = useCallback((dataUrl: string, alt: string) => {
    editorInstance?.chain().focus().setImage({ src: dataUrl, alt }).run();
    setImageModalOpen(false);
    setImageModalFile(undefined);
  }, [editorInstance]);

  const handleInsertImageLocal = useCallback(async (relativePath: string, alt: string) => {
    if (!editorInstance) return;
    
    // If we have the actual file data, use a data URL for editor display
    // but store the relative path for markdown serialization
    if (imageModalFile) {
      try {
        const dataUrl = await fileToBase64(imageModalFile);
        // Use setImage with extra localPath attribute for markdown serialization
        // The CustomImage extension stores localPath and uses it in markdown output
        editorInstance.chain().focus().command(({ tr }) => {
          const node = editorInstance.schema.nodes.image.create({
            src: dataUrl,
            alt,
            localPath: relativePath,
          });
          tr.replaceSelectionWith(node);
          return true;
        }).run();
      } catch {
        // Fallback: insert with relative path (won't display but markdown is correct)
        editorInstance.chain().focus().setImage({ src: relativePath, alt }).run();
      }
    } else {
      // No file data available, just insert the path reference
      editorInstance.chain().focus().setImage({ src: relativePath, alt }).run();
    }
    
    setImageModalOpen(false);
    setImageModalFile(undefined);
  }, [editorInstance, imageModalFile]);

  const handleImageModalCancel = useCallback(() => {
    setImageModalOpen(false);
    setImageModalFile(undefined);
  }, []);

  // TOC item click handler - manually set active after scroll
  const handleTocItemClick = useCallback((item: TOCItem) => {
    if (editorInstance) {
      scrollToHeading(editorInstance, item);
      // Manually set active since scroll event may not fire reliably
      useEditorStore.getState().setActiveTocId(item.id);
    }
  }, [editorInstance]);

  // Beforeunload warning for unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Flush draft to localStorage when tab goes hidden (protects against tab discard)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const state = useEditorStore.getState();
        try {
          const persisted = {
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
          };
          localStorage.setItem(
            'rendmd-preferences',
            JSON.stringify({ state: persisted, version: 0 })
          );
        } catch {
          // Quota exceeded or other error — fail silently
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Hidden file input for image insertion via Ctrl+Shift+I
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  
  const openImagePicker = useCallback(() => {
    if (!imageInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      imageInputRef.current = input;
    }
    
    const input = imageInputRef.current;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        handleImageFile(file);
      }
      input.value = ''; // Reset for next use
    };
    input.click();
  }, [handleImageFile]);

  // Global keyboard shortcuts for file operations
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    const isMod = e.ctrlKey || e.metaKey;
    
    if (isMod && e.key === 'o') {
      e.preventDefault();
      await openFile();
      setStatusAnnouncement('File opened');
    } else if (isMod && e.key === 'n') {
      e.preventDefault();
      newFile();
      setStatusAnnouncement('New file created');
    } else if (isMod && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      const saved = await saveFileAs();
      if (saved) setStatusAnnouncement('File saved as');
    } else if (isMod && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      openImagePicker();
    } else if (isMod && e.key === 's') {
      e.preventDefault();
      const saved = await saveFile();
      if (saved) setStatusAnnouncement('File saved');
    } else if (isMod && e.shiftKey && e.key === '/') {
      // Ctrl+Shift+/ → toggle keyboard shortcuts modal
      e.preventDefault();
      setShortcutsModalOpen(!shortcutsModalOpen);
    } else if (isMod && !e.shiftKey && e.key === '/') {
      e.preventDefault();
      cycleViewMode();
    } else if (isMod && e.key === 'h') {
      // Ctrl+H → find & replace (universal standard)
      e.preventDefault();
      setSearchShowReplace(true);
      setIsSearchOpen(true);
    } else if (isMod && e.key === 'f') {
      // Ctrl+F → find in document
      e.preventDefault();
      setSearchShowReplace(false);
      setIsSearchOpen(true);
    } else if (isMod && e.shiftKey && e.key === 'A') {
      // Ctrl+Shift+A → toggle AI panel
      e.preventDefault();
      useAIStore.getState().togglePanel();
    }
  }, [openFile, saveFile, saveFileAs, openImagePicker, cycleViewMode, shortcutsModalOpen, setShortcutsModalOpen, newFile]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-dvh flex flex-col bg-[var(--theme-bg-primary)]" style={{ '--editor-font-size': `${fontSize}px`, '--ui-density-scale': uiDensity === 'compact' ? '0.85' : '1', height: '100dvh' } as React.CSSProperties}>
      {/* Skip-to-content link for screen readers */}
      <a
        href="#main-editor"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--theme-accent-primary)] focus:text-white focus:rounded-lg"
      >
        Skip to editor
      </a>

      <Header isSaving={isSaving} lastSaved={lastSaved} editor={editorInstance} onOpenSettings={() => setSettingsOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onTocItemClick={handleTocItemClick} />
        <main id="main-editor" className="flex-1 flex flex-col overflow-hidden">
          {/* Frontmatter panel - shows above editors */}
          <FrontmatterPanel />
          
          {/* Editor area - conditional based on effectiveViewMode */}
          <div ref={editorAreaRef} className="flex-1 flex overflow-hidden relative">
            {/* Search bar — inside editor area, positioned absolute top-right */}
            {isSearchOpen && editorInstance && (
              <Suspense fallback={null}>
                <SearchBar
                  editor={editorInstance}
                  onClose={() => setIsSearchOpen(false)}
                  showReplace={searchShowReplace}
                />
              </Suspense>
            )}
            {/* Empty state when no content and no file loaded */}
            {!content && !storedFilePath && !fileName ? (
              <EmptyState />
            ) : (
              <>
                {/* Rendered editor - shown in 'render' and 'split' modes */}
                {(effectiveViewMode === 'render' || effectiveViewMode === 'split') && (
                  <div className={effectiveViewMode === 'split' ? 'w-1/2 flex flex-col border-r border-[var(--theme-border-primary)]' : 'flex-1 flex flex-col'}>
                    <Editor 
                      onEditorReady={handleEditorReady}
                      onImageFile={handleImageFile}
                      scrollContainerRef={effectiveViewMode === 'split' ? setRefA : undefined}
                      onScrollSync={effectiveViewMode === 'split' ? onScrollA : undefined}
                      onAIClick={isTouchDevice ? () => {
                        const sel = editorInstance?.state.selection;
                        setMobileHasSelection(sel ? sel.from !== sel.to : false);
                        setAIBottomSheetOpen(true);
                      } : undefined}
                    />
                  </div>
                )}
                
                {/* Source editor - shown in 'source' and 'split' modes */}
                {(effectiveViewMode === 'source' || effectiveViewMode === 'split') && (
                  <div className={effectiveViewMode === 'split' ? 'w-1/2' : 'flex-1'}>
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-[var(--theme-text-muted)]">Loading source editor…</div>}>
                      <SourceEditor 
                        value={fullMarkdown}
                        onChange={handleSourceChange}
                        className="h-full"
                        scrollContainerRef={effectiveViewMode === 'split' ? setRefB : undefined}
                        onScrollSync={effectiveViewMode === 'split' ? onScrollB : undefined}
                      />
                    </Suspense>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* AI Panel — desktop right sidebar */}
        {aiPanelOpen && (
          <Suspense fallback={null}>
            <AIPanel
              className="w-80 border-l border-[var(--theme-border-primary)] hidden md:flex flex-col"
              editor={editorInstance}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </Suspense>
        )}
      </div>

      {/* AI Bottom Sheet — mobile */}
      {aiBottomSheetOpen && (
        <Suspense fallback={null}>
          <AIBottomSheet
            isOpen={aiBottomSheetOpen}
            onClose={() => setAIBottomSheetOpen(false)}
            editor={editorInstance}
            hasSelection={mobileHasSelection}
            onOpenSettings={() => { setAIBottomSheetOpen(false); setSettingsOpen(true); }}
          />
        </Suspense>
      )}

      {/* Modals */}
      {shortcutsModalOpen && (
        <Suspense fallback={null}>
          <ShortcutsModal 
            isOpen={shortcutsModalOpen} 
            onClose={() => setShortcutsModalOpen(false)} 
          />
        </Suspense>
      )}

      {imageModalOpen && (
        <Suspense fallback={null}>
          <ImageInsertModal
            file={imageModalFile}
            onInsertUrl={handleInsertImageUrl}
            onInsertBase64={handleInsertImageBase64}
            onInsertLocal={handleInsertImageLocal}
            onCancel={handleImageModalCancel}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        {settingsOpen && (
          <SettingsModal 
            isOpen={settingsOpen} 
            onClose={() => setSettingsOpen(false)} 
          />
        )}
      </Suspense>

      <ToastContainer />

      {/* Screen reader status announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="status-announcements">
        {statusAnnouncement}
      </div>
    </div>
  );
}

export default App;
