import { FileText, FolderOpen, Keyboard } from 'lucide-react';
import { useFileSystem } from '@/hooks';
import { useEditorStore } from '@/stores/editorStore';
import { TEMPLATES, getTemplateContent } from '@/utils/templates';
import { RecentFiles } from './RecentFiles';

export function EmptyState() {
  const { openFile } = useFileSystem();
  const { setShortcutsModalOpen, newFile } = useEditorStore();

  const handleTemplate = (id: string): void => {
    const content = getTemplateContent(id);
    newFile(content);
    // For non-blank templates, set content + mark dirty
    if (content) {
      useEditorStore.getState().setContent(content);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-lg space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-sunken flex items-center justify-center">
            <FileText size={32} className="text-ink-faint" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-ink">
            Welcome to RendMD
          </h2>
          <p className="text-sm text-ink-faint leading-relaxed">
            The thinking person's markdown editor. Pick a template or open an existing file.
          </p>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-md mx-auto">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTemplate(t.id)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-line hover:bg-sunken hover:border-accent transition-colors text-center"
            >
              <span className="text-2xl" role="img" aria-label={t.label}>{t.icon}</span>
              <span className="text-sm font-medium text-ink">{t.label}</span>
              <span className="text-xs text-ink-faint leading-tight">{t.description}</span>
            </button>
          ))}
        </div>

        {/* Recent files */}
        <RecentFiles maxVisible={5} />

        {/* Actions row */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => openFile()}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
          >
            <FolderOpen size={16} />
            Open File
          </button>
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-line text-ink-muted hover:bg-sunken transition-colors"
          >
            <Keyboard size={16} />
            Shortcuts
          </button>
        </div>

        <div className="pt-2 text-xs text-ink-faint space-y-1">
          <p><kbd className="px-1.5 py-0.5 rounded bg-sunken text-ink-muted font-mono text-xs">Ctrl+N</kbd> new file</p>
          <p><kbd className="px-1.5 py-0.5 rounded bg-sunken text-ink-muted font-mono text-xs">Ctrl+O</kbd> open file</p>
          <p><kbd className="px-1.5 py-0.5 rounded bg-sunken text-ink-muted font-mono text-xs">Ctrl+/</kbd> switch views</p>
        </div>
      </div>
    </div>
  );
}
