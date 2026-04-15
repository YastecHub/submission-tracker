import { Link } from 'react-router-dom';
import type { PaymentEvent } from '../types';
import { useToast } from '../context/ToastContext';

interface Props {
  event: PaymentEvent;
  onToggleClose: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function PaymentEventCard({ event, onToggleClose, onDelete }: Props) {
  const { toast } = useToast();
  const isExpired = new Date() > new Date(event.deadline);
  const isClosed = event.isClosed || isExpired;

  const deadline = new Date(event.deadline).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const amount = parseFloat(event.amount).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  });

  const confirmedPct =
    (event.totalReceipts ?? 0) > 0
      ? Math.round(((event.confirmedCount ?? 0) / (event.totalReceipts ?? 1)) * 100)
      : 0;

  async function copyLink(): Promise<void> {
    const url = `${window.location.origin}/payment/${event.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied!', 'success');
    } catch {
      prompt('Copy this link:', url);
    }
  }

  return (
    <div className={`card-interactive p-5 flex flex-col gap-3 ${isClosed ? 'opacity-70' : ''}`}>
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="badge badge-accent">Payment</span>
          {isClosed && (
            <span className="badge">{isExpired && !event.isClosed ? 'Expired' : 'Closed'}</span>
          )}
        </div>
        <h2 className="font-semibold leading-snug">{event.title}</h2>
        <p className="text-xl font-semibold text-accent mt-1">{amount}</p>
        {event.description && (
          <p className="text-xs text-muted mt-1 line-clamp-2">{event.description}</p>
        )}
      </div>

      <div className="bg-surface-2 border border-nx rounded-lg px-3 py-2 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-dim">Bank</span>
          <span className="font-medium">{event.bankName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-dim">Acct</span>
          <span className="font-mono">{event.accountNumber}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 bg-surface-2 border border-nx rounded-lg p-2.5 text-center">
          <p className="text-lg font-semibold">{event.totalReceipts ?? 0}</p>
          <p className="text-xs text-dim">Total</p>
        </div>
        <div className="flex-1 bg-surface-2 border border-nx rounded-lg p-2.5 text-center">
          <p className="text-lg font-semibold text-accent">{event.pendingCount ?? 0}</p>
          <p className="text-xs text-dim">Pending</p>
        </div>
        <div className="flex-1 bg-surface-2 border border-nx rounded-lg p-2.5 text-center">
          <p className="text-lg font-semibold text-success">{event.confirmedCount ?? 0}</p>
          <p className="text-xs text-dim">Confirmed</p>
        </div>
      </div>

      {(event.totalReceipts ?? 0) > 0 && (
        <div>
          <div className="flex justify-between text-xs text-dim mb-1">
            <span>Confirmed</span>
            <span>{confirmedPct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-surface-2 border border-nx">
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${confirmedPct}%`, backgroundColor: 'var(--nx-accent)' }}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-dim">Deadline: {deadline}</p>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <Link to={`/dashboard/payments/${event.id}`} className="btn-primary !py-2 !text-sm">
          View receipts
        </Link>
        <button type="button" onClick={copyLink} className="btn-secondary !py-2 !text-sm">
          Copy link
        </button>
        <button
          type="button"
          onClick={() => onToggleClose(event.id)}
          className="btn-secondary !py-2 !text-sm"
        >
          {event.isClosed ? 'Reopen' : 'Close'}
        </button>
        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="btn-ghost !py-2 !text-sm text-danger"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
