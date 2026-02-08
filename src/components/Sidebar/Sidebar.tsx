import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/utils/cn';
import { TOCPanel } from './TOCPanel';
import type { TOCItem } from '@/types';

interface SidebarProps {
  onTocItemClick?: (item: TOCItem) => void;
}

export function Sidebar({ onTocItemClick }: SidebarProps): JSX.Element | null {
  const { sidebar, toggleSidebar } = useEditorStore();

  if (!sidebar.isOpen) return null;

  const handleItemClick = (item: TOCItem): void => {
    onTocItemClick?.(item);
    // Auto-close sidebar on mobile after TOC navigation
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile backdrop — only visible below md */}
      <div
        className="fixed inset-0 bg-black/50 z-30 md:hidden"
        onClick={toggleSidebar}
        aria-hidden="true"
      />
      <aside className={cn(
        "w-64 bg-[var(--theme-bg-secondary)] border-r border-[var(--theme-border)]",
        "flex flex-col",
        // Mobile: full-height overlay
        "fixed inset-y-0 left-0 z-40",
        // Desktop: inline in flex layout
        "md:relative md:z-auto",
      )}>
        <div className="p-4 border-b border-[var(--theme-border)]">
          <h2 className="text-sm font-medium text-[var(--theme-text-secondary)] uppercase tracking-wide">
            Table of Contents
          </h2>
        </div>
        
        <nav className="flex-1 p-2 overflow-y-auto">
          <TOCPanel onItemClick={handleItemClick} />
        </nav>
      </aside>
    </>
  );
}
