import {
  BookOpen,
  Code2,
  Columns2,
  Maximize2,
  Minimize2,
  Moon,
  PanelLeft,
  PenLine,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { useDocumentsStore, useActiveDocument } from '@/stores/documentsStore';
import { useUIStore, type ViewMode } from '@/stores/uiStore';
import { useSettingsStore, resolveTheme } from '@/stores/settingsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { IconButton } from '@/components/UI/IconButton';
import { ExportMenu } from './ExportMenu';
import { cn } from '@/utils/cn';
import type { Editor } from '@tiptap/react';

const VIEW_MODES: { id: ViewMode; label: string; icon: typeof BookOpen; shortcut: string }[] = [
  { id: 'read', label: 'Rendered', icon: BookOpen, shortcut: 'Ctrl+1' },
  { id: 'split', label: 'Split', icon: Columns2, shortcut: 'Ctrl+2' },
  { id: 'source', label: 'Source', icon: Code2, shortcut: 'Ctrl+3' },
];

interface TitleBarProps {
  editor: Editor | null;
}

/**
 * The top bar.
 *
 * Deliberately thin. It carries where you are (the breadcrumb), how to get
 * somewhere else (the palette), and how you're looking at the document.
 *
 * It still doesn't grow a toolbar — but it does carry the *switch* for one.
 * That single icon is what makes the format toolbar discoverable: formatting
 * was previously reachable only by selecting text (the bubble menu) or by
 * knowing the palette existed, which left every insert-at-the-cursor command —
 * tables, images, rules — effectively invisible. One button in a bar that
 * already has five is a cheaper price than a permanent row above the document.
 */
export function TitleBar({ editor }: TitleBarProps) {
  const doc = useActiveDocument();
  const rootName = useWorkspaceStore((s) => s.rootName);

  const railOpen = useUIStore((s) => s.railOpen);
  const toggleRail = useUIStore((s) => s.toggleRail);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);
  const focusMode = useUIStore((s) => s.focusMode);
  const toggleFocusMode = useUIStore((s) => s.toggleFocusMode);
  const openOverlay = useUIStore((s) => s.openOverlay);
  const isCompact = useUIStore((s) => s.isCompact);

  const themePreference = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const formatToolbar = useSettingsStore((s) => s.formatToolbar);
  const toggleFormatToolbar = useSettingsStore((s) => s.toggleFormatToolbar);
  const isDark = resolveTheme(themePreference) === 'dark';

  return (
    <header
      className={cn(
        'flex h-[var(--rmd-titlebar-height)] shrink-0 items-center gap-1 px-2',
        'border-b border-line bg-surface',
      )}
    >
      <IconButton
        icon={<PanelLeft size={16} />}
        label={railOpen ? 'Hide sidebar' : 'Show sidebar'}
        shortcut="Ctrl+B"
        onClick={toggleRail}
        active={railOpen && !isCompact}
      />

      <Breadcrumb rootName={rootName} path={doc?.path ?? null} isDirty={doc?.isDirty ?? false} />

      {/* Palette trigger. Styled as a field because that's what it behaves
          like — but it is a button; the input lives inside the palette. */}
      <button
        type="button"
        onClick={() => openOverlay('palette')}
        className={cn(
          'mx-auto flex h-7 items-center gap-2 rounded-md border border-line bg-sunken',
          'px-2.5 text-sm text-ink-faint transition-colors hover:border-line-strong hover:text-ink-muted',
          isCompact ? 'w-9 justify-center px-0' : 'w-64 max-w-[30vw]',
        )}
        aria-label="Search files and commands"
      >
        <Search size={13} aria-hidden />
        {!isCompact && (
          <>
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="kbd">Ctrl K</kbd>
          </>
        )}
      </button>

      {/* View mode */}
      {!isCompact && (
        <div
          role="group"
          aria-label="View mode"
          className="flex items-center gap-0.5 rounded-md bg-sunken p-0.5"
        >
          {VIEW_MODES.map(({ id, label, icon: Icon, shortcut }) => (
            <IconButton
              key={id}
              icon={<Icon size={14} />}
              label={label}
              shortcut={shortcut}
              size="sm"
              onClick={() => setViewMode(id)}
              active={viewMode === id}
              aria-pressed={viewMode === id}
              className={viewMode === id ? 'bg-canvas text-ink shadow-sm' : ''}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-0.5">
        <IconButton
          icon={<PenLine size={15} />}
          label={formatToolbar ? 'Hide format toolbar' : 'Show format toolbar'}
          shortcut="Ctrl+Shift+B"
          onClick={toggleFormatToolbar}
          active={formatToolbar}
        />

        <ExportMenu editor={editor} />

        <IconButton
          icon={focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          label={focusMode ? 'Exit focus mode' : 'Focus mode'}
          shortcut="Ctrl+Shift+F"
          onClick={toggleFocusMode}
          active={focusMode}
        />

        <IconButton
          icon={isDark ? <Sun size={15} /> : <Moon size={15} />}
          label={isDark ? 'Switch to light' : 'Switch to dark'}
          onClick={toggleTheme}
        />

        <IconButton
          icon={<Settings size={15} />}
          label="Settings"
          shortcut="Ctrl+,"
          onClick={() => openOverlay('settings')}
        />
      </div>
    </header>
  );
}

/**
 * Where you are: workspace › folder › file.
 *
 * Intermediate directories collapse to an ellipsis when the path is deep —
 * the folder a file sits in is useful context, its full ancestry rarely is.
 */
function Breadcrumb({
  rootName,
  path,
  isDirty,
}: {
  rootName: string | null;
  path: string | null;
  isDirty: boolean;
}) {
  const isCompact = useUIStore((s) => s.isCompact);
  const documentCount = useDocumentsStore((s) => s.documents.length);

  if (!path) {
    return (
      <span className="truncate px-1.5 text-sm text-ink-faint">
        {documentCount === 0 ? 'RendMD' : 'No document'}
      </span>
    );
  }

  const segments = path.split('/');
  const fileName = segments.pop() ?? path;
  const folders = segments.length > 2 ? ['…', segments[segments.length - 1]] : segments;
  const crumbs = rootName && !isCompact ? [rootName, ...folders] : folders;

  return (
    <div className="flex min-w-0 items-center gap-1 px-1.5 text-sm">
      {!isCompact &&
        crumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="flex shrink-0 items-center gap-1">
            <span className="max-w-28 truncate text-ink-faint">{crumb}</span>
            <span className="text-ink-faint/60" aria-hidden>
              /
            </span>
          </span>
        ))}

      <span className="truncate font-medium text-ink" title={path}>
        {fileName}
      </span>

      {isDirty && (
        <span
          className="size-1.5 shrink-0 rounded-full bg-accent"
          role="status"
          aria-label="Unsaved changes"
        />
      )}
    </div>
  );
}
