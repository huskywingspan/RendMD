import { useEffect, useRef, useState } from 'react';
import { 
  Sparkles, 
  FileText, 
  Briefcase,
  Coffee,
  Globe,
  MessageSquare,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';

interface AIQuickActionsProps {
  onAction: (action: string) => void;
  onCustomPrompt: () => void;
  onClose: () => void;
  position: { top: number; left: number };
}

interface ActionItem {
  action: string;
  label: string;
  icon: typeof Sparkles;
  description?: string;
}

const ACTIONS: ActionItem[] = [
  { action: 'improve', label: 'Improve writing', icon: Sparkles },
  { action: 'shorten', label: 'Make shorter', icon: ArrowDown },
  { action: 'expand', label: 'Make longer', icon: ArrowUp },
  { action: 'formal', label: 'Formal tone', icon: Briefcase },
  { action: 'casual', label: 'Casual tone', icon: Coffee },
  { action: 'professional', label: 'Professional tone', icon: FileText },
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Chinese', 'Japanese', 'Korean'];

export function AIQuickActions({ onAction, onCustomPrompt, onClose, position }: AIQuickActionsProps): JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showTranslate, setShowTranslate] = useState(false);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    const handleClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Focus first item on mount
  useEffect(() => {
    const firstBtn = menuRef.current?.querySelector('button');
    firstBtn?.focus();
  }, []);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 50,
      }}
      className="min-w-[200px] bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg shadow-xl overflow-hidden"
      role="menu"
      aria-label="AI quick actions"
    >
      {!showTranslate ? (
        <>
          {ACTIONS.map(({ action, label, icon: Icon }) => (
            <button
              key={action}
              onClick={() => { onAction(action); onClose(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors text-left"
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Icon size={14} className="text-[var(--theme-text-muted)] shrink-0" />
              {label}
            </button>
          ))}

          <div className="h-px bg-[var(--theme-border-primary)] mx-2" />

          <button
            onClick={() => setShowTranslate(true)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors text-left"
            role="menuitem"
            onMouseDown={(e) => e.preventDefault()}
          >
            <Globe size={14} className="text-[var(--theme-text-muted)] shrink-0" />
            Translate →
          </button>

          <div className="h-px bg-[var(--theme-border-primary)] mx-2" />

          <button
            onClick={() => { onCustomPrompt(); onClose(); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors text-left"
            role="menuitem"
            onMouseDown={(e) => e.preventDefault()}
          >
            <MessageSquare size={14} className="text-[var(--theme-text-muted)] shrink-0" />
            Custom prompt...
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => setShowTranslate(false)}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-tertiary)] transition-colors text-left"
            role="menuitem"
            onMouseDown={(e) => e.preventDefault()}
          >
            ← Back
          </button>
          <div className="h-px bg-[var(--theme-border-primary)] mx-2" />
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => { onAction(`translate:${lang}`); onClose(); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors text-left"
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
            >
              {lang}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
