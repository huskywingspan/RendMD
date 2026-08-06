import { toast } from '@/stores/toastStore';

/**
 * Last-resort reporting for async failures.
 *
 * ErrorBoundary catches what React throws during render, and the file paths
 * catch what they expect. Neither sees a promise that rejects outside a
 * try/catch — a save that fails after its caller returned, an IndexedDB write
 * during session persistence, a dynamic import for a lazily loaded modal.
 * Those used to reach the console and stop there, which means the app appeared
 * to simply not do the thing you asked.
 *
 * This does not attempt recovery. It exists so a silent failure becomes a
 * visible one, because "nothing happened" is the hardest bug to report.
 */

/** Cancellations are the user saying no. They are not failures. */
function isExpected(reason: unknown): boolean {
  if (reason instanceof DOMException && reason.name === 'AbortError') return true;
  return reason instanceof Error && reason.name === 'UserCancelledError';
}

function describe(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  return 'Unknown error';
}

export function installErrorReporting(): () => void {
  // Repeats are swallowed: one failing operation on a timer would otherwise
  // produce a toast per beat.
  const seen = new Set<string>();

  const onRejection = (event: PromiseRejectionEvent) => {
    if (isExpected(event.reason)) return;

    const message = describe(event.reason);
    console.error('[RendMD] Unhandled rejection:', event.reason);

    if (seen.has(message)) return;
    seen.add(message);
    setTimeout(() => seen.delete(message), 10_000);

    toast.error(`Something failed in the background: ${message}`);
  };

  window.addEventListener('unhandledrejection', onRejection);
  return () => window.removeEventListener('unhandledrejection', onRejection);
}
