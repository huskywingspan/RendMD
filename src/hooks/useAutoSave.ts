import { useEffect, useRef } from 'react';
import { documentText, useDocumentsStore } from '@/stores/documentsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { queryPermission } from '@/lib/fs';
import { toast } from '@/stores/toastStore';

/** How long to wait after the last keystroke before writing to disk. */
const AUTOSAVE_DELAY_MS = 1200;

/**
 * Autosave declines to write when a document has lost this much of itself, and
 * asks instead.
 *
 * Autosave is a convenience; overwriting a file with a fraction of its former
 * contents, unprompted, is not. A user who deletes most of a document on
 * purpose loses nothing but one click — one who did it by accident gets the
 * chance to undo before it reaches disk. That case is not hypothetical: a
 * cursor desync in source view once truncated a file and autosave committed it
 * before the user noticed.
 */
const TRUNCATION_RATIO = 0.4;

/** Below this, a document is too small for the ratio to mean anything. */
const TRUNCATION_FLOOR = 400;

/** Ids already queried about, so the prompt appears once rather than per beat. */
const asked = new Set<string>();

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

        const next = documentText(current);
        const previous = current.savedText;

        if (
          previous.length >= TRUNCATION_FLOOR &&
          next.length < previous.length * TRUNCATION_RATIO
        ) {
          if (!asked.has(current.id)) {
            asked.add(current.id);
            const lost = Math.round((1 - next.length / previous.length) * 100);
            toast.error(`${current.name} lost ${lost}% of its content — not saved automatically`, {
              label: 'Save anyway',
              onPress: () => void useDocumentsStore.getState().save(current.id),
            });
          }
          return;
        }

        asked.delete(current.id);
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
