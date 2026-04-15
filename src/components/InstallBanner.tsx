import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
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
    <div className="bg-surface border-b border-nx px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <img src="/icon.svg" alt="" className="w-6 h-6 rounded shrink-0" />
        <span>Install <span className="font-semibold text-accent">NEXIUM</span> for quick access.</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={handleInstall} className="btn-primary !py-1.5 !px-3 !text-sm">
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted hover:text-[color:var(--nx-text)] transition-colors text-xl leading-none w-7"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
