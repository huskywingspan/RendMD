import { FileText, FolderOpen, Keyboard } from 'lucide-react';
import { useFileSystem } from '@/hooks';
import { useEditorStore } from '@/stores/editorStore';

export function EmptyState(): JSX.Element {
  const { openFile } = useFileSystem();
  const { setShortcutsModalOpen } = useEditorStore();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--theme-bg-tertiary)] flex items-center justify-center">
            <FileText size={32} className="text-[var(--theme-text-muted)]" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[var(--theme-text-primary)]">
            Welcome to RendMD
          </h2>
          <p className="text-sm text-[var(--theme-text-muted)] leading-relaxed">
            The thinking person's markdown editor. Start typing below, or open an existing file to get started.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => openFile()}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[var(--theme-accent-primary)] text-white hover:opacity-90 transition-opacity"
          >
            <FolderOpen size={16} />
            Open File
          </button>
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-[var(--theme-border-primary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          >
            <Keyboard size={16} />
            Shortcuts
          </button>
        </div>

        <div className="pt-2 text-xs text-[var(--theme-text-muted)] space-y-1">
          <p><kbd className="px-1.5 py-0.5 rounded bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] font-mono text-xs">Ctrl+O</kbd> to open a file</p>
          <p><kbd className="px-1.5 py-0.5 rounded bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] font-mono text-xs">Ctrl+S</kbd> to save</p>
          <p><kbd className="px-1.5 py-0.5 rounded bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] font-mono text-xs">Ctrl+/</kbd> to switch views</p>
        </div>
      </div>
    </div>
  );
}
