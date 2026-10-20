import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;
    if (sessionStorage.getItem('install-dismissed')) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
    if (isAppleMobile) {
      setIsIos(true);
      return;
    }

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

  if (dismissed) return null;
  if (!prompt && !isIos) return null;

  return (
    <>
      <div className="print:hidden bg-surface border-b border-nx px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
          <img src="/icon.svg" alt="" className="w-5 h-5 sm:w-6 sm:h-6 rounded shrink-0" />
          <span className="truncate">
            Install <span className="font-semibold text-accent">NEXIUM</span> for app notifications &amp; quick access.
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isIos ? (
            <button
              type="button"
              onClick={() => setShowIosGuide((v) => !v)}
              className="btn-primary !py-1.5 !px-3 !text-xs sm:!text-sm min-h-[36px]"
            >
              How to Add
            </button>
          ) : (
            <button
              type="button"
              onClick={handleInstall}
              className="btn-primary !py-1.5 !px-3 !text-xs sm:!text-sm min-h-[36px]"
            >
              Install
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted hover:text-[color:var(--nx-text)] transition-colors text-xl leading-none w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-2"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>

      {isIos && showIosGuide && (
        <div className="print:hidden bg-surface-2 border-b border-nx px-4 py-3 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">Add NEXIUM to your iPhone / iPad Home Screen</p>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="text-muted hover:text-default"
            >
              ✕
            </button>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-muted leading-relaxed">
            <li>Open this page in <strong>Safari</strong>.</li>
            <li>Tap the <strong>Share</strong> button at the bottom (square with arrow 📤).</li>
            <li>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> (➕).</li>
            <li>Tap <strong>&ldquo;Add&rdquo;</strong> in the top-right corner.</li>
            <li>Open the <strong>NEXIUM</strong> app from your home screen to enable push notifications!</li>
          </ol>
        </div>
      )}
    </>
  );
}
