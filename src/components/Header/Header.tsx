import { Menu, Settings, Code } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/utils/cn';
import { ThemeDropdown } from './ThemeDropdown';

export function Header(): JSX.Element {
  const { fileName, isDirty, showSource, toggleSidebar, toggleSource } = useEditorStore();

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
        
        {fileName && (
          <span className="text-[var(--theme-text-secondary)] text-sm flex items-center gap-1">
            <span className="text-[var(--theme-text-muted)]">•</span>
            {fileName}
            {isDirty && <span className="text-[var(--theme-accent-primary)]">•</span>}
          </span>
        )}
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
