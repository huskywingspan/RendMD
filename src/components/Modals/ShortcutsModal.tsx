import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SHORTCUTS, CATEGORY_LABELS, CATEGORY_ORDER } from '@/utils/shortcuts';
import type { ShortcutEntry } from '@/types';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function renderKeys(keys: string): React.ReactNode {
  if (keys === '—') {
    return <span className="text-[var(--theme-text-muted)] text-xs italic">Not set</span>;
  }

  const parts = keys.split('+');
  return (
    <span className="flex items-center gap-1">
      {parts.map((key, index) => (
        <span key={index}>
          <kbd
            className={cn(
              'inline-flex items-center justify-center',
              'min-w-[1.5rem] px-1.5 py-0.5',
              'text-xs font-medium rounded',
              'bg-[var(--theme-bg-tertiary)]',
              'text-[var(--theme-text-primary)]',
              'border border-[var(--theme-border)]',
              'shadow-sm'
            )}
          >
            {key}
          </kbd>
          {index < parts.length - 1 && (
            <span className="text-[var(--theme-text-muted)] mx-0.5">+</span>
          )}
        </span>
      ))}
    </span>
  );
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps): React.ReactElement | null {
  const [search, setSearch] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableSelectors =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleTabTrap(event: KeyboardEvent): void {
      if (event.key !== 'Tab' || !modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelectors);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleTabTrap);

    // Focus search input on open
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleTabTrap);
    };
  }, [isOpen, handleKeyDown]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredShortcuts = SHORTCUTS.filter((shortcut) => {
    const query = search.toLowerCase();
    return (
      shortcut.action.toLowerCase().includes(query) ||
      shortcut.keys.toLowerCase().includes(query) ||
      CATEGORY_LABELS[shortcut.category].toLowerCase().includes(query)
    );
  });

  const groupedShortcuts = CATEGORY_ORDER.reduce<
    Partial<Record<ShortcutEntry['category'], ShortcutEntry[]>>
  >((acc, category) => {
    const items = filteredShortcuts.filter((s) => s.category === category);
    if (items.length > 0) {
      acc[category] = items;
    }
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className={cn(
          'relative z-10 flex flex-col',
          'w-full max-w-xl max-h-[80vh]',
          'mx-4 rounded-lg shadow-xl',
          'bg-[var(--theme-bg-primary)]',
          'border border-[var(--theme-border-primary)]'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between',
            'px-5 py-4',
            'border-b border-[var(--theme-border)]'
          )}
        >
          <h2 className="text-lg font-semibold text-[var(--theme-text-primary)]">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'flex items-center justify-center',
              'w-8 h-8 rounded-md',
              'text-[var(--theme-text-secondary)]',
              'hover:bg-[var(--theme-bg-tertiary)]',
              'hover:text-[var(--theme-text-primary)]',
              'transition-colors'
            )}
            aria-label="Close shortcuts modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[var(--theme-border)]">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcuts..."
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-md',
                'text-sm',
                'bg-[var(--theme-bg-secondary)]',
                'text-[var(--theme-text-primary)]',
                'placeholder:text-[var(--theme-text-muted)]',
                'border border-[var(--theme-border)]',
                'focus:outline-none focus:border-[var(--theme-accent-primary)]',
                'transition-colors'
              )}
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {/* Touch device note */}
          {typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0) && (
            <p className="text-sm text-[var(--theme-text-muted)] text-center py-3 px-4 mb-3 rounded-md bg-[var(--theme-bg-secondary)]">
              Keyboard shortcuts are designed for desktop use. On mobile, use the toolbar and menu instead.
            </p>
          )}
          {Object.keys(groupedShortcuts).length === 0 ? (
            <p className="text-sm text-[var(--theme-text-muted)] text-center py-6">
              No shortcuts found for &ldquo;{search}&rdquo;
            </p>
          ) : (
            CATEGORY_ORDER.map((category) => {
              const items = groupedShortcuts[category];
              if (!items) return null;

              return (
                <div key={category} className="mb-4 last:mb-0">
                  <h3
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wider',
                      'text-[var(--theme-accent-primary)]',
                      'mb-2'
                    )}
                  >
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <div className="space-y-1">
                    {items.map((shortcut) => (
                      <div
                        key={shortcut.action}
                        className={cn(
                          'flex items-center justify-between',
                          'px-3 py-1.5 rounded-md',
                          'hover:bg-[var(--theme-bg-secondary)]',
                          'transition-colors'
                        )}
                      >
                        <span className="text-sm text-[var(--theme-text-primary)]">
                          {shortcut.action}
                        </span>
                        {renderKeys(shortcut.keys)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default ShortcutsModal;
