import { useEffect, useRef } from 'react';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { queryPermission } from '@/lib/fs';

/** How long to wait after the last keystroke before writing to disk. */
const AUTOSAVE_DELAY_MS = 1200;

/**
 * Write dirty documents back to their files a beat after editing stops.
 *
 * Two rules keep this from being annoying:
 *
 *   Only documents that already have a granted write permission are saved.
 *   Autosave cannot legally raise a permission prompt — that needs a user
 *   gesture — so a document whose grant has lapsed simply stays dirty until
 *   you press Ctrl+S, which can prompt.
 *
 *   Untitled documents are never touched. Auto-opening a save dialog for
 *   something you just started typing would be hostile.
 */
export function useAutoSave(): void {
  const autoSave = useSettingsStore((s) => s.autoSave);
  const documents = useDocumentsStore((s) => s.documents);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (!autoSave) return;

    const pending = timers.current;

    for (const doc of documents) {
      if (!doc.isDirty || !doc.handle || doc.isUntitled) continue;

      // Restart the countdown on every change, so this debounces the end of a
      // typing run rather than firing on a fixed interval during one.
      const existing = pending.get(doc.id);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        pending.delete(doc.id);

        const current = useDocumentsStore.getState().documents.find((d) => d.id === doc.id);
        if (!current?.isDirty || !current.handle) return;

        // Silent path only: no prompting without a gesture.
        if ((await queryPermission(current.handle, 'readwrite')) !== 'granted') return;

        await useDocumentsStore.getState().save(current.id);
      }, AUTOSAVE_DELAY_MS);

      pending.set(doc.id, timer);
    }
  }, [autoSave, documents]);

  // Clear every pending timer on unmount.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);
}
