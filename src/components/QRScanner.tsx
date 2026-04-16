import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import type { Submission } from '../types';

interface ScanResult {
  type: 'success' | 'warning' | 'error';
  message?: string;
  submission?: Submission;
}

interface Props {
  onClose: () => void;
  onConfirmed?: (submission: Submission) => void;
}

export default function QRScanner({ onClose, onConfirmed }: Props) {
  const instanceRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const scanningRef = useRef(true);

  useEffect(() => {
    startScanner();
    return () => {
      instanceRef.current?.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScanner(): Promise<void> {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const qrCode = new Html5Qrcode('qr-reader');
      instanceRef.current = qrCode;

      await qrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          if (!scanningRef.current) return;
          scanningRef.current = false;
          await qrCode.stop();
          await handleScanResult(decodedText);
        },
        () => {}
      );
    } catch {
      setError('Camera access denied or not available.');
    }
  }

  async function handleScanResult(submissionId: string): Promise<void> {
    try {
      const res = await api.post<{ alreadyConfirmed: boolean; submission: Submission }>(
        '/api/submissions/scan',
        { submissionId }
      );
      if (!res.data.alreadyConfirmed && onConfirmed) {
        onConfirmed(res.data.submission);
      }
      setResult(
        res.data.alreadyConfirmed
          ? { type: 'warning', message: 'Already confirmed', submission: res.data.submission }
          : { type: 'success', submission: res.data.submission }
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Could not confirm submission.';
      setResult({ type: 'error', message: msg });
    }
  }

  async function handleScanAgain(): Promise<void> {
    setResult(null);
    setError('');
    scanningRef.current = true;
    await startScanner();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="card-base w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-nx">
          <h2 className="font-semibold">Scan QR Code</h2>
          <button
            onClick={onClose}
            className="text-dim hover:text-[color:var(--nx-text)] text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="text-center py-8 text-danger text-sm">{error}</div>
          ) : result ? (
            <div className="text-center py-4">
              {result.type === 'success' && (
                <>
                  <div className="mx-auto w-14 h-14 bg-[color:var(--nx-success-soft)] rounded-full flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-semibold text-success mb-1">Confirmed!</p>
                  <p className="text-sm text-muted">{result.submission?.fullName}</p>
                  <p className="text-xs text-dim">{result.submission?.matricNumber}</p>
                </>
              )}
              {result.type === 'warning' && (
                <>
                  <div className="mx-auto w-14 h-14 bg-[color:var(--nx-accent-soft)] rounded-full flex items-center justify-center mb-3">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <p className="font-semibold text-accent mb-1">Already Confirmed</p>
                  <p className="text-sm text-muted">{result.submission?.fullName}</p>
                  <p className="text-xs text-dim">{result.submission?.matricNumber}</p>
                </>
              )}
              {result.type === 'error' && (
                <>
                  <div className="mx-auto w-14 h-14 bg-[color:var(--nx-danger-soft)] rounded-full flex items-center justify-center mb-3">
                    <span className="text-2xl">❌</span>
                  </div>
                  <p className="font-semibold text-danger mb-1">Error</p>
                  <p className="text-sm text-muted">{result.message}</p>
                </>
              )}
              <button
                onClick={handleScanAgain}
                className="btn-primary mt-4 text-sm px-5 py-2"
              >
                Scan Next
              </button>
            </div>
          ) : (
            <>
              <p className="text-center text-sm text-muted mb-3">
                Point camera at a student&apos;s QR code
              </p>
              <div id="qr-reader" className="w-full rounded-xl overflow-hidden" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
