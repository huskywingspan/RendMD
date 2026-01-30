import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';

const AUTO_SAVE_DELAY_MS = 2000; // 2 seconds after last edit

export interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}

/**
 * Hook for auto-saving content after a debounce period.
 * Only saves if a file handle exists and content is dirty.
 * 
 * @param fileHandleRef - Ref to the FileSystemFileHandle
 */
export function useAutoSave(
  fileHandleRef: React.MutableRefObject<FileSystemFileHandle | null>
): UseAutoSaveReturn {
  const { content, isDirty, markClean } = useEditorStore();
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  
  // Keep content ref up to date
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  /**
   * Perform the actual save operation
   */
  const performSave = useCallback(async () => {
    const handle = fileHandleRef.current;
    
    // Only save if we have a file handle and content is dirty
    if (!handle || !isDirty) {
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const writable = await handle.createWritable();
      await writable.write(contentRef.current);
      await writable.close();
      
      markClean();
      setLastSaved(new Date());
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to auto-save');
      console.error('Auto-save failed:', error);
      setError(error);
      // Don't mark clean on error - keep dirty state
    } finally {
      setIsSaving(false);
    }
  }, [fileHandleRef, isDirty, markClean]);

  /**
   * Debounced save - triggers 2s after last content change
   */
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Only schedule save if dirty and we have a file handle
    if (isDirty && fileHandleRef.current) {
      timeoutRef.current = setTimeout(() => {
        performSave();
      }, AUTO_SAVE_DELAY_MS);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, isDirty, fileHandleRef, performSave]);

  return {
    isSaving,
    lastSaved,
    error,
  };
}
