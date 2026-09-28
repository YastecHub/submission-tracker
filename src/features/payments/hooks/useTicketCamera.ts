import { useEffect, useRef, useState } from 'react';

export function useTicketCamera(enabled: boolean, onScan: (code: string) => void, readerId = 'ticket-qr-reader') {
  const [error, setError] = useState('');
  const callback = useRef(onScan);
  useEffect(() => { callback.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let decoded = false;
    let stop: (() => Promise<void>) | undefined;
    let stopping: Promise<void> | undefined;
    const stopOnce = () => stopping ??= stop?.().catch(() => {});
    setError('');
    void (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (disposed) return;
        const camera = new Html5Qrcode(readerId);
        await camera.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (code: string) => {
            if (disposed || decoded) return;
            decoded = true;
            void stopOnce();
            callback.current(code);
          },
          () => {},
        );
        stop = () => camera.stop();
        // start() may complete after unmount or after the first decoded frame.
        if (disposed || decoded) await stopOnce();
      } catch {
        if (!disposed) setError('Camera access denied or not available.');
      }
    })();
    return () => { disposed = true; void stopOnce(); };
  }, [enabled, readerId]);

  return error;
}
