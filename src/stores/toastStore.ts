import { create } from 'zustand';

/**
 * Transient notifications.
 *
 * Used sparingly: a toast is for something that happened out of view, or that
 * failed. A successful save is reported by the status bar going clean, not by
 * a popup — confirming every save is noise.
 */

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
  duration: number;
  /** Optional inline action, e.g. "Undo" or "Grant access". */
  action?: { label: string; onPress: () => void };
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  push: (toast) => {
    const id = `toast-${(nextId += 1)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    if (toast.duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, toast.duration);
    }

    return id;
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/**
 * Imperative helpers, so non-React modules (stores, file IO) can report
 * without reaching for the hook.
 */
export const toast = {
  success(message: string, action?: Toast['action']): string {
    return useToastStore.getState().push({ message, kind: 'success', duration: 3000, action });
  },
  error(message: string, action?: Toast['action']): string {
    // Errors linger: they usually need a decision, not an acknowledgement.
    return useToastStore.getState().push({ message, kind: 'error', duration: 7000, action });
  },
  info(message: string, action?: Toast['action']): string {
    return useToastStore.getState().push({ message, kind: 'info', duration: 4000, action });
  },
  dismiss(id: string): void {
    useToastStore.getState().dismiss(id);
  },
};
