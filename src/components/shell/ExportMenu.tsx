import { useEffect, useRef, useState } from 'react';
import { ClipboardCopy, Download, FileCode2, Printer } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { exportAsHTML, exportAsPDF, copyAsRichText } from '@/utils/exportHelpers';
import { useActiveDocument, documentText } from '@/stores/documentsStore';
import { downloadFile } from '@/lib/fs';
import { toast } from '@/stores/toastStore';
import { IconButton } from '@/components/UI/IconButton';
import { cn } from '@/utils/cn';

/**
 * Export menu.
 *
 * Kept in the title bar rather than folded into the palette because these are
 * options you want to see before choosing — "as HTML" and "as PDF" are not
 * things people search for by name.
 */
export function ExportMenu({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const doc = useActiveDocument();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const disabled = !editor || !doc;

  const run = (action: () => void | Promise<void>) => async () => {
    setOpen(false);
    try {
      await action();
    } catch (error) {
      console.error('[RendMD] Export failed:', error);
      toast.error('Export failed');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        icon={<Download size={15} />}
        label="Export"
        onClick={() => setOpen((value) => !value)}
        active={open}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
      />

      {open && !disabled && (
        <div
          role="menu"
          className={cn(
            'absolute top-full right-0 z-50 mt-1 w-56 rounded-lg border border-line',
            'bg-overlay py-1 shadow-lg animate-[menu-in_120ms_ease-out]',
          )}
        >
          <MenuItem
            icon={<Download size={14} />}
            label="Download as Markdown"
            onPress={run(() => {
              if (doc) downloadFile(doc.name, documentText(doc));
            })}
          />
          <MenuItem
            icon={<FileCode2 size={14} />}
            label="Export as HTML"
            onPress={run(() => {
              if (editor && doc) exportAsHTML(editor, doc.name);
            })}
          />
          <MenuItem
            icon={<Printer size={14} />}
            label="Print / Save as PDF"
            onPress={run(() => {
              if (editor) exportAsPDF(editor);
            })}
          />

          <div className="my-1 h-px bg-line" role="separator" />

          <MenuItem
            icon={<ClipboardCopy size={14} />}
            label="Copy as rich text"
            onPress={run(async () => {
              if (!editor) return;
              await copyAsRichText(editor);
              toast.success('Copied as rich text');
            })}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onPress}
      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-ink-muted hover:bg-hover hover:text-ink"
    >
      <span className="text-ink-faint" aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  );
}
