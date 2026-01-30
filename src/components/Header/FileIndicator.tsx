import { useEffect, useState } from 'react';
import { FileText, Circle, Save, Loader2 } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/utils/cn';

interface FileIndicatorProps {
  isSaving?: boolean;
  lastSaved?: Date | null;
}

/**
 * Format time ago string
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}

/**
 * FileIndicator - Shows current file name, dirty state, and save status
 */
export function FileIndicator({ isSaving, lastSaved }: FileIndicatorProps): JSX.Element {
  const { fileName, isDirty } = useEditorStore();
  const [timeAgo, setTimeAgo] = useState<string>('');

  // Update time ago every 10 seconds
  useEffect(() => {
    if (!lastSaved) {
      setTimeAgo('');
      return;
    }

    const updateTimeAgo = () => {
      setTimeAgo(formatTimeAgo(lastSaved));
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* File icon */}
      <FileText size={16} className="text-[var(--theme-text-muted)]" />
      
      {/* File name */}
      <span className="text-[var(--theme-text-primary)] font-medium max-w-48 truncate">
        {fileName || 'Untitled'}
      </span>
      
      {/* Status indicators */}
      <div className="flex items-center gap-1.5">
        {/* Saving indicator */}
        {isSaving && (
          <span className="flex items-center gap-1 text-[var(--theme-text-muted)] text-xs">
            <Loader2 size={12} className="animate-spin" />
            <span>Saving...</span>
          </span>
        )}
        
        {/* Dirty indicator (unsaved changes) */}
        {!isSaving && isDirty && (
          <span 
            className="flex items-center gap-1 text-[var(--theme-accent-primary)]"
            title="Unsaved changes"
          >
            <Circle size={8} fill="currentColor" />
          </span>
        )}
        
        {/* Saved indicator */}
        {!isSaving && !isDirty && lastSaved && (
          <span 
            className={cn(
              "flex items-center gap-1 text-xs",
              "text-[var(--theme-text-muted)]"
            )}
            title={`Last saved: ${lastSaved.toLocaleString()}`}
          >
            <Save size={12} className="text-[var(--theme-text-muted)]" />
            <span>{timeAgo}</span>
          </span>
        )}
      </div>
    </div>
  );
}
