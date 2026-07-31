import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/components/UI/Modal';
import { COMMANDS, type CommandGroup } from '@/lib/commands';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Keyboard reference.
 *
 * Generated from the command registry, so it lists what is actually bound
 * rather than a hand-maintained table that drifts. A handful of bindings
 * handled directly by the keyboard layer — tab cycling, the palette itself —
 * are listed separately below.
 */

const GROUP_ORDER: CommandGroup[] = ['File', 'Workspace', 'Edit', 'View', 'Insert', 'Help'];

const EXTRA_BINDINGS: { group: CommandGroup; title: string; shortcut: string }[] = [
  { group: 'Help', title: 'Command palette', shortcut: 'Ctrl+K' },
  { group: 'View', title: 'Next document', shortcut: 'Ctrl+Tab' },
  { group: 'View', title: 'Previous document', shortcut: 'Ctrl+Shift+Tab' },
  { group: 'View', title: 'Jump to document 4–9', shortcut: 'Ctrl+4…9' },
  { group: 'Edit', title: 'Formatting menu', shortcut: 'Select text' },
];

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const all = [
      ...COMMANDS.filter((command) => command.shortcut).map((command) => ({
        group: command.group,
        title: command.title,
        shortcut: command.shortcut as string,
      })),
      ...EXTRA_BINDINGS,
    ];

    const term = query.trim().toLowerCase();
    const matching = term
      ? all.filter(
          (entry) =>
            entry.title.toLowerCase().includes(term) ||
            entry.shortcut.toLowerCase().includes(term),
        )
      : all;

    return GROUP_ORDER.map((group) => ({
      group,
      entries: matching.filter((entry) => entry.group === group),
    })).filter((section) => section.entries.length > 0);
  }, [query]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard shortcuts" size="lg">
      <div className="relative mb-4">
        <Search
          size={14}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter shortcuts"
          aria-label="Filter shortcuts"
          className="h-8 w-full rounded-md border border-line bg-sunken pr-2.5 pl-8 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />
      </div>

      {grouped.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-faint">Nothing matches “{query}”</p>
      ) : (
        <div className="columns-1 gap-8 sm:columns-2">
          {grouped.map(({ group, entries }) => (
            <section key={group} className="mb-5 break-inside-avoid">
              <h3 className="mb-1.5 text-2xs font-medium tracking-wide text-ink-faint uppercase">
                {group}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {entries.map((entry) => (
                  <li
                    key={`${entry.title}-${entry.shortcut}`}
                    className="flex items-center justify-between gap-3 py-0.5"
                  >
                    <span className="min-w-0 truncate text-sm text-ink-muted">{entry.title}</span>
                    <kbd className="kbd shrink-0">{entry.shortcut}</kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-2 border-t border-line pt-3 text-xs leading-relaxed text-ink-faint">
        On macOS, Ctrl means ⌘. Standard editing shortcuts — bold, italic, undo, select all — work
        as they do everywhere else.
      </p>
    </Modal>
  );
}

export default ShortcutsModal;
