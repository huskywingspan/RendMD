import { create } from 'zustand';
import type { Frontmatter } from '@/types';
import {
  UserCancelledError,
  downloadFile,
  ensurePermission,
  openMarkdownFiles,
  pickSaveLocation,
  queryPermission,
  readFileHandle,
  writeFileHandle,
} from '@/lib/fs';
import {
  parseFrontmatter,
  joinDocument,
  renderFrontmatterBlock,
} from '@/utils/frontmatterParser';
import {
  deleteDocument,
  loadAllDocuments,
  loadManifest,
  saveDocument,
  saveManifest,
  type PersistedDocument,
} from '@/lib/sessionStore';
import { toast } from '@/stores/toastStore';
import {
  createHistory,
  record as recordHistory,
  undo as undoHistory,
  redo as redoHistory,
  canUndo as historyCanUndo,
  canRedo as historyCanRedo,
  type DocumentHistory,
} from '@/lib/history';

/**
 * Open documents.
 *
 * RendMD holds several documents at once, one per tab. Each carries its own
 * content, dirty state, and — where the browser allows it — a live handle to
 * the file on disk, so Ctrl+S writes back to the original rather than dropping
 * a copy in Downloads.
 *
 * Dirty tracking is explicit rather than derived from comparing text. A
 * rendered-first editor round-trips markdown through ProseMirror, and that
 * normalises things (bullet characters, emphasis markers, trailing spaces).
 * Comparing serialised output against the file would mark almost every
 * document dirty the moment it opened, and saving would silently reformat
 * files the user only meant to read. Instead the flag is set by real edits and
 * nothing is ever written unless it is set.
 */

export interface OpenDocument {
  id: string;
  /** File name including extension, e.g. "notes.md". */
  name: string;
  /** Path relative to the workspace root, or the bare name when standalone. */
  path: string;
  /** Live handle, or null when the browser could not give us one. */
  handle: FileSystemFileHandle | null;
  /** Markdown body, frontmatter excluded. */
  content: string;
  /**
   * Parsed view of the frontmatter, for the panel. Derived and lossy — never
   * the source of truth for what gets written.
   */
  frontmatter: Frontmatter | null;
  /**
   * The frontmatter source verbatim, delimiters and trailing newline included,
   * or '' when the document has none.
   *
   * This is what makes saving lossless. Rebuilding the header from the parsed
   * object drops YAML comments, rewrites quoting and normalises line endings,
   * so a document would be silently rewritten just by being opened and
   * touched. Only the frontmatter panel regenerates this, and only when it
   * actually edits a field.
   */
  frontmatterBlock: string;
  /** Exact text last read from or written to disk. Used by "revert". */
  savedText: string;
  isDirty: boolean;
  lastSavedAt: number | null;
  /** Scroll position as a 0–1 ratio, so it survives a change of window size. */
  scrollRatio: number;
  /** True once a document has never touched disk (Save writes via a picker). */
  isUntitled: boolean;
  /**
   * Whole-text undo history, fed by both panes.
   *
   * Deliberately not persisted: it is per-session working memory, and writing
   * a few hundred document snapshots to IndexedDB on every keystroke would
   * cost far more than it saves.
   */
  history: DocumentHistory;
  /**
   * Bumped whenever the text is replaced from outside the editing panes —
   * undo, redo, revert, reload from disk.
   *
   * The panes normally ignore incoming content while focused, so the user's
   * own typing is never overwritten mid-keystroke. But an undo *must* land
   * even in the pane you are typing in, so this gives the panes a way to tell
   * "someone replaced the document" apart from "here is your own edit coming
   * back", without weakening the guard that matters.
   */
  revision: number;
}

interface DocumentsState {
  documents: OpenDocument[];
  activeId: string | null;
  /** True while the previous session is being read back from IndexedDB. */
  isRestoring: boolean;

  openFiles: () => Promise<void>;
  openHandle: (
    handle: FileSystemFileHandle,
    options?: { path?: string; activate?: boolean },
  ) => Promise<string | null>;
  openTextFile: (file: File, handle?: FileSystemFileHandle | null) => Promise<string>;
  newDocument: (content?: string, name?: string) => string;

  setActive: (id: string) => void;
  activateNext: (delta: number) => void;
  close: (id: string) => Promise<void>;
  closeOthers: (id: string) => Promise<void>;
  moveTab: (fromIndex: number, toIndex: number) => void;

  setContent: (id: string, content: string) => void;
  undo: (id: string) => boolean;
  redo: (id: string) => boolean;
  setFrontmatter: (id: string, frontmatter: Frontmatter | null) => void;
  setScrollRatio: (id: string, ratio: number) => void;
  replaceDocumentText: (id: string, text: string) => void;

  save: (id: string) => Promise<boolean>;
  saveAs: (id: string) => Promise<boolean>;
  saveAll: () => Promise<void>;
  revert: (id: string) => Promise<boolean>;
  reloadFromDisk: (id: string) => Promise<boolean>;

  restoreSession: () => Promise<void>;
}

let untitledCounter = 0;

function createId(): string {
  return crypto.randomUUID();
}

/**
 * Full document text — what gets written to disk and shown in source view.
 *
 * A plain concatenation, deliberately. See OpenDocument.frontmatterBlock.
 */
export function documentText(doc: OpenDocument): string {
  return joinDocument(doc.frontmatterBlock, doc.content);
}

export const useDocumentsStore = create<DocumentsState>()((set, get) => {
  /** Apply a change to one document and persist the result. */
  function patch(id: string, updater: (doc: OpenDocument) => OpenDocument): void {
    let updated: OpenDocument | undefined;

    set((state) => ({
      documents: state.documents.map((doc) => {
        if (doc.id !== id) return doc;
        updated = updater(doc);
        return updated;
      }),
    }));

    if (updated) void persist(updated);
  }

  function persist(doc: OpenDocument): Promise<void> {
    return saveDocument(toPersisted(doc));
  }

  function persistManifest(): void {
    const { documents, activeId } = get();
    void saveManifest({
      order: documents.map((doc) => doc.id),
      activeId,
      updatedAt: Date.now(),
    });
  }

  function addDocument(doc: OpenDocument, activate = true): string {
    set((state) => ({
      documents: [...state.documents, doc],
      activeId: activate ? doc.id : (state.activeId ?? doc.id),
    }));
    void persist(doc);
    persistManifest();
    return doc.id;
  }

  return {
    documents: [],
    activeId: null,
    isRestoring: true,

    /* ── Opening ───────────────────────────────────────────────────────── */

    async openFiles() {
      try {
        const picked = await openMarkdownFiles(true);
        let firstId: string | null = null;

        for (const { handle, file } of picked) {
          const id = handle
            ? await get().openHandle(handle, { activate: false })
            : await get().openTextFile(file, null);
          firstId ??= id;
        }

        if (firstId) get().setActive(firstId);
      } catch (error) {
        if (error instanceof UserCancelledError) return;
        console.error('[RendMD] Failed to open files:', error);
        toast.error('Could not open that file');
      }
    },

    async openHandle(handle, options = {}) {
      const { path, activate = true } = options;

      // Already open? Focus it rather than opening a second copy.
      const existing = await findOpenDocumentFor(get().documents, handle, path);
      if (existing) {
        if (activate) get().setActive(existing.id);
        return existing.id;
      }

      if (!(await ensurePermission(handle, 'read'))) {
        toast.error(`Permission denied for ${handle.name}`);
        return null;
      }

      try {
        const text = await readFileHandle(handle);
        const parsed = parseFrontmatter(text);

        return addDocument(
          {
            id: createId(),
            name: handle.name,
            path: path ?? handle.name,
            handle,
            content: parsed.content,
            frontmatter: parsed.frontmatter,
            frontmatterBlock: parsed.block,
            savedText: text,
            isDirty: false,
            lastSavedAt: Date.now(),
            scrollRatio: 0,
            isUntitled: false,
            history: createHistory(text),
            revision: 0,
          },
          activate,
        );
      } catch (error) {
        console.error('[RendMD] Failed to read file:', error);
        toast.error(`Could not read ${handle.name}`);
        return null;
      }
    },

    async openTextFile(file, handle = null) {
      // Reached via <input type="file"> or a drag-and-drop that yielded no
      // handle: we get the content but nothing to write back to.
      const text = await file.text();
      const parsed = parseFrontmatter(text);

      return addDocument({
        id: createId(),
        name: file.name,
        path: file.name,
        handle,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        frontmatterBlock: parsed.block,
        savedText: text,
        isDirty: false,
        lastSavedAt: null,
        scrollRatio: 0,
        isUntitled: false,
        history: createHistory(text),
        revision: 0,
      });
    },

    newDocument(content = '', name) {
      untitledCounter += 1;
      const parsed = parseFrontmatter(content);

      return addDocument({
        id: createId(),
        name: name ?? (untitledCounter === 1 ? 'Untitled.md' : `Untitled ${untitledCounter}.md`),
        path: name ?? 'Untitled.md',
        handle: null,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        frontmatterBlock: parsed.block,
        savedText: '',
        // A template counts as content worth keeping, so it starts dirty.
        isDirty: content.length > 0,
        lastSavedAt: null,
        scrollRatio: 0,
        isUntitled: true,
        history: createHistory(content),
        revision: 0,
      });
    },

    /* ── Tabs ──────────────────────────────────────────────────────────── */

    setActive(id) {
      set({ activeId: id });
      persistManifest();
    },

    activateNext(delta) {
      const { documents, activeId } = get();
      if (documents.length === 0) return;

      const index = documents.findIndex((doc) => doc.id === activeId);
      // Wrap in both directions.
      const next = (index + delta + documents.length) % documents.length;
      get().setActive(documents[next].id);
    },

    async close(id) {
      const { documents, activeId } = get();
      const index = documents.findIndex((doc) => doc.id === id);
      if (index === -1) return;

      const remaining = documents.filter((doc) => doc.id !== id);
      // Focus the neighbour to the right, or to the left when closing the last.
      const nextActive =
        activeId === id ? (remaining[index]?.id ?? remaining[index - 1]?.id ?? null) : activeId;

      set({ documents: remaining, activeId: nextActive });
      await deleteDocument(id);
      persistManifest();
    },

    async closeOthers(id) {
      const others = get().documents.filter((doc) => doc.id !== id);
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id === id),
        activeId: id,
      }));
      await Promise.all(others.map((doc) => deleteDocument(doc.id)));
      persistManifest();
    },

    moveTab(fromIndex, toIndex) {
      set((state) => {
        const documents = [...state.documents];
        const [moved] = documents.splice(fromIndex, 1);
        if (!moved) return state;
        documents.splice(toIndex, 0, moved);
        return { documents };
      });
      persistManifest();
    },

    /* ── Editing ───────────────────────────────────────────────────────── */

    setContent(id, content) {
      patch(id, (doc) => {
        if (doc.content === content) return doc;
        const next = { ...doc, content, isDirty: true };
        return { ...next, history: recordHistory(doc.history, documentText(next)) };
      });
    },

    setFrontmatter(id, frontmatter) {
      // The only place the header is rewritten, and here it is the point:
      // the user edited a field in the frontmatter panel.
      patch(id, (doc) => {
        const next = {
          ...doc,
          frontmatter,
          frontmatterBlock: renderFrontmatterBlock(frontmatter),
          isDirty: true,
        };
        return { ...next, history: recordHistory(doc.history, documentText(next)) };
      });
    },

    setScrollRatio(id, ratio) {
      // Deliberately not persisted on every scroll event; it rides along with
      // the next content write instead.
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, scrollRatio: ratio } : doc,
        ),
      }));
    },

    replaceDocumentText(id, text) {
      const parsed = parseFrontmatter(text);
      patch(id, (doc) => ({
        ...doc,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        frontmatterBlock: parsed.block,
        isDirty: true,
        history: recordHistory(doc.history, text),
      }));
    },

    /* ── Undo ──────────────────────────────────────────────────────────────
     * Whole-document, so a step means the same thing whichever pane made the
     * change. Applied by replaying the text back through the parser, which
     * keeps the frontmatter block and body consistent with each other.
     * ─────────────────────────────────────────────────────────────────── */

    undo(id) {
      const doc = get().documents.find((d) => d.id === id);
      if (!doc) return false;

      const stepped = undoHistory(doc.history);
      if (!stepped) return false;

      const parsed = parseFrontmatter(stepped.text);
      patch(id, (current) => ({
        ...current,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        frontmatterBlock: parsed.block,
        // Restoring to exactly what is on disk is not a pending change.
        isDirty: stepped.text !== current.savedText,
        history: stepped.history,
        revision: current.revision + 1,
      }));
      return true;
    },

    redo(id) {
      const doc = get().documents.find((d) => d.id === id);
      if (!doc) return false;

      const stepped = redoHistory(doc.history);
      if (!stepped) return false;

      const parsed = parseFrontmatter(stepped.text);
      patch(id, (current) => ({
        ...current,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        frontmatterBlock: parsed.block,
        isDirty: stepped.text !== current.savedText,
        history: stepped.history,
        revision: current.revision + 1,
      }));
      return true;
    },

    /* ── Persistence ───────────────────────────────────────────────────── */

    async save(id) {
      const doc = get().documents.find((d) => d.id === id);
      if (!doc) return false;
      if (!doc.isDirty && doc.handle) return true; // Nothing to write.

      if (!doc.handle) return get().saveAs(id);

      // The grant may have lapsed since the file was opened.
      if (!(await ensurePermission(doc.handle, 'readwrite'))) {
        toast.error(`RendMD needs permission to write ${doc.name}`);
        return false;
      }

      const text = documentText(doc);

      try {
        await writeFileHandle(doc.handle, text);
        patch(id, (current) => ({
          ...current,
          savedText: text,
          isDirty: false,
          lastSavedAt: Date.now(),
        }));
        return true;
      } catch (error) {
        console.error('[RendMD] Save failed:', error);
        toast.error(`Could not save ${doc.name}`);
        return false;
      }
    },

    async saveAs(id) {
      const doc = get().documents.find((d) => d.id === id);
      if (!doc) return false;

      const text = documentText(doc);

      try {
        const handle = await pickSaveLocation(doc.name);

        if (!handle) {
          // No File System Access API — the best we can do is hand over a copy.
          downloadFile(doc.name, text);
          patch(id, (current) => ({
            ...current,
            savedText: text,
            isDirty: false,
            lastSavedAt: Date.now(),
          }));
          toast.success(`Downloaded ${doc.name}`);
          return true;
        }

        await writeFileHandle(handle, text);
        patch(id, (current) => ({
          ...current,
          handle,
          name: handle.name,
          path: handle.name,
          savedText: text,
          isDirty: false,
          isUntitled: false,
          lastSavedAt: Date.now(),
        }));
        return true;
      } catch (error) {
        if (error instanceof UserCancelledError) return false;
        console.error('[RendMD] Save As failed:', error);
        toast.error('Could not save the file');
        return false;
      }
    },

    async saveAll() {
      const dirty = get().documents.filter((doc) => doc.isDirty);
      let saved = 0;

      for (const doc of dirty) {
        // Sequential: each may raise its own permission prompt, and browsers
        // collapse or drop concurrent ones.
        if (await get().save(doc.id)) saved += 1;
      }

      if (saved > 0) toast.success(`Saved ${saved} file${saved === 1 ? '' : 's'}`);
    },

    async revert(id) {
      const doc = get().documents.find((d) => d.id === id);
      if (!doc) return false;

      const parsed = parseFrontmatter(doc.savedText);
      patch(id, (current) => ({
        ...current,
        content: parsed.content,
        frontmatter: parsed.frontmatter,
        frontmatterBlock: parsed.block,
        isDirty: false,
        history: recordHistory(current.history, doc.savedText),
        revision: current.revision + 1,
      }));
      return true;
    },

    async reloadFromDisk(id) {
      const doc = get().documents.find((d) => d.id === id);
      if (!doc?.handle) return false;

      if (!(await ensurePermission(doc.handle, 'read'))) return false;

      try {
        const text = await readFileHandle(doc.handle);
        const parsed = parseFrontmatter(text);
        patch(id, (current) => ({
          ...current,
          content: parsed.content,
          frontmatter: parsed.frontmatter,
          frontmatterBlock: parsed.block,
          savedText: text,
          isDirty: false,
          lastSavedAt: Date.now(),
          history: recordHistory(current.history, text),
          revision: current.revision + 1,
        }));
        return true;
      } catch (error) {
        console.error('[RendMD] Reload failed:', error);
        return false;
      }
    },

    /* ── Session restore ───────────────────────────────────────────────── */

    async restoreSession() {
      try {
        const [persisted, manifest] = await Promise.all([loadAllDocuments(), loadManifest()]);

        if (persisted.length === 0) {
          set({ isRestoring: false });
          return;
        }

        // Restore the order the tabs were left in; anything the manifest
        // doesn't know about goes on the end.
        const order = manifest?.order ?? [];
        const byId = new Map(persisted.map((doc) => [doc.id, doc]));
        const ordered = [
          ...order.map((id) => byId.get(id)).filter((d): d is PersistedDocument => Boolean(d)),
          ...persisted.filter((doc) => !order.includes(doc.id)),
        ];

        const documents = ordered.map(fromPersisted);
        const activeId =
          manifest?.activeId && documents.some((doc) => doc.id === manifest.activeId)
            ? manifest.activeId
            : (documents[0]?.id ?? null);

        set({ documents, activeId, isRestoring: false });

        // Handles come back alive but unpermissioned. Where the browser still
        // remembers the grant we can quietly refresh from disk; where it
        // doesn't, the draft stands until the user acts on the tab.
        void refreshPermittedDocuments(documents, get);
      } catch (error) {
        console.warn('[RendMD] Could not restore the previous session:', error);
        set({ isRestoring: false });
      }
    },
  };
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function toPersisted(doc: OpenDocument): PersistedDocument {
  return {
    id: doc.id,
    name: doc.name,
    path: doc.path,
    handle: doc.handle,
    content: doc.content,
    frontmatter: doc.frontmatter,
    frontmatterBlock: doc.frontmatterBlock,
    savedText: doc.savedText,
    isDirty: doc.isDirty,
    lastSavedAt: doc.lastSavedAt,
    scrollRatio: doc.scrollRatio,
  };
}

function fromPersisted(doc: PersistedDocument): OpenDocument {
  return {
    ...doc,
    isUntitled: doc.handle === null && doc.lastSavedAt === null,
    // History is per-session; a restored document starts from where it left
    // off rather than carrying a stale stack across a reload.
    history: createHistory(joinDocument(doc.frontmatterBlock, doc.content)),
    revision: 0,
  };
}

/**
 * Is this file already open? Prefers an exact handle comparison and falls back
 * to the workspace path, which is what we have for restored sessions.
 */
async function findOpenDocumentFor(
  documents: OpenDocument[],
  handle: FileSystemFileHandle,
  path?: string,
): Promise<OpenDocument | undefined> {
  for (const doc of documents) {
    if (doc.handle) {
      try {
        if (await doc.handle.isSameEntry(handle)) return doc;
      } catch {
        // Fall through to the path comparison.
      }
    }
    if (path && doc.path === path) return doc;
  }
  return undefined;
}

/**
 * For restored documents whose permission survived, pull the file again so a
 * change made outside RendMD is picked up. Clean documents only — an unsaved
 * draft always wins over what is on disk.
 */
async function refreshPermittedDocuments(
  documents: OpenDocument[],
  get: () => DocumentsState,
): Promise<void> {
  for (const doc of documents) {
    if (!doc.handle || doc.isDirty) continue;
    if ((await queryPermission(doc.handle, 'read')) !== 'granted') continue;
    await get().reloadFromDisk(doc.id);
  }
}

/* ── Selectors ───────────────────────────────────────────────────────────── */

export function useActiveDocument(): OpenDocument | null {
  return useDocumentsStore(
    (state) => state.documents.find((doc) => doc.id === state.activeId) ?? null,
  );
}

/** Whether the active document has anything to step back to, or forward to. */
export function activeCanUndo(state: DocumentsState): boolean {
  const doc = state.documents.find((d) => d.id === state.activeId);
  return doc ? historyCanUndo(doc.history) : false;
}

export function activeCanRedo(state: DocumentsState): boolean {
  const doc = state.documents.find((d) => d.id === state.activeId);
  return doc ? historyCanRedo(doc.history) : false;
}

export function useHasUnsavedChanges(): boolean {
  return useDocumentsStore((state) => state.documents.some((doc) => doc.isDirty));
}
