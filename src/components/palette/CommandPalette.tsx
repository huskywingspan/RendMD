import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft, FileText, Hash, Search, SquareDashed } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { useUIStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useDocumentsStore } from '@/stores/documentsStore';
import { availableCommands, type Command } from '@/lib/commands';
import { fuzzyMatch, fuzzyMatchPath, segmentMatches } from '@/lib/fuzzy';
import type { OutlineItem } from '@/hooks/useOutline';
import { cn } from '@/utils/cn';

/**
 * Command palette.
 *
 * One entry point for everything: workspace files, headings in the current
 * document, and commands. That is why the top bar has no toolbar — anything
 * worth doing is two keystrokes away rather than one click away and forever
 * occupying pixels.
 *
 * Prefixes narrow the search, following the convention people already know
 * from editors:
 *   >  commands only
 *   #  headings in this document
 *   (nothing)  files first, then commands
 */

type Row =
  | { kind: 'file'; id: string; label: string; matches: number[]; run: () => void }
  | { kind: 'heading'; id: string; label: string; level: number; matches: number[]; run: () => void }
  | { kind: 'command'; id: string; label: string; group: string; shortcut?: string; matches: number[]; run: () => void };

const MAX_FILES = 40;
const MAX_COMMANDS = 40;

interface CommandPaletteProps {
  editor: Editor | null;
  outline: OutlineItem[];
  onSelectHeading: (item: OutlineItem) => void;
}

export function CommandPalette({ editor, outline, onSelectHeading }: CommandPaletteProps) {
  const isOpen = useUIStore((s) => s.overlay === 'palette');
  const closeOverlay = useUIStore((s) => s.closeOverlay);
  const files = useWorkspaceStore((s) => s.files);
  const expandTo = useWorkspaceStore((s) => s.expandTo);
  const openHandle = useDocumentsStore((s) => s.openHandle);

  // Mounted only while open (App renders it conditionally), so state starts
  // fresh on every invocation with no reset effect needed.
  const [query, setQuery] = useState('');
  const [rawActiveIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo<Row[]>(() => {
    if (!isOpen) return [];

    const commandsOnly = query.startsWith('>');
    const headingsOnly = query.startsWith('#');
    const term = commandsOnly || headingsOnly ? query.slice(1).trim() : query.trim();

    if (headingsOnly) {
      return rankHeadings(outline, term, onSelectHeading);
    }

    const commands = rankCommands(availableCommands({ editor }), term, editor);
    if (commandsOnly) return commands;

    const fileRows = rankFiles(files, term, (path, handle) => {
      expandTo(path);
      void openHandle(handle, { path });
    });

    // With no query at all, lead with commands — an empty palette is a menu,
    // not a file list.
    if (!term) return [...commands.slice(0, 12), ...fileRows.slice(0, 8)];

    return [...fileRows, ...commands];
  }, [isOpen, query, files, outline, editor, expandTo, openHandle, onSelectHeading]);

  // Clamped at read time rather than corrected in an effect: when the result
  // set shrinks under the cursor, deriving avoids a render with an index that
  // points past the end.
  const activeIndex = rows.length === 0 ? 0 : Math.min(rawActiveIndex, rows.length - 1);

  const commit = useCallback(
    (row: Row | undefined) => {
      if (!row) return;
      closeOverlay();
      // Let the overlay unmount before the command runs, so anything that
      // focuses the editor isn't fighting the palette's focus trap.
      requestAnimationFrame(() => void row.run());
    },
    [closeOverlay],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setActiveIndex((index) => (index + 1) % Math.max(rows.length, 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setActiveIndex((index) => (index - 1 + rows.length) % Math.max(rows.length, 1));
          break;
        case 'Home':
          event.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setActiveIndex(Math.max(rows.length - 1, 0));
          break;
        case 'Enter':
          event.preventDefault();
          commit(rows[activeIndex]);
          break;
        case 'Escape':
          event.preventDefault();
          closeOverlay();
          break;
        default:
          break;
      }
    },
    [rows, activeIndex, commit, closeOverlay],
  );

  // Keep the cursor row in view during keyboard navigation.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh]">
      <button
        type="button"
        aria-label="Close palette"
        onClick={closeOverlay}
        className="absolute inset-0 bg-black/45 animate-[overlay-in_150ms_ease-out]"
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={cn(
          'relative flex w-[36rem] max-w-[92vw] flex-col overflow-hidden',
          'rounded-xl border border-line bg-overlay shadow-lg',
          'animate-[panel-in_150ms_cubic-bezier(0.2,0,0,1)]',
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5">
          <Search size={15} className="shrink-0 text-ink-faint" aria-hidden />
          <input
            ref={inputRef}
            /* eslint-disable-next-line jsx-a11y/no-autofocus -- a search
               dialog that opens with its field unfocused is broken; the
               palette exists to be typed into the moment it appears. */
            autoFocus
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search files, or > for commands, # for headings"
            aria-label="Search files and commands"
            aria-controls="palette-results"
            aria-activedescendant={rows[activeIndex] ? `palette-row-${activeIndex}` : undefined}
            className="h-12 flex-1 bg-transparent text-md text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-faint">
            Nothing matches “{query.replace(/^[>#]/, '').trim()}”
          </p>
        ) : (
          <ul
            ref={listRef}
            id="palette-results"
            role="listbox"
            className="max-h-[min(26rem,55vh)] overflow-y-auto py-1.5"
          >
            {rows.map((row, index) => (
              <PaletteRow
                key={`${row.kind}-${row.id}`}
                row={row}
                index={index}
                isActive={index === activeIndex}
                onHover={() => setActiveIndex(index)}
                onSelect={() => commit(row)}
              />
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3 border-t border-line px-3.5 py-2 text-2xs text-ink-faint">
          <span className="flex items-center gap-1">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd">
              <CornerDownLeft size={10} />
            </kbd>
            open
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="kbd">Esc</kbd> dismiss
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Row ─────────────────────────────────────────────────────────────────── */

function PaletteRow({
  row,
  index,
  isActive,
  onHover,
  onSelect,
}: {
  row: Row;
  index: number;
  isActive: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const Icon = row.kind === 'file' ? FileText : row.kind === 'heading' ? Hash : SquareDashed;

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events --
       role="option" inside a listbox is driven from the combobox input's
       arrow-key and Enter handling, which is wired up above. The click
       handler is the pointer equivalent, not an unkeyboarded control. */
    <li
      id={`palette-row-${index}`}
      data-index={index}
      role="option"
      aria-selected={isActive}
      onMouseMove={onHover}
      onClick={onSelect}
      className={cn(
        'mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5',
        isActive ? 'bg-accent-soft text-ink' : 'text-ink-muted',
      )}
    >
      <Icon
        size={14}
        className={cn('shrink-0', isActive ? 'text-accent' : 'text-ink-faint')}
        aria-hidden
      />

      <span className="min-w-0 flex-1 truncate text-sm">
        <Highlighted text={row.label} matches={row.matches} />
      </span>

      {row.kind === 'command' && (
        <>
          <span className="shrink-0 text-2xs text-ink-faint">{row.group}</span>
          {row.shortcut && <kbd className="kbd shrink-0">{row.shortcut}</kbd>}
        </>
      )}
      {row.kind === 'heading' && (
        <span className="shrink-0 text-2xs text-ink-faint">H{row.level}</span>
      )}
    </li>
  );
}

function Highlighted({ text, matches }: { text: string; matches: number[] }) {
  if (matches.length === 0) return <>{text}</>;

  return (
    <>
      {segmentMatches(text, matches).map((segment, index) =>
        segment.matched ? (
          <mark key={index} className="bg-transparent font-semibold text-accent">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

/* ── Ranking ─────────────────────────────────────────────────────────────── */

function rankFiles(
  files: { path: string; name: string; handle: FileSystemFileHandle | FileSystemDirectoryHandle }[],
  term: string,
  open: (path: string, handle: FileSystemFileHandle) => void,
): Row[] {
  const scored: { row: Row; score: number }[] = [];

  for (const file of files) {
    const result = term ? fuzzyMatchPath(term, file.path) : { score: 0, matches: [] };
    if (!result) continue;

    scored.push({
      score: result.score,
      row: {
        kind: 'file',
        id: file.path,
        label: file.path,
        matches: result.matches,
        run: () => open(file.path, file.handle as FileSystemFileHandle),
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_FILES).map((entry) => entry.row);
}

function rankCommands(commands: Command[], term: string, editor: Editor | null): Row[] {
  const scored: { row: Row; score: number }[] = [];

  for (const command of commands) {
    // Match the visible title first so highlights land on what's on screen;
    // fall back to keywords for aliases like "toc" → "Show outline".
    let result = term ? fuzzyMatch(term, command.title) : { score: 0, matches: [] };
    if (!result && term && command.keywords) {
      const keywordHit = fuzzyMatch(term, command.keywords);
      if (keywordHit) result = { score: keywordHit.score - 20, matches: [] };
    }
    if (!result) continue;

    scored.push({
      score: result.score,
      row: {
        kind: 'command',
        id: command.id,
        label: command.title,
        group: command.group,
        shortcut: command.shortcut,
        matches: result.matches,
        run: () => command.run({ editor }),
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_COMMANDS).map((entry) => entry.row);
}

function rankHeadings(
  outline: OutlineItem[],
  term: string,
  onSelect: (item: OutlineItem) => void,
): Row[] {
  const scored: { row: Row; score: number }[] = [];

  for (const item of outline) {
    const result = term ? fuzzyMatch(term, item.text) : { score: 0, matches: [] };
    if (!result) continue;

    scored.push({
      score: result.score,
      row: {
        kind: 'heading',
        id: item.id,
        label: item.text,
        level: item.level,
        matches: result.matches,
        run: () => onSelect(item),
      },
    });
  }

  // Without a query, document order beats relevance order.
  if (!term) return scored.map((entry) => entry.row);

  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.row);
}
