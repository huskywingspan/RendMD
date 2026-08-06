import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor as TipTapEditor } from '@tiptap/react';

import { TitleBar } from '@/components/shell/TitleBar';
import { TabStrip } from '@/components/shell/TabStrip';
import { StatusBar } from '@/components/shell/StatusBar';
import { Rail } from '@/components/shell/Rail';
import { Welcome } from '@/components/shell/Welcome';
import { UpdatePrompt } from '@/components/shell/UpdatePrompt';
import { Editor } from '@/components/Editor';
import { FrontmatterPanel } from '@/components/Frontmatter';
import { ToastContainer } from '@/components/UI/Toast';

import { useAppearance } from '@/hooks/useAppearance';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useFileDrop } from '@/hooks/useFileDrop';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useLaunchQueue, useLaunchShortcuts } from '@/hooks/useLaunchQueue';
import { useOutline, type OutlineItem } from '@/hooks/useOutline';
import { useScrollSync } from '@/hooks/useScrollSync';

import {
  documentText,
  useActiveDocument,
  useDocumentsStore,
  useHasUnsavedChanges,
} from '@/stores/documentsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/utils/cn';

// Split out of the initial bundle: none of these are needed to read a document.
const SourceEditor = lazy(() => import('@/components/SourceView/SourceEditor'));
const CommandPalette = lazy(() =>
  import('@/components/palette/CommandPalette').then((m) => ({ default: m.CommandPalette })),
);
const SettingsModal = lazy(() => import('@/components/Modals/SettingsModal'));
const ShortcutsModal = lazy(() => import('@/components/Modals/ShortcutsModal'));
const ImageInsertModal = lazy(() => import('@/components/Modals/ImageInsertModal'));
const ConflictModal = lazy(() => import('@/components/Modals/ConflictModal'));
const SearchBar = lazy(() => import('@/components/Editor/SearchBar'));

/** Below this width the rail becomes a drawer and split view is unavailable. */
const COMPACT_BREAKPOINT = 840;

export default function App() {
  const [editor, setEditor] = useState<TipTapEditor | null>(null);

  const doc = useActiveDocument();
  const documentCount = useDocumentsStore((s) => s.documents.length);
  const isRestoring = useDocumentsStore((s) => s.isRestoring);
  const setContent = useDocumentsStore((s) => s.setContent);
  const replaceDocumentText = useDocumentsStore((s) => s.replaceDocumentText);
  const hasUnsaved = useHasUnsavedChanges();

  const viewMode = useUIStore((s) => s.viewMode);
  const focusMode = useUIStore((s) => s.focusMode);
  const overlay = useUIStore((s) => s.overlay);
  const findOpen = useUIStore((s) => s.findOpen);
  const findReplaceMode = useUIStore((s) => s.findReplaceMode);
  const closeFind = useUIStore((s) => s.closeFind);
  const closeOverlay = useUIStore((s) => s.closeOverlay);
  const setCompact = useUIStore((s) => s.setCompact);

  const outline = useOutline(editor);
  const { setRefA, setRefB, onScrollA, onScrollB } = useScrollSync();
  const isDragging = useFileDrop();

  useAppearance();
  useAutoSave();
  useGlobalShortcuts(editor);
  useLaunchQueue();
  useLaunchShortcuts();

  /* ── Boot ──────────────────────────────────────────────────────────────── */

  useEffect(() => {
    void useWorkspaceStore.getState().restoreFolder();

    if (useSettingsStore.getState().restoreSession) {
      void useDocumentsStore.getState().restoreSession();
    } else {
      useDocumentsStore.setState({ isRestoring: false });
    }
    // Runs once on mount: a later preference change must not re-restore.
  }, []);

  /* ── Viewport ──────────────────────────────────────────────────────────── */

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT - 1}px)`);
    const sync = () => setCompact(media.matches);

    sync();
    media.addEventListener('change', sync);
    // Belt and braces: a page zoom or a mobile browser's collapsing toolbar
    // can change the effective width without the media query re-evaluating in
    // the same tick. setCompact is idempotent, so the extra calls are free.
    window.addEventListener('resize', sync);

    return () => {
      media.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, [setCompact]);

  /* ── Unsaved-work guard ────────────────────────────────────────────────── */

  useEffect(() => {
    if (!hasUnsaved) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      // Drafts survive in IndexedDB either way, but a dropped handle means the
      // next save needs a fresh permission prompt — worth a warning.
      event.preventDefault();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsaved]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  const handleContentChange = useCallback(
    (markdown: string) => {
      if (doc) setContent(doc.id, markdown);
    },
    [doc, setContent],
  );

  const handleSourceChange = useCallback(
    (text: string) => {
      if (doc) replaceDocumentText(doc.id, text);
    },
    [doc, replaceDocumentText],
  );

  const handleOutlineSelect = useCallback(
    (item: OutlineItem) => {
      outline.scrollTo(item);
      // On a narrow screen the outline overlays the document; dismiss it so
      // the reader can see where they landed.
      if (useUIStore.getState().isCompact) useUIStore.getState().setRailOpen(false);
    },
    [outline],
  );

  // Plain concatenation of the preserved frontmatter block and the body, so
  // what the source editor shows is byte-identical to what is on disk.
  const sourceText = useMemo(() => (doc ? documentText(doc) : ''), [doc]);

  const showChrome = !focusMode;
  const showRendered = viewMode === 'read' || viewMode === 'split';
  const showSource = viewMode === 'source' || viewMode === 'split';
  const isSplit = viewMode === 'split';

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <a
        href="#document"
        className={cn(
          'sr-only rounded-md bg-accent px-3 py-2 text-accent-ink',
          'focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[120]',
        )}
      >
        Skip to document
      </a>

      {showChrome && <TitleBar editor={editor} />}

      <div className="flex min-h-0 flex-1">
        {showChrome && (
          <Rail
            outline={outline.items}
            activeOutlineId={outline.activeId}
            onOutlineSelect={handleOutlineSelect}
          />
        )}

        <main id="document" className="flex min-w-0 flex-1 flex-col">
          {showChrome && <TabStrip />}

          {isRestoring ? (
            <div className="flex flex-1 items-center justify-center text-sm text-ink-faint">
              Restoring your session…
            </div>
          ) : !doc || documentCount === 0 ? (
            <Welcome />
          ) : (
            <>
              {showChrome && <FrontmatterPanel />}

              <div className="relative flex min-h-0 flex-1">
                {findOpen && editor && (
                  <Suspense fallback={null}>
                    <SearchBar editor={editor} onClose={closeFind} showReplace={findReplaceMode} />
                  </Suspense>
                )}

                {showRendered && (
                  <div
                    className={cn(
                      'flex min-w-0 flex-col',
                      isSplit ? 'w-1/2 border-r border-line' : 'flex-1',
                    )}
                  >
                    <Editor
                      // Remounting per document keeps each one's undo history
                      // and cursor independent — a shared instance cannot.
                      key={doc.id}
                      initialContent={doc.content}
                      // Only consulted while this pane is unfocused, to pick up
                      // edits made in the source pane during split view.
                      content={doc.content}
                      // Bumped by undo, revert and reload; adopted even while
                      // this pane has focus.
                      revision={doc.revision}
                      // Only in split view is there another pane to race with.
                      sharesDocument={isSplit}
                      onChange={handleContentChange}
                      onEditorReady={setEditor}
                      scrollContainerRef={isSplit ? setRefA : undefined}
                      onScrollSync={isSplit ? onScrollA : undefined}
                    />
                  </div>
                )}

                {showSource && (
                  <div className={cn('flex min-w-0 flex-col', isSplit ? 'w-1/2' : 'flex-1')}>
                    <Suspense
                      fallback={
                        <div className="flex flex-1 items-center justify-center text-sm text-ink-faint">
                          Loading source view…
                        </div>
                      }
                    >
                      <SourceEditor
                        value={sourceText}
                        onChange={handleSourceChange}
                        scrollContainerRef={isSplit ? setRefB : undefined}
                        onScrollSync={isSplit ? onScrollB : undefined}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            </>
          )}

          {showChrome && <StatusBar />}
        </main>
      </div>

      <Suspense fallback={null}>
        {overlay === 'palette' && (
          <CommandPalette
            editor={editor}
            outline={outline.items}
            onSelectHeading={handleOutlineSelect}
          />
        )}
        {overlay === 'settings' && <SettingsModal isOpen onClose={closeOverlay} />}
        {overlay === 'shortcuts' && <ShortcutsModal isOpen onClose={closeOverlay} />}
        {overlay === 'image' && editor && <ImageInsertModal editor={editor} onClose={closeOverlay} />}
      </Suspense>

      {/* Outside the overlay switch: a conflict is raised by the save path, not
          chosen from a menu, and must be able to appear over whatever is open. */}
      <Suspense fallback={null}>
        <ConflictModal />
      </Suspense>

      {isDragging && <DropOverlay />}

      <UpdatePrompt />
      <ToastContainer />
    </div>
  );
}

function DropOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center bg-canvas/70 backdrop-blur-sm">
      <div className="rounded-xl border-2 border-dashed border-accent bg-overlay px-8 py-6 text-center shadow-lg">
        <p className="text-md font-medium text-ink">Drop to open</p>
        <p className="mt-1 text-sm text-ink-muted">Markdown files only</p>
      </div>
    </div>
  );
}
