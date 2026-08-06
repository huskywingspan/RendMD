import { useState } from 'react';
import { Modal } from '@/components/UI/Modal';
import { useDocumentsStore } from '@/stores/documentsStore';
import { toast } from '@/stores/toastStore';

/**
 * Raised when a file changed on disk while RendMD held unsaved edits to it.
 *
 * A modal rather than a toast, for two reasons. It needs three answers and a
 * toast carries one action; and a toast expires. This is the moment where one
 * of two versions of the user's work is about to be lost — it should wait for
 * an answer rather than scroll away after seven seconds.
 *
 * Nothing is written to the file while this is open: `save` refuses without
 * `force`, and autosave skips any document with a pending conflict.
 */
export function ConflictModal() {
  const conflictId = useDocumentsStore((s) => s.conflictId);
  const doc = useDocumentsStore((s) =>
    s.documents.find((d) => d.id === s.conflictId),
  );
  const [busy, setBusy] = useState(false);

  if (!conflictId || !doc) return null;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const keepMine = () =>
    run(async () => {
      const ok = await useDocumentsStore.getState().save(conflictId, { force: true });
      if (ok) toast.success(`Overwrote ${doc.name} with your version`);
    });

  const loadTheirs = () =>
    run(async () => {
      const ok = await useDocumentsStore.getState().reloadFromDisk(conflictId);
      // Undo is the safety net here: reloadFromDisk records the incoming text
      // as a history step, so Ctrl+Z gets the user's own version back.
      if (ok) toast.info(`Loaded ${doc.name} from disk — Ctrl+Z to get your version back`);
    });

  const saveCopy = () =>
    run(async () => {
      await useDocumentsStore.getState().saveAs(conflictId);
    });

  return (
    <Modal
      isOpen
      // Dismissing leaves the document dirty and unsaved, which is the safe
      // resting state: nothing has been lost, and the decision can be made
      // later. It is not a fourth answer.
      onClose={() => useDocumentsStore.getState().dismissConflict()}
      title={`${doc.name} changed on disk`}
      description="Something else edited this file after RendMD last read it. Saving now would overwrite that change, so nothing has been written yet."
      size="sm"
    >
      <div className="flex flex-col gap-2">
        <Choice
          label="Keep mine"
          detail="Overwrite the file with the version in this tab. The change made elsewhere is lost."
          onPress={keepMine}
          disabled={busy}
        />
        <Choice
          label="Load theirs"
          detail="Replace this tab with what is on disk. Your unsaved edits move into undo history — Ctrl+Z brings them back."
          onPress={loadTheirs}
          disabled={busy}
        />
        <Choice
          label="Save a copy…"
          detail="Write your version to a different file and leave this one untouched. Keeps both."
          onPress={saveCopy}
          disabled={busy}
        />
      </div>
    </Modal>
  );
}

function Choice({
  label,
  detail,
  onPress,
  disabled,
}: {
  label: string;
  detail: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className="rounded-md border border-line px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-hover disabled:opacity-50"
    >
      <span className="block text-sm font-medium text-ink">{label}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{detail}</span>
    </button>
  );
}

export default ConflictModal;
