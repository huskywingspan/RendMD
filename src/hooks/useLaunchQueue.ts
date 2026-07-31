import { useEffect } from 'react';
import { useDocumentsStore } from '@/stores/documentsStore';
import { isMarkdownFile } from '@/lib/fs';

/**
 * Files handed to RendMD by the operating system.
 *
 * When RendMD is installed, the manifest's `file_handlers` entry registers it
 * as an app that can open markdown. Double-clicking a .md file then launches
 * (or focuses) the app and delivers the file through `window.launchQueue` as a
 * FileSystemFileHandle — a *writable* one, so Ctrl+S goes straight back to the
 * file you double-clicked. This is the shortest path from "a file on disk" to
 * "reading it properly" that the web platform offers.
 *
 * The consumer must be set during the initial evaluation of the page, before
 * the first await, or queued launches are dropped. It is therefore registered
 * from a layout effect with no dependencies.
 */

interface LaunchParams {
  files?: FileSystemHandle[];
  targetURL?: string;
}

declare global {
  interface Window {
    launchQueue?: {
      setConsumer: (consumer: (params: LaunchParams) => void) => void;
    };
  }
}

export function useLaunchQueue(): void {
  useEffect(() => {
    if (!('launchQueue' in window) || !window.launchQueue) return;

    window.launchQueue.setConsumer(({ files }) => {
      if (!files || files.length === 0) return;

      void (async () => {
        const store = useDocumentsStore.getState();
        let firstId: string | null = null;

        for (const handle of files) {
          if (handle.kind !== 'file' || !isMarkdownFile(handle.name)) continue;

          const id = await store.openHandle(handle as FileSystemFileHandle, { activate: false });
          firstId ??= id;
        }

        if (firstId) store.setActive(firstId);
      })();
    });
  }, []);
}

/**
 * The manifest's "New document" shortcut launches with ?new=1.
 *
 * The parameter is stripped afterwards so a reload doesn't keep creating blank
 * documents.
 */
export function useLaunchShortcuts(): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('new')) return;

    useDocumentsStore.getState().newDocument();

    params.delete('new');
    const query = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
  }, []);
}
