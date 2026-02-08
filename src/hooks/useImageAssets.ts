import { useCallback, useRef } from 'react';
import { useFileSystem, getSharedFileHandle } from './useFileSystem';
import { generateImageFilename } from '@/utils/imageHelpers';

export interface UseImageAssetsReturn {
  /** Save an image file to the assets/ directory, returns relative path */
  saveImage: (file: File) => Promise<string>;
  /** Whether native file system access is available */
  hasNativeFS: boolean;
}

/**
 * Hook for managing image assets alongside the markdown file.
 * 
 * When a user has opened a file via the File System Access API,
 * this hook can save images to an `assets/` directory next to the file.
 * Falls back gracefully when native FS is not available.
 */
export function useImageAssets(): UseImageAssetsReturn {
  const { hasNativeFS } = useFileSystem();
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const getDirectoryHandle = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    // If we already have a directory handle, reuse it
    if (directoryHandleRef.current) {
      return directoryHandleRef.current;
    }

    // Get the shared file handle (set when file was opened/saved)
    const fileHandle = getSharedFileHandle();
    if (!fileHandle) return null;

    try {
      // Use the newer approach: ask for a directory
      // We'll prompt the user to pick the directory where assets should go
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as Window & { showDirectoryPicker: (opts?: object) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
          mode: 'readwrite',
          startIn: fileHandle,
        });
        directoryHandleRef.current = dirHandle;
        return dirHandle;
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.warn('Failed to get directory handle:', error);
      }
    }

    return null;
  }, []);

  const saveImage = useCallback(async (file: File): Promise<string> => {
    const dirHandle = await getDirectoryHandle();
    
    if (!dirHandle) {
      throw new Error('No directory access available. Save your document first.');
    }

    try {
      // Get or create assets/ directory
      const assetsDir = await dirHandle.getDirectoryHandle('assets', { create: true });
      
      // Generate a unique filename
      const filename = generateImageFilename(file);
      
      // Write the file
      const newFileHandle = await assetsDir.getFileHandle(filename, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(file);
      await writable.close();
      
      // Return relative path from the markdown file
      return `assets/${filename}`;
    } catch (error) {
      console.error('Failed to save image to assets:', error);
      throw new Error('Failed to save image file');
    }
  }, [getDirectoryHandle]);

  return {
    saveImage,
    hasNativeFS,
  };
}
