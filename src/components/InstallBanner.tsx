import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if user previously dismissed
    if (sessionStorage.getItem('install-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'dismissed') handleDismiss();
    else setPrompt(null);
  }

  function handleDismiss() {
    sessionStorage.setItem('install-dismissed', '1');
    setDismissed(true);
  }

  if (!prompt || dismissed) return null;

  return (
    <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Install SubmitIt for quick access</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-white text-blue-700 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white transition text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
