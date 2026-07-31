import { create } from 'zustand';
import {
  UserCancelledError,
  createFileInDirectory,
  ensurePermission,
  pickDirectory,
  queryPermission,
  scanDirectory,
  supportsDirectoryPicker,
  type ScannedEntry,
} from '@/lib/fs';
import { clearWorkspace, loadWorkspace, saveWorkspace } from '@/lib/sessionStore';
import { toast } from '@/stores/toastStore';

/**
 * The folder workspace.
 *
 * Point RendMD at a directory once and it stays pointed there: the handle is
 * kept in IndexedDB, so the tree is back on the next launch without another
 * picker. What does *not* survive is the permission grant — Chromium resets it
 * to 'prompt' on reload — so a restored workspace sits in a
 * 'needs-permission' state until a click lets us ask for it back.
 *
 * The scan is eager and bounded. Walking the whole tree up front costs a
 * second on a large folder but makes the command palette able to fuzzy-match
 * every file instantly, which is the point of having a workspace at all.
 */

export interface TreeNode {
  /** Path relative to the root. Unique, and used as the React key. */
  path: string;
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  children: TreeNode[];
  depth: number;
}

export type WorkspaceStatus =
  | 'empty'
  | 'scanning'
  | 'ready'
  | 'needs-permission'
  | 'unsupported'
  | 'error';

interface WorkspaceState {
  root: FileSystemDirectoryHandle | null;
  rootName: string | null;
  status: WorkspaceStatus;
  tree: TreeNode[];
  /** Flat list of files only — what the palette and quick-open search over. */
  files: TreeNode[];
  expanded: Set<string>;
  scanProgress: number;
  error: string | null;

  chooseFolder: () => Promise<void>;
  restoreFolder: () => Promise<void>;
  grantAccess: () => Promise<boolean>;
  closeFolder: () => Promise<void>;
  refresh: () => Promise<void>;
  toggleExpanded: (path: string) => void;
  expandTo: (path: string) => void;
  createFile: (relativePath: string, contents?: string) => Promise<FileSystemFileHandle | null>;
}

let scanController: AbortController | null = null;

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => {
  async function scan(root: FileSystemDirectoryHandle): Promise<void> {
    scanController?.abort();
    scanController = new AbortController();

    set({ status: 'scanning', scanProgress: 0, error: null });

    try {
      const entries = await scanDirectory(root, {
        signal: scanController.signal,
        onProgress: (found) => set({ scanProgress: found }),
      });

      const tree = buildTree(entries);
      set({
        tree,
        files: flattenFiles(tree),
        status: 'ready',
        scanProgress: entries.length,
      });
    } catch (error) {
      console.error('[RendMD] Workspace scan failed:', error);
      set({ status: 'error', error: 'Could not read that folder' });
    }
  }

  return {
    root: null,
    rootName: null,
    status: supportsDirectoryPicker ? 'empty' : 'unsupported',
    tree: [],
    files: [],
    expanded: new Set<string>(),
    scanProgress: 0,
    error: null,

    async chooseFolder() {
      try {
        const root = await pickDirectory();
        if (!root) {
          set({ status: 'unsupported' });
          return;
        }

        set({ root, rootName: root.name, expanded: new Set() });
        await saveWorkspace({ handle: root, name: root.name, openedAt: Date.now() });
        await scan(root);
      } catch (error) {
        if (error instanceof UserCancelledError) return;
        console.error('[RendMD] Could not open folder:', error);
        toast.error('Could not open that folder');
      }
    },

    async restoreFolder() {
      if (!supportsDirectoryPicker) {
        set({ status: 'unsupported' });
        return;
      }

      const saved = await loadWorkspace();
      if (!saved) return;

      set({ root: saved.handle, rootName: saved.name });

      // Silent path: the browser sometimes keeps the grant, in which case the
      // tree can just appear.
      if ((await queryPermission(saved.handle, 'read')) === 'granted') {
        await scan(saved.handle);
      } else {
        set({ status: 'needs-permission' });
      }
    },

    async grantAccess() {
      const { root } = get();
      if (!root) return false;

      // Only reachable from a click — requestPermission needs a user gesture.
      const granted = await ensurePermission(root, 'readwrite');
      if (!granted) {
        toast.error('RendMD needs access to that folder to show your files');
        return false;
      }

      await scan(root);
      return true;
    },

    async closeFolder() {
      scanController?.abort();
      await clearWorkspace();
      set({
        root: null,
        rootName: null,
        tree: [],
        files: [],
        expanded: new Set(),
        status: supportsDirectoryPicker ? 'empty' : 'unsupported',
        scanProgress: 0,
        error: null,
      });
    },

    async refresh() {
      const { root } = get();
      if (root) await scan(root);
    },

    toggleExpanded(path) {
      set((state) => {
        const expanded = new Set(state.expanded);
        if (expanded.has(path)) expanded.delete(path);
        else expanded.add(path);
        return { expanded };
      });
    },

    expandTo(path) {
      // Open every ancestor so a file revealed from the palette is visible.
      set((state) => {
        const expanded = new Set(state.expanded);
        const segments = path.split('/');
        for (let i = 1; i < segments.length; i += 1) {
          expanded.add(segments.slice(0, i).join('/'));
        }
        return { expanded };
      });
    },

    async createFile(relativePath, contents = '') {
      const { root } = get();
      if (!root) return null;

      if (!(await ensurePermission(root, 'readwrite'))) {
        toast.error('RendMD needs write access to create files here');
        return null;
      }

      try {
        const handle = await createFileInDirectory(root, relativePath, contents);
        await get().refresh();
        get().expandTo(relativePath);
        return handle;
      } catch (error) {
        console.error('[RendMD] Could not create file:', error);
        toast.error('Could not create that file');
        return null;
      }
    },
  };
});

/* ── Tree construction ───────────────────────────────────────────────────── */

/**
 * Turn the flat scan result into a tree.
 *
 * The scan is breadth-first, so a parent is always seen before its children
 * and a single pass suffices. Directories that turned out to contain no
 * markdown are pruned — an empty folder in the sidebar is just noise.
 */
function buildTree(entries: ScannedEntry[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const entry of entries) {
    const node: TreeNode = {
      path: entry.path,
      name: entry.name,
      kind: entry.kind,
      handle: entry.handle,
      children: [],
      depth: entry.depth,
    };
    nodes.set(entry.path, node);

    const parentPath = entry.path.slice(0, entry.path.lastIndexOf('/'));
    const parent = parentPath ? nodes.get(parentPath) : undefined;

    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return sortNodes(pruneEmpty(roots));
}

function pruneEmpty(nodes: TreeNode[]): TreeNode[] {
  return nodes.filter((node) => {
    if (node.kind === 'file') return true;
    node.children = pruneEmpty(node.children);
    return node.children.length > 0;
  });
}

/** Folders first, then files, each alphabetical and number-aware. */
function sortNodes(nodes: TreeNode[]): TreeNode[] {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  for (const node of nodes) {
    if (node.children.length > 0) sortNodes(node.children);
  }

  return nodes;
}

function flattenFiles(nodes: TreeNode[]): TreeNode[] {
  const files: TreeNode[] = [];

  const walk = (list: TreeNode[]): void => {
    for (const node of list) {
      if (node.kind === 'file') files.push(node);
      else walk(node.children);
    }
  };

  walk(nodes);
  return files;
}
