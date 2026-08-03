import type { Editor } from '@tiptap/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { BLOCK_TYPES, applyBlockType, currentBlockType, type BlockTypeId } from './blockTypes';

/**
 * Formatting controls shared by the selection bubble menu and the format
 * toolbar. The operations they invoke live in ./blockTypes — split out so this
 * file exports components only, which is what keeps fast refresh working.
 */

/**
 * The block-type dropdown.
 *
 * `align` exists because the same control sits in two places: floating above a
 * selection, where the menu drops downward, and in a toolbar pinned to the top
 * of the pane, where it does the same — but the bubble menu can be near the
 * bottom of the viewport, so its caller may need the menu to open upward.
 */
export function BlockTypeMenu({
  editor,
  open,
  onOpenChange,
  placement = 'bottom',
}: {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placement?: 'top' | 'bottom';
}) {
  const current = currentBlockType(editor);
  const active = BLOCK_TYPES.find((type) => type.id === current) ?? BLOCK_TYPES[0];
  const Icon = active.icon;

  const apply = (id: BlockTypeId): void => {
    applyBlockType(editor, id);
    onOpenChange(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex h-7 shrink-0 items-center gap-1 rounded-sm px-1.5 text-sm',
          'text-ink-muted hover:bg-hover hover:text-ink',
        )}
      >
        <Icon size={14} aria-hidden />
        <span className="max-w-24 truncate">{active.label}</span>
        <ChevronDown size={11} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute left-0 z-10 w-44 rounded-lg border border-line',
            'bg-overlay py-1 shadow-lg animate-[menu-in_120ms_ease-out]',
            placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {BLOCK_TYPES.map(({ id, label, icon: ItemIcon }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => apply(id)}
              className={cn(
                'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm',
                id === current ? 'text-accent' : 'text-ink-muted hover:bg-hover hover:text-ink',
              )}
            >
              <ItemIcon size={13} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

export function FormatButton({
  icon,
  label,
  shortcut,
  isActive = false,
  disabled = false,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={isActive}
      title={shortcut ? `${label} — ${shortcut}` : label}
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-sm transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        isActive
          ? 'bg-accent-soft text-accent'
          : 'text-ink-muted enabled:hover:bg-hover enabled:hover:text-ink',
      )}
    >
      {icon}
    </button>
  );
}

export function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-line" aria-hidden />;
}
