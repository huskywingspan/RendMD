import { useEffect, useState } from 'react';
import { useDocumentsStore } from '@/stores/documentsStore';
import { isMarkdownFile } from '@/lib/fs';

/**
 * Drag-and-drop onto the window.
 *
 * Chromium exposes `getAsFileSystemHandle()` on dropped items, which yields a
 * writable handle — so a dropped file behaves exactly like one opened through
 * the picker, and Ctrl+S goes back to the original. Elsewhere we fall back to
 * the File object, which is read-only.
 *
 * Returns whether a drag is currently over the window, for the drop overlay.
 */
export function useFileDrop(): boolean {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // dragenter/dragleave fire for every element crossed, so a naive boolean
    // flickers. Counting entries and exits is the reliable fix.
    let depth = 0;

    const carriesFiles = (event: DragEvent): boolean =>
      Boolean(event.dataTransfer?.types.includes('Files'));

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth += 1;
      setIsDragging(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      // Without this the browser navigates to the file instead.
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDragging(false);
    };

    const onDrop = async (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setIsDragging(false);

      const items = Array.from(event.dataTransfer?.items ?? []);
      const store = useDocumentsStore.getState();
      let firstId: string | null = null;

      for (const item of items) {
        if (item.kind !== 'file') continue;

        // Preferred path: a real handle we can write back to.
        const withHandle = item as DataTransferItem & {
          getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
        };

        if (withHandle.getAsFileSystemHandle) {
          const handle = await withHandle.getAsFileSystemHandle();
          if (handle?.kind === 'file' && isMarkdownFile(handle.name)) {
            const id = await store.openHandle(handle as FileSystemFileHandle, { activate: false });
            firstId ??= id;
            continue;
          }
          if (handle) continue; // A directory, or a non-markdown file.
        }

        const file = item.getAsFile();
        if (file && isMarkdownFile(file.name)) {
          const id = await store.openTextFile(file);
          firstId ??= id;
        }
      }

      if (firstId) store.setActive(firstId);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return isDragging;
}
