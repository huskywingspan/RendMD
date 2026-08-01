/**
 * Session persistence.
 *
 * Two things need to survive a reload, and neither fits in localStorage:
 *
 *   File and directory handles are structured-cloneable objects, not strings.
 *   IndexedDB is the only place they can live.
 *
 *   Document drafts are unbounded. localStorage caps out around 5 MB across
 *   the whole origin, which a handful of long transcripts will blow through —
 *   and it throws when it does, silently losing work.
 *
 * So both go in IndexedDB via idb-keyval, in a store namespaced to RendMD.
 */
import { createStore, get, set, del, keys } from 'idb-keyval';
import type { Frontmatter } from '@/types';

const store = createStore('rendmd', 'session');

const DOC_PREFIX = 'doc:';
const WORKSPACE_KEY = 'workspace:root';
const MANIFEST_KEY = 'session:manifest';

/** What we know about an open document without having read the file. */
export interface PersistedDocument {
  id: string;
  name: string;
  /** Path relative to the workspace root, or just the file name. */
  path: string;
  handle: FileSystemFileHandle | null;
  content: string;
  frontmatter: Frontmatter | null;
  /** Verbatim frontmatter source; see OpenDocument.frontmatterBlock. */
  frontmatterBlock: string;
  /** Text as last read from or written to disk; drives the dirty flag. */
  savedText: string;
  isDirty: boolean;
  lastSavedAt: number | null;
  scrollRatio: number;
}

/** Tab order and which one was focused. Kept apart from document payloads so
 *  reordering tabs doesn't rewrite every document. */
export interface SessionManifest {
  order: string[];
  activeId: string | null;
  updatedAt: number;
}

/* ── Documents ─────────────────────────────────────────────────────────── */

export async function saveDocument(doc: PersistedDocument): Promise<void> {
  try {
    await set(DOC_PREFIX + doc.id, doc, store);
  } catch (error) {
    console.warn('[RendMD] Could not persist document draft:', error);
  }
}

export async function loadDocument(id: string): Promise<PersistedDocument | null> {
  try {
    return (await get<PersistedDocument>(DOC_PREFIX + id, store)) ?? null;
  } catch {
    return null;
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    await del(DOC_PREFIX + id, store);
  } catch {
    // Best-effort cleanup.
  }
}

export async function loadAllDocuments(): Promise<PersistedDocument[]> {
  try {
    const allKeys = await keys(store);
    const docKeys = allKeys.filter(
      (key): key is string => typeof key === 'string' && key.startsWith(DOC_PREFIX),
    );
    const docs = await Promise.all(docKeys.map((key) => get<PersistedDocument>(key, store)));
    return docs.filter((doc): doc is PersistedDocument => Boolean(doc));
  } catch (error) {
    console.warn('[RendMD] Could not read persisted session:', error);
    return [];
  }
}

/* ── Manifest ──────────────────────────────────────────────────────────── */

export async function saveManifest(manifest: SessionManifest): Promise<void> {
  try {
    await set(MANIFEST_KEY, manifest, store);
  } catch {
    // Non-fatal: tabs reopen unordered rather than not at all.
  }
}

export async function loadManifest(): Promise<SessionManifest | null> {
  try {
    return (await get<SessionManifest>(MANIFEST_KEY, store)) ?? null;
  } catch {
    return null;
  }
}

/* ── Workspace ─────────────────────────────────────────────────────────── */

export interface PersistedWorkspace {
  handle: FileSystemDirectoryHandle;
  name: string;
  openedAt: number;
}

export async function saveWorkspace(workspace: PersistedWorkspace): Promise<void> {
  try {
    await set(WORKSPACE_KEY, workspace, store);
  } catch (error) {
    console.warn('[RendMD] Could not persist workspace handle:', error);
  }
}

export async function loadWorkspace(): Promise<PersistedWorkspace | null> {
  try {
    return (await get<PersistedWorkspace>(WORKSPACE_KEY, store)) ?? null;
  } catch {
    return null;
  }
}

export async function clearWorkspace(): Promise<void> {
  try {
    await del(WORKSPACE_KEY, store);
  } catch {
    // Best-effort cleanup.
  }
}

/** Drop everything RendMD has stored. Exposed through Settings. */
export async function clearSession(): Promise<void> {
  const allKeys = await keys(store);
  await Promise.all(allKeys.map((key) => del(key, store)));
}
