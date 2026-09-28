import { useTicketCamera } from '../hooks/useTicketCamera';
import { useDialogFocus } from '../../../hooks/useDialogFocus';

export interface ClaimResult {
  type: 'success' | 'warning' | 'error';
  message: string;
  fullName?: string;
  matricNumber?: string;
}

export function TicketScannerModal({ onScan, onClose, result, onScanAgain }: {
  onScan: (code: string) => void;
  onClose: () => void;
  result: ClaimResult | null;
  onScanAgain: () => void;
}) {
  const error = useTicketCamera(!result, onScan);
  const panelRef = useDialogFocus(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="ticket-scanner-title">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div ref={panelRef} className="relative card-base w-full max-w-sm overflow-hidden z-10 animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-nx">
          <h2 id="ticket-scanner-title" className="font-semibold">Scan ticket</h2>
          <button onClick={onClose} aria-label="Close scanner" className="text-muted hover:text-[color:var(--nx-text)] text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4">
          {error ? <div role="alert" className="text-center py-8 text-danger text-sm">{error}</div> : result ? (
            <div className="text-center py-4">
              <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 ${result.type === 'success' ? 'bg-[color:var(--nx-success-soft)]' : result.type === 'warning' ? 'bg-[color:var(--nx-accent-soft)]' : 'bg-[color:var(--nx-danger-soft)]'}`}>
                <span className={`text-2xl ${result.type === 'success' ? 'text-success' : result.type === 'warning' ? 'text-accent' : 'text-danger'}`}>{result.type === 'success' ? '✓' : '!'}</span>
              </div>
              <p className={`font-semibold mb-1 ${result.type === 'success' ? 'text-success' : result.type === 'warning' ? 'text-accent' : 'text-danger'}`}>{result.message}</p>
              {result.fullName && <><p className="text-sm">{result.fullName}</p><p className="text-xs text-muted">{result.matricNumber}</p></>}
              <button onClick={onScanAgain} className="btn-primary mt-4 !py-2 !text-sm">Scan next</button>
            </div>
          ) : <><p className="text-center text-sm text-muted mb-3">Point camera at student&apos;s ticket QR</p><div id="ticket-qr-reader" className="w-full rounded-xl overflow-hidden" /></>}
        </div>
      </div>
    </div>
  );
}
