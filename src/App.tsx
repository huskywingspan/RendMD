import { useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Editor } from '@/components/Editor';
import { useTheme, useFileSystem, useAutoSave } from '@/hooks';
import { useEditorStore } from '@/stores/editorStore';

function App(): JSX.Element {
  // Initialize theme system - applies theme class to document root
  useTheme();
  
  const { isDirty } = useEditorStore();
  const { openFile, saveFile, saveFileAs, fileHandleRef } = useFileSystem();
  
  // Auto-save functionality (2-second debounce after edits)
  const { isSaving, lastSaved } = useAutoSave(fileHandleRef);

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
    }
  }, [openFile, saveFile, saveFileAs]);

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
          <Editor />
        </main>
      </div>
    </div>
  );
}

export default App;
