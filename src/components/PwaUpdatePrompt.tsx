import { useEffect, useState } from 'react';

export default function PwaUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Track whether a service worker was already controlling the page on mount
    // to distinguish true updates from initial first-visit registration
    const hadControllerOnLoad = Boolean(navigator.serviceWorker.controller);

    // Listen for broadcast from activated new service worker
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'sw:updated' && hadControllerOnLoad) {
        setUpdateAvailable(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    // Also check if a service worker is waiting or update is detected
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting && hadControllerOnLoad) {
        setUpdateAvailable(true);
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && hadControllerOnLoad) {
            setUpdateAvailable(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  function handleUpdate() {
    window.location.reload();
  }

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 bg-surface border border-nx rounded-xl p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-fade-up"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[color:var(--nx-text)]">Update available</p>
        <p className="text-xs text-muted mt-0.5">Refresh to clear cache and update.</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleUpdate}
          className="btn-primary !py-1.5 !px-3 !text-xs min-h-[32px] cursor-pointer"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setUpdateAvailable(false)}
          className="text-muted hover:text-[color:var(--nx-text)] p-1 text-lg leading-none cursor-pointer"
          aria-label="Dismiss update notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
