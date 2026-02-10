import { Check, X, RotateCcw } from 'lucide-react';

interface AIResultPreviewProps {
  onAccept: () => void;
  onReject: () => void;
  onRetry?: () => void;
  action: string;
}

export function AIResultPreview({ onAccept, onReject, onRetry, action }: AIResultPreviewProps): JSX.Element {
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg shadow-lg">
      <span className="text-[10px] text-[var(--theme-text-muted)] px-2 capitalize">{action}</span>
      <button
        onClick={onAccept}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-600/20 text-green-500 hover:bg-green-600/30 transition-colors"
        aria-label="Accept AI change"
        title="Accept"
      >
        <Check size={12} />
        Accept
      </button>
      <button
        onClick={onReject}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        aria-label="Revert AI change"
        title="Revert"
      >
        <X size={12} />
        Revert
      </button>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)] transition-colors"
          aria-label="Retry AI action"
          title="Retry"
        >
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );
}
