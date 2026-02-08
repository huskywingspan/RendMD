import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '@/stores/toastStore';
import type { Toast as ToastData, ToastType } from '@/stores/toastStore';
import { cn } from '@/utils/cn';

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colorMap: Record<ToastType, string> = {
  success: 'border-green-500 text-green-400',
  error: 'border-red-500 text-red-400',
  info: 'border-blue-500 text-blue-400',
};

function ToastItem({ toast }: { toast: ToastData }): JSX.Element {
  const { removeToast } = useToastStore();
  const [isEntered, setIsEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const Icon = iconMap[toast.type];

  // Trigger entry animation on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    // Start exit animation slightly before removal
    if (toast.duration > 0) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, toast.duration - 300);
      return () => clearTimeout(exitTimer);
    }
  }, [toast.duration]);

  const animationClass = isExiting
    ? 'opacity-0 translate-x-4'
    : isEntered
      ? 'opacity-100 translate-x-0'
      : 'opacity-0 translate-x-4';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg backdrop-blur-sm',
        'bg-[var(--theme-bg-secondary)] border-[var(--theme-border-primary)]',
        'transition-all duration-300 ease-in-out',
        colorMap[toast.type],
        animationClass
      )}
      role="alert"
    >
      <Icon size={16} className="flex-shrink-0" />
      <span className="text-sm text-[var(--theme-text-primary)] flex-1">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-0.5 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} className="text-[var(--theme-text-muted)]" />
      </button>
    </div>
  );
}

export function ToastContainer(): JSX.Element | null {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
