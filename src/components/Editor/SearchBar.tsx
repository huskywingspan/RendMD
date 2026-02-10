import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { X, ChevronUp, ChevronDown, CaseSensitive, Replace } from 'lucide-react';
import { searchPluginKey } from './extensions/search';
import { cn } from '@/utils/cn';

interface SearchBarProps {
  editor: Editor;
  onClose: () => void;
  showReplace?: boolean;
}

export function SearchBar({ editor, onClose, showReplace: initialShowReplace = false }: SearchBarProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(initialShowReplace);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get plugin state for match count display
  const pluginState = searchPluginKey.getState(editor.state);
  const totalMatches = pluginState?.totalMatches ?? 0;
  const currentMatch = pluginState?.currentMatchIndex ?? 0;

  // Focus search input on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, []);

  // Pre-populate with selected text
  useEffect(() => {
    const { from, to } = editor.state.selection;
    if (from !== to) {
      const text = editor.state.doc.textBetween(from, to, ' ');
      if (text && text.length < 100) {
        setSearchTerm(text);
        editor.commands.setSearchTerm(text);
      }
    }
  // Run only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      editor.commands.setSearchTerm(value);
    },
    [editor],
  );

  const handleReplaceChange = useCallback(
    (value: string) => {
      setReplaceTerm(value);
      editor.commands.setReplaceTerm(value);
    },
    [editor],
  );

  const handleCaseSensitiveToggle = useCallback(() => {
    const next = !caseSensitive;
    setCaseSensitive(next);
    editor.commands.setSearchCaseSensitive(next);
  }, [caseSensitive, editor]);

  const handleNext = useCallback(() => {
    editor.commands.nextSearchMatch();
  }, [editor]);

  const handlePrev = useCallback(() => {
    editor.commands.prevSearchMatch();
  }, [editor]);

  const handleReplace = useCallback(() => {
    editor.commands.replaceCurrentMatch(replaceTerm);
  }, [editor, replaceTerm]);

  const handleReplaceAll = useCallback(() => {
    editor.commands.replaceAllMatches(replaceTerm);
  }, [editor, replaceTerm]);

  const handleClose = useCallback(() => {
    editor.commands.clearSearch();
    onClose();
  }, [editor, onClose]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    },
    [handleClose, handleNext, handlePrev],
  );

  const handleReplaceKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleReplace();
      }
    },
    [handleClose, handleReplace],
  );

  const matchDisplay = searchTerm
    ? totalMatches > 0
      ? `${currentMatch + 1} of ${totalMatches}`
      : 'No results'
    : '';

  const inputStyles = cn(
    'flex-1 min-w-0 px-2 py-1 text-sm rounded',
    'bg-[var(--theme-bg-primary)]',
    'text-[var(--theme-text-primary)]',
    'placeholder:text-[var(--theme-text-muted)]',
    'border border-[var(--theme-border-primary)]',
    'focus:outline-none focus:border-[var(--theme-accent-primary)]',
    'transition-colors',
  );

  const btnStyles = cn(
    'p-1 rounded transition-colors',
    'text-[var(--theme-text-secondary)]',
    'hover:bg-[var(--theme-bg-tertiary)]',
    'disabled:opacity-30 disabled:cursor-not-allowed',
  );

  return (
    <div className="absolute top-0 right-0 z-20 m-2 p-2 rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] shadow-xl w-[360px] max-w-[calc(100%-1rem)]">
      {/* Search row */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowReplace(!showReplace)}
          className={cn(btnStyles, 'shrink-0')}
          aria-label={showReplace ? 'Hide replace' : 'Show replace'}
          title={showReplace ? 'Hide replace' : 'Show replace'}
        >
          <Replace size={14} className={cn(showReplace && 'text-[var(--theme-accent-primary)]')} />
        </button>

        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Find..."
          className={inputStyles}
          aria-label="Search text"
        />

        <button
          onClick={handleCaseSensitiveToggle}
          className={cn(btnStyles, 'shrink-0', caseSensitive && 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-accent-primary)]')}
          aria-label="Toggle case sensitivity"
          title="Match case"
        >
          <CaseSensitive size={14} />
        </button>

        <span className="text-xs text-[var(--theme-text-muted)] shrink-0 w-16 text-center tabular-nums">
          {matchDisplay}
        </span>

        <button
          onClick={handlePrev}
          disabled={totalMatches === 0}
          className={cn(btnStyles, 'shrink-0')}
          aria-label="Previous match"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp size={14} />
        </button>

        <button
          onClick={handleNext}
          disabled={totalMatches === 0}
          className={cn(btnStyles, 'shrink-0')}
          aria-label="Next match"
          title="Next match (Enter)"
        >
          <ChevronDown size={14} />
        </button>

        <button
          onClick={handleClose}
          className={cn(btnStyles, 'shrink-0')}
          aria-label="Close search"
          title="Close (Escape)"
        >
          <X size={14} />
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-1 mt-1.5">
          {/* Spacer to align with search input (replace toggle button width) */}
          <div className="w-[26px] shrink-0" />

          <input
            type="text"
            value={replaceTerm}
            onChange={(e) => handleReplaceChange(e.target.value)}
            onKeyDown={handleReplaceKeyDown}
            placeholder="Replace..."
            className={inputStyles}
            aria-label="Replace text"
          />

          <button
            onClick={handleReplace}
            disabled={totalMatches === 0}
            className={cn(
              'shrink-0 px-2 py-1 text-xs rounded transition-colors',
              'text-[var(--theme-text-secondary)]',
              'hover:bg-[var(--theme-bg-tertiary)]',
              'disabled:opacity-30 disabled:cursor-not-allowed',
            )}
            title="Replace current match"
          >
            Replace
          </button>

          <button
            onClick={handleReplaceAll}
            disabled={totalMatches === 0}
            className={cn(
              'shrink-0 px-2 py-1 text-xs rounded transition-colors whitespace-nowrap',
              'text-[var(--theme-text-secondary)]',
              'hover:bg-[var(--theme-bg-tertiary)]',
              'disabled:opacity-30 disabled:cursor-not-allowed',
            )}
            title="Replace all matches"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}

export default SearchBar;
