import { FilePlus2, FolderOpen, FolderTree, Keyboard, Upload } from 'lucide-react';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUIStore } from '@/stores/uiStore';
import { supportsDirectoryPicker } from '@/lib/fs';
import { cn } from '@/utils/cn';

/**
 * Shown when nothing is open.
 *
 * The one thing worth pushing here is opening a folder: it is the difference
 * between RendMD as a file viewer and RendMD as somewhere you work, and it is
 * the step nobody discovers on their own.
 */
export function Welcome() {
  const openFiles = useDocumentsStore((s) => s.openFiles);
  const newDocument = useDocumentsStore((s) => s.newDocument);
  const chooseFolder = useWorkspaceStore((s) => s.chooseFolder);
  const workspaceStatus = useWorkspaceStore((s) => s.status);
  const openOverlay = useUIStore((s) => s.openOverlay);

  const hasWorkspace = workspaceStatus === 'ready' || workspaceStatus === 'scanning';

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
      <div className="w-full max-w-lg">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink">RendMD</h1>
        <p className="mt-1.5 text-md leading-relaxed text-ink-muted">
          Open a markdown file, read it properly, edit it in place, and save it straight back to
          disk. Nothing is uploaded anywhere.
        </p>

        <div className="mt-7 flex flex-col gap-2">
          {!hasWorkspace && supportsDirectoryPicker && (
            <PrimaryAction
              icon={<FolderTree size={17} />}
              title="Open a folder"
              description="Browse and search every markdown file inside it. RendMD remembers the folder between visits."
              onPress={() => void chooseFolder()}
            />
          )}

          <SecondaryAction
            icon={<FolderOpen size={15} />}
            label="Open a file"
            shortcut="Ctrl+O"
            onPress={() => void openFiles()}
          />
          <SecondaryAction
            icon={<FilePlus2 size={15} />}
            label="New document"
            shortcut="Ctrl+N"
            onPress={() => newDocument()}
          />
          <SecondaryAction
            icon={<Keyboard size={15} />}
            label="Keyboard shortcuts"
            shortcut="Ctrl+/"
            onPress={() => openOverlay('shortcuts')}
          />
        </div>

        <p className="mt-7 flex items-center gap-2 text-sm text-ink-faint">
          <Upload size={14} aria-hidden />
          You can also drop a <code className="font-mono text-xs">.md</code> file anywhere on this
          window.
        </p>

        {!supportsDirectoryPicker && (
          <p className="mt-3 text-sm leading-relaxed text-ink-faint">
            This browser can't open folders or save in place — that needs Chrome or Edge. Opening
            individual files works, and saving will download a copy.
          </p>
        )}
      </div>
    </div>
  );
}

function PrimaryAction({
  icon,
  title,
  description,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        'group flex items-start gap-3 rounded-lg border border-line bg-surface p-3.5 text-left',
        'transition-colors duration-[120ms] hover:border-accent hover:bg-hover',
      )}
    >
      <span className="mt-0.5 text-accent" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-md font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">{description}</span>
      </span>
    </button>
  );
}

function SecondaryAction({
  icon,
  label,
  shortcut,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm',
        'text-ink-muted transition-colors duration-[120ms] hover:bg-hover hover:text-ink',
      )}
    >
      <span className="text-ink-faint" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <kbd className="kbd">{shortcut}</kbd>
    </button>
  );
}
