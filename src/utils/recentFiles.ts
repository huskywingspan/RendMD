import { get, set, del } from 'idb-keyval';

export interface RecentFileEntry {
  name: string;
  lastOpened: number; // Unix timestamp ms
  handleKey?: string; // Key in IndexedDB for the FileSystemFileHandle
}

export const MAX_RECENT = 8;

const HANDLE_PREFIX = 'rendmd-handle-';

/** Generate a stable handle key from the file name */
function makeHandleKey(name: string): string {
  return `${HANDLE_PREFIX}${name}`;
}

/** Store a FileSystemFileHandle in IndexedDB and return its key */
export async function storeFileHandle(
  name: string,
  handle: FileSystemFileHandle,
): Promise<string> {
  const key = makeHandleKey(name);
  try {
    await set(key, handle);
  } catch (error) {
    console.warn('[RendMD] Failed to store file handle in IndexedDB:', error);
  }
  return key;
}

/** Retrieve a FileSystemFileHandle from IndexedDB */
export async function getFileHandle(
  key: string,
): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await get<FileSystemFileHandle>(key);
    return handle ?? null;
  } catch (error) {
    console.warn('[RendMD] Failed to read file handle from IndexedDB:', error);
    return null;
  }
}

/** Remove a FileSystemFileHandle from IndexedDB */
export async function removeFileHandle(key: string): Promise<void> {
  try {
    await del(key);
  } catch {
    // Best-effort cleanup
  }
}

/** Check (and request if needed) read permission on a handle */
export async function verifyPermission(
  handle: FileSystemFileHandle,
): Promise<boolean> {
  try {
    // File System Access API permission methods aren't in all TS libs
    const h = handle as FileSystemFileHandle & {
      queryPermission: (opts: { mode: string }) => Promise<string>;
      requestPermission: (opts: { mode: string }) => Promise<string>;
    };
    const options = { mode: 'read' };
    if ((await h.queryPermission(options)) === 'granted') return true;
    if ((await h.requestPermission(options)) === 'granted') return true;
    return false;
  } catch {
    return false;
  }
}

/** Format a timestamp as a relative time string */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) === 1 ? '' : 's'} ago`;
  return new Date(timestamp).toLocaleDateString();
}
