/**
 * File System Access API wrapper.
 *
 * RendMD's whole point is editing files that live on your disk and writing
 * them back, so this module is load-bearing. Two things it has to get right:
 *
 *   Capability, not browser sniffing. Chromium has the full API; Firefox and
 *   Safari have the parts they have. Everything here reports what is actually
 *   available and callers degrade accordingly, rather than branching on a
 *   user-agent string.
 *
 *   Permission is a gesture-scoped grant. A handle survives a reload, but the
 *   permission attached to it does not — the browser drops it back to
 *   'prompt', and re-requesting requires a user gesture. So permission is
 *   never assumed; it is checked at the point of use and re-requested from
 *   inside a click.
 */

/** True when the browser can open and write real files (Chromium today). */
export const supportsFileSystemAccess =
  typeof window !== 'undefined' && 'showOpenFilePicker' in window;

/** True when the browser can open a whole directory. */
export const supportsDirectoryPicker =
  typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd', '.mdx'] as const;

const MARKDOWN_PICKER_TYPES = [
  {
    description: 'Markdown',
    accept: { 'text/markdown': [...MARKDOWN_EXTENSIONS] },
  },
];

/** Directory names never worth walking in a documents folder. */
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  'target',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  '.cache',
  '.idea',
  '.vscode',
  '.DS_Store',
]);

export type PermissionMode = 'read' | 'readwrite';

/**
 * The permission methods are still missing from TypeScript's DOM lib, so we
 * describe the shape we use rather than casting to `any` at each call site.
 */
type PermissionCapableHandle = FileSystemHandle & {
  queryPermission?: (descriptor: { mode: PermissionMode }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: PermissionMode }) => Promise<PermissionState>;
};

declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      excludeAcceptAllOption?: boolean;
      types?: typeof MARKDOWN_PICKER_TYPES;
      id?: string;
      startIn?: string;
    }) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      excludeAcceptAllOption?: boolean;
      types?: typeof MARKDOWN_PICKER_TYPES;
      id?: string;
    }) => Promise<FileSystemFileHandle>;
    showDirectoryPicker?: (options?: {
      mode?: PermissionMode;
      id?: string;
      startIn?: string;
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

/** Raised when a picker is dismissed. Callers treat this as "nothing to do". */
export class UserCancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'UserCancelledError';
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Does this look like a markdown file we should offer to open? */
export function isMarkdownFile(name: string): boolean {
  const lower = name.toLowerCase();
  return MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function shouldIgnoreDirectory(name: string): boolean {
  return name.startsWith('.') || IGNORED_DIRECTORIES.has(name);
}

/* ── Permissions ───────────────────────────────────────────────────────── */

/** Current permission state without prompting. Safe to call outside a gesture. */
export async function queryPermission(
  handle: FileSystemHandle,
  mode: PermissionMode = 'read',
): Promise<PermissionState> {
  const h = handle as PermissionCapableHandle;
  if (!h.queryPermission) return 'granted'; // Nothing to check on this platform.
  try {
    return await h.queryPermission({ mode });
  } catch {
    return 'denied';
  }
}

/**
 * Ensure permission, prompting if needed.
 *
 * Must be called during a user gesture when the state is 'prompt', or the
 * browser rejects it. Returns false rather than throwing so callers can show
 * an inline affordance instead of an error.
 */
export async function ensurePermission(
  handle: FileSystemHandle,
  mode: PermissionMode = 'read',
): Promise<boolean> {
  const h = handle as PermissionCapableHandle;
  if (!h.queryPermission || !h.requestPermission) return true;

  try {
    if ((await h.queryPermission({ mode })) === 'granted') return true;
    return (await h.requestPermission({ mode })) === 'granted';
  } catch {
    return false;
  }
}

/* ── Reading and writing ───────────────────────────────────────────────── */

export async function readFileHandle(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

/** Last-modified time, used to notice edits made outside RendMD. */
export async function getLastModified(handle: FileSystemFileHandle): Promise<number> {
  const file = await handle.getFile();
  return file.lastModified;
}

export async function writeFileHandle(
  handle: FileSystemFileHandle,
  contents: string,
): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(contents);
  } finally {
    // close() commits the temp file over the original. If write() threw, this
    // still needs to run or the handle is left locked.
    await writable.close();
  }
}

/* ── Pickers ───────────────────────────────────────────────────────────── */

/**
 * Open one or more markdown files.
 *
 * On Chromium this returns real handles that can be written back to. Elsewhere
 * it falls back to an <input type="file">, which yields content but no handle
 * — those documents can only be saved by downloading a copy.
 */
export async function openMarkdownFiles(
  multiple = true,
): Promise<{ handle: FileSystemFileHandle | null; file: File }[]> {
  if (supportsFileSystemAccess && window.showOpenFilePicker) {
    try {
      const handles = await window.showOpenFilePicker({
        multiple,
        types: MARKDOWN_PICKER_TYPES,
        // Reopens the last-used directory across sessions.
        id: 'rendmd-documents',
      });
      return Promise.all(handles.map(async (handle) => ({ handle, file: await handle.getFile() })));
    } catch (error) {
      if (isAbort(error)) throw new UserCancelledError();
      throw error;
    }
  }

  const files = await promptWithFileInput(multiple);
  if (files.length === 0) throw new UserCancelledError();
  return files.map((file) => ({ handle: null, file }));
}

/** Choose where to write a new file. Returns null where the API is missing. */
export async function pickSaveLocation(
  suggestedName: string,
): Promise<FileSystemFileHandle | null> {
  if (!supportsFileSystemAccess || !window.showSaveFilePicker) return null;

  try {
    return await window.showSaveFilePicker({
      suggestedName,
      types: MARKDOWN_PICKER_TYPES,
      id: 'rendmd-documents',
    });
  } catch (error) {
    if (isAbort(error)) throw new UserCancelledError();
    throw error;
  }
}

/** Choose a folder to use as the workspace. Requests readwrite up front. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsDirectoryPicker || !window.showDirectoryPicker) return null;

  try {
    return await window.showDirectoryPicker({
      mode: 'readwrite',
      id: 'rendmd-workspace',
    });
  } catch (error) {
    if (isAbort(error)) throw new UserCancelledError();
    throw error;
  }
}

/** Fallback for browsers without the File System Access API. */
function promptWithFileInput(multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = MARKDOWN_EXTENSIONS.join(',');
    input.multiple = multiple;
    input.style.display = 'none';

    // 'cancel' is not universally supported; focus is the fallback signal that
    // the dialog closed. Both paths must settle the promise exactly once.
    let settled = false;
    const finish = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(files);
    };

    input.addEventListener('change', () => finish(Array.from(input.files ?? [])));
    input.addEventListener('cancel', () => finish([]));
    window.addEventListener('focus', () => setTimeout(() => finish([]), 400), { once: true });

    document.body.append(input);
    input.click();
  });
}

/** Save a copy through the browser's download path. */
export function downloadFile(name: string, contents: string, mime = 'text/markdown'): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next frame; revoking synchronously can cancel the download.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

/* ── Directory traversal ───────────────────────────────────────────────── */

export interface ScannedEntry {
  /** Slash-joined path relative to the workspace root. Also the tree node id. */
  path: string;
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  depth: number;
}

export interface ScanOptions {
  maxDepth?: number;
  maxEntries?: number;
  signal?: AbortSignal;
  /** Called as entries are found, so the tree can render while the scan runs. */
  onProgress?: (found: number) => void;
}

/**
 * Walk a directory for markdown files.
 *
 * Breadth-first, so shallow files — the ones most likely to be wanted —
 * appear first. Bounded on both depth and count: pointing RendMD at a home
 * directory should degrade to "the first few thousand files" rather than
 * hanging the tab.
 */
export async function scanDirectory(
  root: FileSystemDirectoryHandle,
  options: ScanOptions = {},
): Promise<ScannedEntry[]> {
  const { maxDepth = 8, maxEntries = 5000, signal, onProgress } = options;

  const results: ScannedEntry[] = [];
  let queue: { handle: FileSystemDirectoryHandle; prefix: string; depth: number }[] = [
    { handle: root, prefix: '', depth: 0 },
  ];

  while (queue.length > 0 && results.length < maxEntries) {
    if (signal?.aborted) break;

    const next: typeof queue = [];

    for (const { handle, prefix, depth } of queue) {
      if (signal?.aborted || results.length >= maxEntries) break;

      for await (const entry of handle.values()) {
        if (signal?.aborted || results.length >= maxEntries) break;

        const path = prefix ? `${prefix}/${entry.name}` : entry.name;

        // values() is typed as FileSystemHandle; `kind` is the discriminant
        // the spec guarantees, so narrow on it explicitly.
        if (entry.kind === 'directory') {
          if (shouldIgnoreDirectory(entry.name)) continue;
          const directory = entry as FileSystemDirectoryHandle;
          results.push({ path, name: entry.name, kind: 'directory', handle: directory, depth });
          if (depth + 1 < maxDepth) {
            next.push({ handle: directory, prefix: path, depth: depth + 1 });
          }
        } else if (isMarkdownFile(entry.name)) {
          results.push({
            path,
            name: entry.name,
            kind: 'file',
            handle: entry as FileSystemFileHandle,
            depth,
          });
        }
      }

      onProgress?.(results.length);
      // Yield to the event loop between directories so the UI stays responsive
      // on large trees.
      await Promise.resolve();
    }

    queue = next;
  }

  return results;
}

/** Resolve a slash-separated path under `root` to its file handle. */
export async function resolveFileHandle(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<FileSystemFileHandle | null> {
  const segments = path.split('/').filter(Boolean);
  const fileName = segments.pop();
  if (!fileName) return null;

  let dir = root;
  try {
    for (const segment of segments) {
      dir = await dir.getDirectoryHandle(segment);
    }
    return await dir.getFileHandle(fileName);
  } catch {
    // Moved, renamed, or deleted since the scan.
    return null;
  }
}

/**
 * Write binary data (an image, say) under `root`, creating directories as
 * needed. Separate from createFileInDirectory because that one takes text.
 */
export async function writeBinaryFile(
  root: FileSystemDirectoryHandle,
  path: string,
  data: Blob,
): Promise<FileSystemFileHandle> {
  const segments = path.split('/').filter(Boolean);
  const fileName = segments.pop();
  if (!fileName) throw new Error('A file name is required');

  let dir = root;
  for (const segment of segments) {
    dir = await dir.getDirectoryHandle(segment, { create: true });
  }

  const handle = await dir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
  } finally {
    await writable.close();
  }
  return handle;
}

/** Create a new markdown file under `root`, creating directories as needed. */
export async function createFileInDirectory(
  root: FileSystemDirectoryHandle,
  path: string,
  contents = '',
): Promise<FileSystemFileHandle> {
  const segments = path.split('/').filter(Boolean);
  const fileName = segments.pop();
  if (!fileName) throw new Error('A file name is required');

  let dir = root;
  for (const segment of segments) {
    dir = await dir.getDirectoryHandle(segment, { create: true });
  }

  const handle = await dir.getFileHandle(fileName, { create: true });
  await writeFileHandle(handle, contents);
  return handle;
}
