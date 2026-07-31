import { useMemo, useState } from 'react';
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Lock,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useWorkspaceStore, type TreeNode } from '@/stores/workspaceStore';
import { useDocumentsStore } from '@/stores/documentsStore';
import { IconButton } from '@/components/UI/IconButton';
import { cn } from '@/utils/cn';

/**
 * The workspace file tree.
 *
 * Rendered from a fully-scanned tree, so expanding a folder is instant and the
 * filter can match anything in the workspace rather than only what has been
 * expanded. Filtering flattens the result to a path list — once you're
 * searching, hierarchy is noise.
 */
export function FileTree() {
  const status = useWorkspaceStore((s) => s.status);
  const rootName = useWorkspaceStore((s) => s.rootName);
  const tree = useWorkspaceStore((s) => s.tree);
  const files = useWorkspaceStore((s) => s.files);
  const scanProgress = useWorkspaceStore((s) => s.scanProgress);
  const chooseFolder = useWorkspaceStore((s) => s.chooseFolder);
  const grantAccess = useWorkspaceStore((s) => s.grantAccess);
  const refresh = useWorkspaceStore((s) => s.refresh);
  const closeFolder = useWorkspaceStore((s) => s.closeFolder);

  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return null;
    return files.filter((file) => file.path.toLowerCase().includes(query)).slice(0, 200);
  }, [filter, files]);

  if (status === 'unsupported') {
    return (
      <EmptyPanel
        icon={<Folder size={20} />}
        title="Folders need Chrome or Edge"
        body="Opening a whole folder uses the File System Access API, which Firefox and Safari haven't shipped. You can still open individual files."
      />
    );
  }

  if (status === 'empty') {
    return (
      <EmptyPanel
        icon={<FolderPlus size={20} />}
        title="No folder open"
        body="Open the folder you keep your notes in. RendMD remembers it, so it's there next time."
        action={{ label: 'Open folder', onPress: () => void chooseFolder() }}
      />
    );
  }

  if (status === 'needs-permission') {
    return (
      <EmptyPanel
        icon={<Lock size={20} />}
        title={rootName ?? 'Folder'}
        body="Your browser drops folder access when the tab closes. One click restores it."
        action={{ label: 'Grant access', onPress: () => void grantAccess() }}
        secondary={{ label: 'Choose a different folder', onPress: () => void chooseFolder() }}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Workspace header */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span
          className="flex-1 truncate text-2xs font-medium tracking-wide text-ink-muted uppercase"
          title={rootName ?? ''}
        >
          {rootName}
        </span>
        <IconButton
          icon={<RefreshCw size={13} className={cn(status === 'scanning' && 'animate-spin')} />}
          label="Rescan folder"
          size="sm"
          onClick={() => void refresh()}
        />
        <IconButton
          icon={<X size={13} />}
          label="Close folder"
          size="sm"
          onClick={() => void closeFolder()}
        />
      </div>

      {/* Filter */}
      <div className="px-2 pb-2">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter files"
            aria-label="Filter files in workspace"
            className={cn(
              'h-7 w-full rounded-md border border-line bg-sunken pr-2 pl-7',
              'text-sm text-ink placeholder:text-ink-faint',
              'focus:border-accent focus:outline-none',
            )}
          />
        </div>
      </div>

      {/* Tree or filtered list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {status === 'scanning' && tree.length === 0 ? (
          <p className="px-3 py-2 text-sm text-ink-faint">Scanning… {scanProgress} found</p>
        ) : filtered ? (
          filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-faint">No files match “{filter}”</p>
          ) : (
            <ul>
              {filtered.map((file) => (
                <FileRow key={file.path} node={file} showPath />
              ))}
            </ul>
          )
        ) : tree.length === 0 ? (
          <p className="px-3 py-2 text-sm text-ink-faint">No markdown files in this folder.</p>
        ) : (
          <ul role="tree" aria-label="Workspace files">
            {tree.map((node) => (
              <TreeRow key={node.path} node={node} depth={0} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Rows ────────────────────────────────────────────────────────────────── */

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const expanded = useWorkspaceStore((s) => s.expanded.has(node.path));
  const toggleExpanded = useWorkspaceStore((s) => s.toggleExpanded);

  if (node.kind === 'file') {
    return <FileRow node={node} depth={depth} />;
  }

  return (
    // A folder is never the selected document, but treeitem requires the
    // attribute to be present.
    <li role="treeitem" aria-expanded={expanded} aria-selected={false}>
      <button
        type="button"
        onClick={() => toggleExpanded(node.path)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={cn(
          'flex h-7 w-full items-center gap-1.5 rounded-sm pr-2',
          'text-sm text-ink-muted hover:bg-hover hover:text-ink',
        )}
      >
        <ChevronRight
          size={12}
          className={cn('shrink-0 transition-transform duration-[120ms]', expanded && 'rotate-90')}
          aria-hidden
        />
        {expanded ? (
          <FolderOpen size={13} className="shrink-0 text-ink-faint" aria-hidden />
        ) : (
          <Folder size={13} className="shrink-0 text-ink-faint" aria-hidden />
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {expanded && node.children.length > 0 && (
        <ul role="group">
          {node.children.map((child) => (
            <TreeRow key={child.path} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function FileRow({
  node,
  depth = 0,
  showPath = false,
}: {
  node: TreeNode;
  depth?: number;
  showPath?: boolean;
}) {
  const openHandle = useDocumentsStore((s) => s.openHandle);
  const isOpen = useDocumentsStore((s) =>
    s.documents.some((doc) => doc.path === node.path && doc.id === s.activeId),
  );
  const isDirty = useDocumentsStore((s) =>
    s.documents.some((doc) => doc.path === node.path && doc.isDirty),
  );

  return (
    // aria-selected is required on treeitem, and is what conveys "this is the
    // document you're looking at" to a screen reader.
    <li role={showPath ? undefined : 'treeitem'} aria-selected={showPath ? undefined : isOpen}>
      <button
        type="button"
        onClick={() => void openHandle(node.handle as FileSystemFileHandle, { path: node.path })}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        title={node.path}
        className={cn(
          'flex h-7 w-full items-center gap-1.5 rounded-sm pr-2 text-sm',
          isOpen ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-hover hover:text-ink',
        )}
      >
        <FileText size={13} className="ml-[18px] shrink-0 opacity-70" aria-hidden />
        <span className="truncate">{showPath ? node.path : node.name}</span>
        {isDirty && (
          <span
            className="ml-auto size-1.5 shrink-0 rounded-full bg-accent"
            aria-label="Unsaved changes"
          />
        )}
      </button>
    </li>
  );
}

/* ── Empty states ────────────────────────────────────────────────────────── */

interface EmptyPanelProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}

function EmptyPanel({ icon, title, body, action, secondary }: EmptyPanelProps) {
  return (
    <div className="flex flex-1 flex-col items-start gap-2.5 px-4 py-6">
      <span className="text-ink-faint" aria-hidden>
        {icon}
      </span>
      <h2 className="text-md font-medium text-ink">{title}</h2>
      <p className="text-sm leading-relaxed text-ink-muted">{body}</p>

      {action && (
        <button
          type="button"
          onClick={action.onPress}
          className="mt-1 rounded-md bg-accent px-2.5 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-hover"
        >
          {action.label}
        </button>
      )}
      {secondary && (
        <button
          type="button"
          onClick={secondary.onPress}
          className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          {secondary.label}
        </button>
      )}
    </div>
  );
}
