import { useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { SourceEditor } from '@/components/SourceView';
import { FrontmatterPanel } from '@/components/Frontmatter';
import { useTheme, useFileSystem, useAutoSave } from '@/hooks';
import { useEditorStore } from '@/stores/editorStore';
import { serializeFrontmatter, parseFrontmatter } from '@/utils/frontmatterParser';

function App(): JSX.Element {
  // Initialize theme system - applies theme class to document root
  useTheme();
  
  const { isDirty, content, frontmatter, setContent, setFrontmatter, viewMode, cycleViewMode } = useEditorStore();
  const { openFile, saveFile, saveFileAs, fileHandleRef } = useFileSystem();
  
  // Auto-save functionality (2-second debounce after edits)
  const { isSaving, lastSaved } = useAutoSave(fileHandleRef);

  // Combine frontmatter + content for source view
  const fullMarkdown = serializeFrontmatter(frontmatter, content);

  // Handle source editor changes (parse frontmatter and content)
  const handleSourceChange = useCallback((newSource: string) => {
    const parsed = parseFrontmatter(newSource);
    setFrontmatter(parsed.frontmatter);
    setContent(parsed.content);
  }, [setContent, setFrontmatter]);

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

  // Global keyboard shortcuts for file operations
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    const isMod = e.ctrlKey || e.metaKey;
    
    if (isMod && e.key === 'o') {
      e.preventDefault();
      await openFile();
    } else if (isMod && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      await saveFileAs();
    } else if (isMod && e.key === 's') {
      e.preventDefault();
      await saveFile();
    } else if (isMod && e.key === '/') {
      e.preventDefault();
      cycleViewMode();
    }
  }, [openFile, saveFile, saveFileAs, cycleViewMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen flex flex-col bg-[var(--theme-bg-primary)]">
      <Header isSaving={isSaving} lastSaved={lastSaved} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Frontmatter panel - shows above editors */}
          <FrontmatterPanel />
          
          {/* Editor area - conditional based on viewMode */}
          <div className="flex-1 flex overflow-hidden">
            {/* Rendered editor - shown in 'render' and 'split' modes */}
            {(viewMode === 'render' || viewMode === 'split') && (
              <div className={viewMode === 'split' ? 'w-1/2 border-r border-[var(--theme-border-primary)]' : 'flex-1'}>
                <Editor />
              </div>
            )}
            
            {/* Source editor - shown in 'source' and 'split' modes */}
            {(viewMode === 'source' || viewMode === 'split') && (
              <div className={viewMode === 'split' ? 'w-1/2' : 'flex-1'}>
                <SourceEditor 
                  value={fullMarkdown}
                  onChange={handleSourceChange}
                  className="h-full"
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
