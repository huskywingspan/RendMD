import { Clock, X, Trash2 } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useFileSystem } from '@/hooks';
import { formatRelativeTime } from '@/utils/recentFiles';
import type { RecentFileEntry } from '@/types';

interface RecentFilesProps {
  maxVisible?: number;
}

export function RecentFiles({ maxVisible = 5 }: RecentFilesProps): JSX.Element | null {
  const recentFiles = useEditorStore((s) => s.recentFiles);
  const removeRecentFile = useEditorStore((s) => s.removeRecentFile);
  const clearRecentFiles = useEditorStore((s) => s.clearRecentFiles);
  const { openRecentFile } = useFileSystem();

  if (recentFiles.length === 0) return null;

  const visible = recentFiles.slice(0, maxVisible);

  const handleOpen = async (entry: RecentFileEntry): Promise<void> => {
    await openRecentFile(entry);
  };

  const handleRemove = (e: React.MouseEvent, name: string): void => {
    e.stopPropagation();
    removeRecentFile(name);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--theme-text-muted)] uppercase tracking-wider">
          <Clock size={12} />
          Recent files
        </div>
        <button
          onClick={clearRecentFiles}
          className="flex items-center gap-1 text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)] transition-colors"
          title="Clear recent files"
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>

      <ul className="space-y-1" aria-label="Recent files">
        {visible.map((entry) => (
          <li key={entry.name}>
            <button
              onClick={() => handleOpen(entry)}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg border border-transparent hover:bg-[var(--theme-bg-tertiary)] hover:border-[var(--theme-border-primary)] transition-colors group"
            >
              <span className="flex-1 text-sm font-medium text-[var(--theme-text-primary)] truncate">
                {entry.name}
              </span>
              <span className="text-xs text-[var(--theme-text-muted)] whitespace-nowrap">
                {formatRelativeTime(entry.lastOpened)}
              </span>
              <span
                role="button"
                tabIndex={0}
                aria-label={`Remove ${entry.name} from recent files`}
                onClick={(e) => handleRemove(e, entry.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    removeRecentFile(entry.name);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--theme-bg-secondary)] transition-opacity"
              >
                <X size={14} className="text-[var(--theme-text-muted)]" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
