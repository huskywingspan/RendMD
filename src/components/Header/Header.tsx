import { Menu, Settings, FolderOpen, Save, Eye, Columns2, Code } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useFileSystem } from '@/hooks';
import { cn } from '@/utils/cn';
import { ThemeDropdown } from './ThemeDropdown';
import { FileIndicator } from './FileIndicator';
import type { ViewMode } from '@/types';

interface HeaderProps {
  isSaving?: boolean;
  lastSaved?: Date | null;
}

export function Header({ isSaving, lastSaved }: HeaderProps): JSX.Element {
  const { viewMode, setViewMode, toggleSidebar } = useEditorStore();
  const { openFile, saveFile } = useFileSystem();

  return (
    <header className="h-12 bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-border-primary)] flex items-center justify-between px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} className="text-[var(--theme-text-secondary)]" />
        </button>
        
        <span className="font-semibold text-[var(--theme-text-primary)]">RendMD</span>
        
        <span className="text-[var(--theme-text-muted)]">•</span>
        
        <FileIndicator isSaving={isSaving} lastSaved={lastSaved} />
      </div>

      {/* Center section - File actions & View toggle */}
      <div className="flex items-center gap-3">
        {/* File actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => openFile()}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] transition-colors"
            title="Open file (Ctrl+O)"
          >
            <FolderOpen size={14} />
            <span className="hidden sm:inline">Open</span>
          </button>
          <button
            onClick={() => saveFile()}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] transition-colors"
            title="Save file (Ctrl+S)"
          >
            <Save size={14} />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>

        {/* View mode toggle */}
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        <ThemeDropdown />
        
        <button
          className="p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} className="text-[var(--theme-text-secondary)]" />
        </button>
      </div>
    </header>
  );
}

interface ViewModeToggleProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

function ViewModeToggle({ viewMode, setViewMode }: ViewModeToggleProps): JSX.Element {
  const modes: { value: ViewMode; icon: typeof Eye; label: string; title: string }[] = [
    { value: 'render', icon: Eye, label: 'Render', title: 'Rendered view' },
    { value: 'split', icon: Columns2, label: 'Split', title: 'Split view (Ctrl+/)' },
    { value: 'source', icon: Code, label: 'Source', title: 'Source view' },
  ];

  return (
    <div 
      className="flex items-center bg-[var(--theme-bg-tertiary)] rounded-md p-0.5"
      role="group"
      aria-label="View mode"
    >
      {modes.map(({ value, icon: Icon, title }) => (
        <button
          key={value}
          onClick={() => setViewMode(value)}
          className={cn(
            "p-1.5 rounded transition-colors",
            viewMode === value
              ? "bg-[var(--theme-accent-primary)] text-white"
              : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
          )}
          title={title}
          aria-pressed={viewMode === value}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
