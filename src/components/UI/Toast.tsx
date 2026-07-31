import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useToastStore, type Toast, type ToastKind } from '@/stores/toastStore';
import { cn } from '@/utils/cn';

const ICONS: Record<ToastKind, typeof Info> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

const ACCENTS: Record<ToastKind, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = ICONS[toast.kind];

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex items-start gap-2.5 rounded-lg border border-line',
        'bg-overlay px-3 py-2.5 shadow-lg',
        'animate-[toast-in_190ms_cubic-bezier(0.2,0,0,1)]',
      )}
    >
      <Icon size={15} className={cn('mt-px shrink-0', ACCENTS[toast.kind])} aria-hidden />

      <span className="flex-1 text-sm leading-snug text-ink">{toast.message}</span>

      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onPress();
            dismiss(toast.id);
          }}
          className="shrink-0 rounded-sm px-1.5 py-0.5 text-sm font-medium text-accent hover:bg-accent-soft"
        >
          {toast.action.label}
        </button>
      )}

      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="-mr-1 shrink-0 rounded-sm p-0.5 text-ink-faint hover:bg-hover hover:text-ink"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      // aria-live on the container, not the item, so additions are announced
      // without the region being re-read each time one expires.
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
