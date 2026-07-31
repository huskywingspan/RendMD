import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderDown, Image as ImageIcon, Link2, TriangleAlert, Upload } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { Modal } from '@/components/UI/Modal';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useActiveDocument } from '@/stores/documentsStore';
import { writeBinaryFile } from '@/lib/fs';
import { toast } from '@/stores/toastStore';
import {
  fileToBase64,
  formatFileSize,
  generateImageFilename,
  isImageFile,
  IMAGE_SIZE_WARNING_THRESHOLD,
} from '@/utils/imageHelpers';
import { cn } from '@/utils/cn';

interface ImageInsertModalProps {
  editor: Editor;
  onClose: () => void;
  /** Pre-selected file, when the modal was opened by a drop or paste. */
  file?: File;
}

/**
 * Insert an image.
 *
 * Two paths, chosen by what's available rather than by making the user pick a
 * strategy:
 *
 *   With a workspace open, a chosen file is written into an `assets/` folder
 *   beside your notes and referenced by relative path. That keeps the markdown
 *   portable and the file small.
 *
 *   Otherwise it is embedded as a data URL, with a warning past a few
 *   megabytes — base64 inflates by a third and bloats the document.
 */
export function ImageInsertModal({ editor, onClose, file: initialFile }: ImageInsertModalProps) {
  const [url, setUrl] = useState('');
  const [altOverride, setAlt] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [busy, setBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceRoot = useWorkspaceStore((s) => s.root);
  const refreshWorkspace = useWorkspaceStore((s) => s.refresh);
  const doc = useActiveDocument();

  // Derived during render rather than set from an effect, so the thumbnail is
  // there on first paint. The effect exists only to release it afterwards.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  // Alt text defaults to a tidied file name until the user types something.
  // Derived rather than seeded via setState, so choosing a different file
  // updates the suggestion instead of leaving the previous one stranded.
  const suggestedAlt = file ? file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') : '';
  const alt = altOverride ?? suggestedAlt;

  const insert = useCallback(
    (src: string, altText: string) => {
      editor.chain().focus().setImage({ src, alt: altText }).run();
      onClose();
    },
    [editor, onClose],
  );

  const handleFileSubmit = useCallback(async () => {
    if (!file) return;
    setBusy(true);

    try {
      if (workspaceRoot) {
        // Alongside the document when we know where it lives, otherwise at the
        // workspace root.
        const docDir = doc?.path.includes('/')
          ? doc.path.slice(0, doc.path.lastIndexOf('/'))
          : '';
        const fileName = generateImageFilename(file);
        const relativeToRoot = docDir ? `${docDir}/assets/${fileName}` : `assets/${fileName}`;

        await writeBinaryFile(workspaceRoot, relativeToRoot, file);
        void refreshWorkspace();

        // The markdown reference is relative to the document, not the root.
        insert(`assets/${fileName}`, alt);
        toast.success(`Saved to ${relativeToRoot}`);
        return;
      }

      insert(await fileToBase64(file), alt);
    } catch (error) {
      console.error('[RendMD] Could not insert image:', error);
      toast.error('Could not insert that image');
    } finally {
      setBusy(false);
    }
  }, [file, workspaceRoot, doc, alt, insert, refreshWorkspace]);

  const oversized = file !== null && file.size > IMAGE_SIZE_WARNING_THRESHOLD;

  return (
    <Modal isOpen onClose={onClose} title="Insert image">
      <div className="flex flex-col gap-5">
        {/* From a file */}
        <section>
          <h3 className="mb-2 text-2xs font-medium tracking-wide text-ink-faint uppercase">
            From your computer
          </h3>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              if (chosen && isImageFile(chosen)) setFile(chosen);
              else if (chosen) toast.error('That file is not a supported image');
            }}
          />

          {file ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-sunken p-2.5">
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  className="size-12 shrink-0 rounded-md border border-line object-cover"
                />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-md bg-hover text-ink-faint">
                  <ImageIcon size={18} />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{file.name}</span>
                <span className="block text-xs text-ink-faint">{formatFileSize(file.size)}</span>
              </span>

              <button
                type="button"
                onClick={() => setFile(null)}
                className="shrink-0 text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line',
                'px-3 py-6 text-sm text-ink-muted hover:border-accent hover:text-ink',
              )}
            >
              <Upload size={15} aria-hidden />
              Choose an image
            </button>
          )}

          {file && (
            <>
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-ink-faint">
                <FolderDown size={13} className="mt-px shrink-0" aria-hidden />
                {workspaceRoot
                  ? 'Saved into an assets folder next to your document and linked by relative path.'
                  : 'Embedded directly in the document. Open a folder first to save it as a separate file instead.'}
              </p>

              {oversized && !workspaceRoot && (
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-warning">
                  <TriangleAlert size={13} className="mt-px shrink-0" aria-hidden />
                  This image is {formatFileSize(file.size)}. Embedding it will add roughly{' '}
                  {formatFileSize(file.size * 1.37)} of base64 to the file.
                </p>
              )}
            </>
          )}
        </section>

        {/* From a URL */}
        <section>
          <h3 className="mb-2 text-2xs font-medium tracking-wide text-ink-faint uppercase">
            From a link
          </h3>
          <div className="relative">
            <Link2
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/diagram.png"
              aria-label="Image URL"
              className="h-9 w-full rounded-md border border-line bg-sunken pr-2.5 pl-8 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
          </div>
        </section>

        {/* Alt text */}
        <section>
          <label
            htmlFor="image-alt"
            className="mb-2 block text-2xs font-medium tracking-wide text-ink-faint uppercase"
          >
            Alt text
          </label>
          <input
            id="image-alt"
            type="text"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="What the image shows"
            className="h-9 w-full rounded-md border border-line bg-sunken px-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            Describes the image to screen readers, and shows if it fails to load.
          </p>
        </section>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-ink-muted hover:bg-hover hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || (!file && !url.trim())}
            onClick={() => {
              if (file) void handleFileSubmit();
              else if (url.trim()) insert(url.trim(), alt);
            }}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? 'Inserting…' : 'Insert'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ImageInsertModal;
