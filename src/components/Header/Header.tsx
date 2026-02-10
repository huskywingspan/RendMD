import { Menu, Settings, FolderOpen, Save, Eye, Columns2, Code, Keyboard, FilePlus, Sparkles } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { useEditorStore } from '@/stores/editorStore';
import { useFileSystem } from '@/hooks';
import { cn } from '@/utils/cn';
import { Tooltip } from '@/components/UI/Tooltip';
import { ThemeDropdown } from './ThemeDropdown';
import { FileIndicator } from './FileIndicator';
import { ExportDropdown } from './ExportDropdown';
import { MobileMenu } from './MobileMenu';
import { useAIStore } from '@/stores/aiStore';
import type { ViewMode } from '@/types';

interface HeaderProps {
  isSaving?: boolean;
  lastSaved?: Date | null;
  editor?: Editor | null;
  onOpenSettings?: () => void;
}

export function Header({ isSaving, lastSaved, editor, onOpenSettings }: HeaderProps): JSX.Element {
  const { viewMode, setViewMode, toggleSidebar, shortcutsModalOpen, setShortcutsModalOpen, newFile } = useEditorStore();
  const { openFile, saveFile } = useFileSystem();

  return (
    <header className="bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-border-primary)] flex items-center justify-between" style={{ height: 'calc(3rem * var(--ui-density-scale, 1))', paddingLeft: 'var(--density-padding-md, 0.5rem)', paddingRight: 'var(--density-padding-md, 0.5rem)' }}>
      {/* Left section */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Tooltip content="Toggle sidebar">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} className="text-[var(--theme-text-secondary)]" />
          </button>
        </Tooltip>
        
        <span className="font-semibold text-[var(--theme-text-primary)] shrink-0">RendMD</span>
        
        <span className="text-[var(--theme-text-muted)] hidden sm:inline">•</span>
        
        <div className="hidden sm:block min-w-0">
          <FileIndicator isSaving={isSaving} lastSaved={lastSaved} />
        </div>
      </div>

      {/* Center section - File actions — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-3">
        {/* File actions */}
        <div className="flex items-center gap-1">
          <Tooltip content="New file (Ctrl+N)">
            <button
              onClick={() => newFile()}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] transition-colors"
              aria-label="New file (Ctrl+N)"
            >
              <FilePlus size={14} />
              <span className="hidden sm:inline">New</span>
            </button>
          </Tooltip>
          <Tooltip content="Open file (Ctrl+O)">
            <button
              onClick={() => openFile()}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] transition-colors"
              aria-label="Open file (Ctrl+O)"
            >
              <FolderOpen size={14} />
              <span className="hidden sm:inline">Open</span>
            </button>
          </Tooltip>
          <Tooltip content="Save file (Ctrl+S)">
            <button
              onClick={() => saveFile()}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] transition-colors"
              aria-label="Save file (Ctrl+S)"
            >
              <Save size={14} />
              <span className="hidden sm:inline">Save</span>
            </button>
          </Tooltip>
          <ExportDropdown editor={editor ?? null} />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        {/* View toggle — always visible (Split button already hidden md:inline-flex) */}
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />

        {/* Mobile: dirty indicator — visible only below sm */}
        <div className="sm:hidden">
          <MobileDirtyDot />
        </div>

        {/* Desktop controls — hidden on mobile */}
        <div className="hidden sm:block">
          <ThemeDropdown />
        </div>
        
        <AIToggleButton />

        <Tooltip content="Keyboard shortcuts (Ctrl+H)">
          <button
            onClick={() => setShortcutsModalOpen(!shortcutsModalOpen)}
            className="hidden sm:inline-flex p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            aria-label="Keyboard shortcuts (Ctrl+H)"
          >
            <Keyboard size={18} className="text-[var(--theme-text-secondary)]" />
          </button>
        </Tooltip>
        
        <Tooltip content="Settings">
          <button
            onClick={onOpenSettings}
            className="hidden sm:inline-flex p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
            aria-label="Settings"
          >
            <Settings size={18} className="text-[var(--theme-text-secondary)]" />
          </button>
        </Tooltip>

        {/* Mobile overflow menu */}
        <MobileMenu editor={editor ?? null} onOpenSettings={onOpenSettings ?? (() => {})} />
      </div>
    </header>
  );
}

/** Tiny dot indicator for unsaved changes — mobile header only */
function MobileDirtyDot(): JSX.Element | null {
  const { isDirty } = useEditorStore();
  if (!isDirty) return null;
  return (
    <span className="w-2 h-2 rounded-full bg-[var(--theme-accent-primary)]" title="Unsaved changes" />
  );
}

/** AI panel toggle button — desktop only */
function AIToggleButton(): JSX.Element {
  const { isPanelOpen, togglePanel } = useAIStore();
  return (
    <Tooltip content="AI Assistant (Ctrl+Shift+A)">
      <button
        onClick={togglePanel}
        className={cn(
          'hidden sm:inline-flex p-1.5 rounded transition-colors',
          isPanelOpen
            ? 'bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]'
            : 'hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]',
        )}
        aria-label="AI Assistant (Ctrl+Shift+A)"
        aria-pressed={isPanelOpen}
      >
        <Sparkles size={18} />
      </button>
    </Tooltip>
  );
}

interface ViewModeToggleProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

function ViewModeToggle({ viewMode, setViewMode }: ViewModeToggleProps): JSX.Element {
  const modes: { value: ViewMode; icon: typeof Eye; label: string; title: string; mobileHidden?: boolean }[] = [
    { value: 'render', icon: Eye, label: 'Render', title: 'Rendered view' },
    { value: 'split', icon: Columns2, label: 'Split', title: 'Split view (Ctrl+/)', mobileHidden: true },
    { value: 'source', icon: Code, label: 'Source', title: 'Source view' },
  ];

  return (
    <div 
      className="flex items-center bg-[var(--theme-bg-tertiary)] rounded-md p-0.5"
      role="group"
      aria-label="View mode"
    >
      {modes.map(({ value, icon: Icon, title, mobileHidden }) => (
        <Tooltip key={value} content={title}>
          <button
            onClick={() => setViewMode(value)}
            className={cn(
              "flex items-center justify-center p-1.5 rounded transition-colors",
              mobileHidden && "hidden md:inline-flex",
              viewMode === value
                ? "bg-[var(--theme-accent-primary)] text-white"
                : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
            )}
            aria-pressed={viewMode === value}
            aria-label={title}
          >
            <Icon size={14} />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
