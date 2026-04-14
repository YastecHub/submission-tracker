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
    <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-violet-800 text-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <img src="/icon.svg" alt="" className="w-6 h-6 rounded shadow-md shrink-0" />
        <span>Install <span className="font-bold text-amber-300">NEXIUM</span> for quick access</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="bg-amber-400 text-purple-900 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-amber-300 transition shadow"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-purple-200 hover:text-white transition text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
