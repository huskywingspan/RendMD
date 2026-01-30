import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/utils/cn';

export function Sidebar(): JSX.Element | null {
  const { sidebar } = useEditorStore();

  if (!sidebar.isOpen) return null;

  return (
    <aside className={cn(
      "w-56 bg-[var(--theme-bg-secondary)] border-r border-[var(--theme-border)]",
      "flex flex-col"
    )}>
      <div className="p-4 border-b border-[var(--theme-border)]">
        <h2 className="text-sm font-medium text-[var(--theme-text-secondary)] uppercase tracking-wide">
          Table of Contents
        </h2>
      </div>
      
      <nav className="flex-1 p-2 overflow-y-auto">
        {/* TOC items will be generated from document headings */}
        <p className="text-[var(--theme-text-muted)] text-sm p-2">
          No headings found
        </p>
      </nav>
    </aside>
  );
}
