/**
 * Module-level singleton to share file handle across the app.
 * Extracted to its own module to avoid circular dependencies
 * between editorStore and useFileSystem.
 */

let sharedFileHandle: FileSystemFileHandle | null = null;

export function getSharedFileHandle(): FileSystemFileHandle | null {
  return sharedFileHandle;
}

export function setSharedFileHandle(handle: FileSystemFileHandle | null): void {
  sharedFileHandle = handle;
}
