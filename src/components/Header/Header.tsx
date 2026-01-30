import { Menu, Settings, Code, FolderOpen, Save } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useFileSystem } from '@/hooks';
import { cn } from '@/utils/cn';
import { ThemeDropdown } from './ThemeDropdown';
import { FileIndicator } from './FileIndicator';

interface HeaderProps {
  isSaving?: boolean;
  lastSaved?: Date | null;
}

export function Header({ isSaving, lastSaved }: HeaderProps): JSX.Element {
  const { showSource, toggleSidebar, toggleSource } = useEditorStore();
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

      {/* Center section - File actions */}
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

      {/* Right section */}
      <div className="flex items-center gap-1">
        <ThemeDropdown />
        
        <button
          className="p-1.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} className="text-[var(--theme-text-secondary)]" />
        </button>
        
        <button
          onClick={toggleSource}
          className={cn(
            "p-1.5 rounded transition-colors",
            showSource ? "bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]" : "hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]"
          )}
          aria-label="Toggle source view"
        >
          <Code size={18} />
        </button>
      </div>
    </header>
  );
}
