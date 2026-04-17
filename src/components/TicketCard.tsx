import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

export function formatClaimCode(id: string): string {
  const hex = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

export interface TicketCardProps {
  eventTitle: string;
  fullName: string;
  matricNumber: string;
  receiptId: string;
  qrCode: string;
  status: 'pending' | 'confirmed' | 'rejected';
  isClaimed: boolean;
  claimedBy: string | null;
  claimedAt: string | null;
}

export default function TicketCard({
  eventTitle,
  fullName,
  matricNumber,
  receiptId,
  qrCode,
  status,
  isClaimed,
  claimedBy,
  claimedAt,
}: TicketCardProps) {
  const claimCode = formatClaimCode(receiptId);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  function sanitizeFilename(s: string): string {
    return s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  async function handleSaveTicket() {
    if (!ticketRef.current || saving) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#18181b',
        scale: 2,
        useCORS: true,
      });
      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(); return; }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ticket-${sanitizeFilename(matricNumber)}-${sanitizeFilename(eventTitle)}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        }, 'image/png');
      });
    } catch {
      // swallow — the QR-only fallback is always available
    } finally {
      setSaving(false);
    }
  }

  function handleSaveQR() {
    const a = document.createElement('a');
    a.href = qrCode;
    a.download = `ticket-qr-${sanitizeFilename(matricNumber)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (isClaimed) {
    const claimedTime = claimedAt
      ? new Date(claimedAt).toLocaleString('en-GB', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })
      : '';

    return (
      <div className="card-base p-6 text-center border-[color:var(--nx-success)]">
        <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3 bg-[color:var(--nx-success-soft)]">
          <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-success text-lg">Collected</p>
        <p className="text-sm text-muted mt-1">
          Claimed by {claimedBy}{claimedTime ? ` at ${claimedTime}` : ''}
        </p>
        <p className="text-xs text-dim mt-3">{eventTitle}</p>
      </div>
    );
  }

  return (
    <div>
      <div ref={ticketRef} className="card-base overflow-hidden">
        <div className="bg-surface-2 border-b border-nx px-5 py-3">
          <p className="text-xs uppercase tracking-wider font-semibold text-accent">{eventTitle}</p>
          <p className="text-sm text-muted mt-0.5">Your ticket</p>
        </div>
        <div className="p-5">
          <div className="flex gap-4 items-start">
            <div className="flex-shrink-0">
              <img
                src={qrCode}
                alt="Ticket QR code"
                className="w-28 h-28 rounded-lg border border-nx bg-white p-1"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div>
                <p className="text-xs text-dim">Name</p>
                <p className="text-sm font-semibold break-words">{fullName}</p>
              </div>
              <div>
                <p className="text-xs text-dim">Matric</p>
                <p className="text-sm font-semibold">{matricNumber}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-dim uppercase tracking-wider mb-1">Claim code</p>
            <p className="text-2xl font-mono font-bold tracking-widest text-accent">{claimCode}</p>
          </div>

          <div className="mt-4 bg-surface-2 border border-nx rounded-lg px-4 py-2.5 text-center">
            <p className="text-xs text-muted">Show this at the event to collect your item</p>
          </div>

          {status === 'pending' && (
            <div className="mt-3 bg-[color:var(--nx-accent-soft)] border border-[color:var(--nx-accent)] rounded-lg px-4 py-2.5 text-center">
              <p className="text-xs text-accent font-medium">Your payment is still pending confirmation. The ticket will be active once confirmed.</p>
            </div>
          )}

          {status === 'rejected' && (
            <div className="mt-3 alert-danger text-center">
              <p className="text-xs font-medium">This ticket is invalid — your receipt was rejected.</p>
            </div>
          )}
        </div>
      </div>

      {status !== 'rejected' && (
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <button
            type="button"
            onClick={() => void handleSaveTicket()}
            disabled={saving}
            className="btn-primary !py-2 !text-sm flex-1"
          >
            {saving ? 'Saving…' : 'Save ticket'}
          </button>
          <button
            type="button"
            onClick={handleSaveQR}
            className="btn-secondary !py-2 !text-sm flex-1"
          >
            Save QR only
          </button>
        </div>
      )}
    </div>
  );
}
