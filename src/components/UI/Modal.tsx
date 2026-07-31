import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Modal dialog.
 *
 * Built on the native <dialog> element with showModal(), which gives us the
 * top layer, a real focus trap, inertness of the rest of the page, and Escape
 * handling from the platform. The hand-rolled focus-trap loops this replaces
 * were about forty lines each and got the Shift+Tab edge case wrong.
 */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'w-96',
  md: 'w-[32rem]',
  lg: 'w-[44rem]',
} as const;

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Escape triggers the dialog's own close; mirror that back into React state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [onClose]);

  return (
    /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions,
                                 jsx-a11y/click-events-have-key-events --
       <dialog> is an interactive element, and the keyboard path is the
       platform's own: showModal() traps focus and Escape fires 'cancel',
       handled above. This listener only implements click-outside-to-dismiss,
       which has no keyboard equivalent to duplicate. */
    <dialog
      ref={dialogRef}
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
      // The backdrop is a pseudo-element of the dialog, so a click that lands
      // on the dialog box itself but outside the panel means "outside".
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className={cn(
        'max-h-[85dvh] max-w-[92vw] overflow-hidden rounded-xl border border-line bg-overlay p-0',
        'text-ink shadow-lg backdrop:bg-black/45',
        'open:animate-[panel-in_150ms_cubic-bezier(0.2,0,0,1)]',
        SIZES[size],
      )}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <header className="flex shrink-0 items-start gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="text-md font-medium text-ink">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="mt-0.5 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-0.5 -mr-1 grid size-7 shrink-0 place-items-center rounded-md text-ink-faint hover:bg-hover hover:text-ink"
          >
            <X size={15} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}

/* ── Form pieces, shared by the settings panels ──────────────────────────── */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="mb-2.5 text-2xs font-medium tracking-wide text-ink-faint uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-ink-faint">{hint}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-[120ms]',
        checked ? 'bg-accent' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-white transition-transform duration-[120ms]',
          checked ? 'translate-x-4.5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-md bg-sunken p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'rounded-sm px-2.5 py-1 text-sm transition-colors duration-[120ms]',
            value === option.value
              ? 'bg-canvas font-medium text-ink shadow-sm'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
