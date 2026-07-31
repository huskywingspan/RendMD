import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { cn } from '@/utils/cn';

/**
 * Service-worker update prompt and install affordance.
 *
 * Updates are opt-in rather than automatic. RendMD holds unsaved drafts in
 * memory; reloading underneath someone mid-edit to ship a new build would be
 * a poor trade for the sake of being current.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn('[RendMD] Service worker registration failed:', error);
    },
  });

  const install = useInstallPrompt();

  if (!needRefresh && !install.available) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[90] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {needRefresh && (
        <Banner
          icon={<RefreshCw size={15} />}
          title="A new version is ready"
          body="Reload when you're at a good stopping point."
          actionLabel="Reload"
          onAction={() => void updateServiceWorker(true)}
          onDismiss={() => setNeedRefresh(false)}
        />
      )}

      {install.available && (
        <Banner
          icon={<Download size={15} />}
          title="Install RendMD"
          body="Opens in its own window, works offline, and becomes an option for opening .md files."
          actionLabel="Install"
          onAction={() => void install.prompt()}
          onDismiss={install.dismiss}
        />
      )}
    </div>
  );
}

function Banner({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  onDismiss,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border border-line bg-overlay p-3 shadow-lg',
        'animate-[toast-in_190ms_cubic-bezier(0.2,0,0,1)]',
      )}
    >
      <span className="mt-0.5 shrink-0 text-accent" aria-hidden>
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{body}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-2 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-ink hover:bg-accent-hover"
        >
          {actionLabel}
        </button>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mt-0.5 -mr-1 shrink-0 rounded-sm p-0.5 text-ink-faint hover:bg-hover hover:text-ink"
      >
        <X size={13} />
      </button>
    </div>
  );
}

/**
 * Chromium's installability signal.
 *
 * `beforeinstallprompt` fires once when the browser decides the app qualifies.
 * The event has to be captured and replayed later from a user gesture, since
 * prompting on load is both disallowed and rude.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'rendmd:install-dismissed';

function useInstallPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };

    const onInstalled = () => setDeferred(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return {
    available: deferred !== null,
    async prompt() {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    },
    dismiss() {
      // Remembered, so declining once doesn't mean being asked every visit.
      localStorage.setItem(DISMISSED_KEY, '1');
      setDeferred(null);
    },
  };
}
