import { useCallback, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { setSharedFileHandle } from '@/utils/fileHandle';
import { storeFileHandle, getFileHandle, verifyPermission, removeFileHandle } from '@/utils/recentFiles';
import type { RecentFileEntry } from '@/types';

// Re-export for consumers that already import from here
export { getSharedFileHandle, setSharedFileHandle } from '@/utils/fileHandle';

/**
 * File System Access API types
 */
declare global {
  interface Window {
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
}

interface SaveFilePickerOptions {
  excludeAcceptAllOption?: boolean;
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

const MARKDOWN_FILE_TYPES: FilePickerAcceptType[] = [
  {
    description: 'Markdown files',
    accept: { 'text/markdown': ['.md', '.markdown'] },
  },
];

// Module-level singleton moved to @/utils/fileHandle to avoid circular deps

export interface UseFileSystemReturn {
  openFile: () => Promise<void>;
  openRecentFile: (entry: RecentFileEntry) => Promise<boolean>;
  saveFile: () => Promise<boolean>;
  saveFileAs: () => Promise<boolean>;
  hasNativeFS: boolean;
  fileHandleRef: React.MutableRefObject<FileSystemFileHandle | null>;
}

/**
 * Hook for file system operations with graceful fallback.
 * Uses File System Access API on Chrome/Edge, falls back to
 * file input + download on Firefox/Safari.
 */
export function useFileSystem(): UseFileSystemReturn {
  const { 
    content, 
    fileName,
    setContent, 
    setFilePath, 
    markClean 
  } = useEditorStore();
  
  // Store file handle in a ref (not in Zustand due to serialization issues)
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);
  
  // Hidden file input for fallback
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const hasNativeFS = typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  /**
   * Get or create the hidden file input element
   */
  const getFileInput = useCallback(() => {
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown,text/markdown';
      input.style.display = 'none';
      document.body.appendChild(input);
      fileInputRef.current = input;
    }
    return fileInputRef.current;
  }, []);

  /**
   * Read file content from a File object
   */
  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  /**
   * Open a markdown file
   */
  const openFile = useCallback(async (): Promise<void> => {
    if (hasNativeFS && window.showOpenFilePicker) {
      // Native File System Access API
      try {
        const [handle] = await window.showOpenFilePicker({
          types: MARKDOWN_FILE_TYPES,
          multiple: false,
        });
        
        const file = await handle.getFile();
        const content = await readFileContent(file);
        
        fileHandleRef.current = handle;
        setSharedFileHandle(handle);
        setContent(content);
        setFilePath(file.name, file.name);
        markClean();

        // Track in recent files
        const handleKey = await storeFileHandle(file.name, handle);
        useEditorStore.getState().addRecentFile({
          name: file.name,
          lastOpened: Date.now(),
          handleKey,
        });
      } catch (error) {
        // User cancelled or permission denied
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to open file:', error);
          throw error;
        }
      }
    } else {
      // Fallback: use hidden file input
      return new Promise((resolve, reject) => {
        const input = getFileInput();
        
        const handleChange = async () => {
          input.removeEventListener('change', handleChange);
          
          const file = input.files?.[0];
          if (!file) {
            resolve();
            return;
          }
          
          try {
            const content = await readFileContent(file);
            fileHandleRef.current = null; // No handle in fallback mode
            setSharedFileHandle(null);
            setContent(content);
            setFilePath(file.name, file.name);
            markClean();

            // Track in recent files (no handle in fallback)
            useEditorStore.getState().addRecentFile({
              name: file.name,
              lastOpened: Date.now(),
            });
            resolve();
          } catch (error) {
            reject(error);
          }
          
          // Reset input for next use
          input.value = '';
        };
        
        input.addEventListener('change', handleChange);
        input.click();
      });
    }
  }, [hasNativeFS, getFileInput, setContent, setFilePath, markClean]);

  /**
   * Save file with new name/location
   * Defined before saveFile so it can be used in saveFile's dependency array
   */
  const saveFileAs = useCallback(async (): Promise<boolean> => {
    if (hasNativeFS && window.showSaveFilePicker) {
      // Native File System Access API
      try {
        const handle = await window.showSaveFilePicker({
          types: MARKDOWN_FILE_TYPES,
          suggestedName: fileName || 'untitled.md',
        });
        
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        
        fileHandleRef.current = handle;
        setSharedFileHandle(handle);
        setFilePath(handle.name, handle.name);
        markClean();

        // Track in recent files
        const handleKey = await storeFileHandle(handle.name, handle);
        useEditorStore.getState().addRecentFile({
          name: handle.name,
          lastOpened: Date.now(),
          handleKey,
        });
        return true;
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to save file:', error);
          throw error;
        }
        return false;
      }
    } else {
      // Fallback: download file
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'untitled.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Mark clean since user chose to save
      markClean();
      return true;
    }
  }, [content, fileName, hasNativeFS, setFilePath, markClean]);

  /**
   * Save to existing file (or trigger Save As if no file open)
   */
  const saveFile = useCallback(async (): Promise<boolean> => {
    // If we have a native file handle, save to it
    if (fileHandleRef.current && hasNativeFS) {
      try {
        const writable = await fileHandleRef.current.createWritable();
        await writable.write(content);
        await writable.close();
        markClean();
        return true;
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to save file:', error);
          throw error;
        }
        return false;
      }
    }
    
    // Otherwise, do Save As
    return saveFileAs();
  }, [content, hasNativeFS, markClean, saveFileAs]);

  /**
   * Open a file from the recent files list using its stored handle
   */
  const openRecentFile = useCallback(async (entry: RecentFileEntry): Promise<boolean> => {
    if (!entry.handleKey || !hasNativeFS) {
      // No stored handle — can't reopen without native FS
      useEditorStore.getState().removeRecentFile(entry.name);
      return false;
    }

    const handle = await getFileHandle(entry.handleKey);
    if (!handle) {
      // Handle removed from IndexedDB
      useEditorStore.getState().removeRecentFile(entry.name);
      await removeFileHandle(entry.handleKey);
      return false;
    }

    const hasPermission = await verifyPermission(handle);
    if (!hasPermission) {
      return false;
    }

    try {
      const file = await handle.getFile();
      const text = await file.text();

      fileHandleRef.current = handle;
      setSharedFileHandle(handle);
      setContent(text);
      setFilePath(file.name, file.name);
      markClean();

      // Update the lastOpened timestamp
      useEditorStore.getState().addRecentFile({
        ...entry,
        lastOpened: Date.now(),
      });
      return true;
    } catch (error) {
      console.error('[RendMD] Failed to open recent file:', error);
      useEditorStore.getState().removeRecentFile(entry.name);
      return false;
    }
  }, [hasNativeFS, setContent, setFilePath, markClean, fileHandleRef]);

  return {
    openFile,
    openRecentFile,
    saveFile,
    saveFileAs,
    hasNativeFS,
    fileHandleRef,
  };
}
