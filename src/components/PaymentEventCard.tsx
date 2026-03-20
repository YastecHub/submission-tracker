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

  return (
    <div className={`bg-white rounded-2xl shadow p-5 flex flex-col gap-3 ${isClosed ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs uppercase tracking-widest text-green-600 font-semibold">Payment</span>
          {isClosed && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              {isExpired && !event.isClosed ? 'Expired' : 'Closed'}
            </span>
          )}
        </div>
        <h2 className="font-bold text-gray-900 leading-snug">{event.title}</h2>
        <p className="text-lg font-bold text-green-700 mt-0.5">{amount}</p>
        {event.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
        )}
      </div>

      {/* Bank details */}
      <div className="bg-green-50 rounded-xl px-3 py-2 text-xs text-gray-600 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-gray-400">Bank</span>
          <span className="font-medium">{event.bankName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Acct</span>
          <span className="font-mono font-semibold text-gray-800">{event.accountNumber}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2">
        <div className="flex-1 bg-gray-50 rounded-xl p-2.5 text-center">
          <p className="text-xl font-bold text-gray-700">{event.totalReceipts ?? 0}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
        <div className="flex-1 bg-yellow-50 rounded-xl p-2.5 text-center">
          <p className="text-xl font-bold text-yellow-600">{event.pendingCount ?? 0}</p>
          <p className="text-xs text-gray-400">Pending</p>
        </div>
        <div className="flex-1 bg-green-50 rounded-xl p-2.5 text-center">
          <p className="text-xl font-bold text-green-600">{event.confirmedCount ?? 0}</p>
          <p className="text-xs text-gray-400">Confirmed</p>
        </div>
      </div>

      {/* Progress bar */}
      {(event.totalReceipts ?? 0) > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Confirmed</span>
            <span>{confirmedPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all"
              style={{ width: `${confirmedPct}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">Deadline: {deadline}</p>

      {/* Actions — 2-row grid so nothing gets cramped */}
      <div className="grid grid-cols-2 gap-1.5 mt-auto">
        <Link
          to={`/dashboard/payments/${event.id}`}
          className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 rounded-lg text-center transition"
        >
          View Receipts
        </Link>
        <button
          type="button"
          onClick={async () => {
            const url = `${window.location.origin}/pay/${event.slug}`;
            try {
              await navigator.clipboard.writeText(url);
              toast('Link copied!', 'success');
            } catch {
              prompt('Copy this link:', url);
            }
          }}
          className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold py-1.5 rounded-lg transition"
        >
          Copy Link
        </button>
        <button
          type="button"
          onClick={() => onToggleClose(event.id)}
          className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold py-1.5 rounded-lg transition"
        >
          {event.isClosed ? 'Reopen' : 'Close'}
        </button>
        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="border border-red-100 text-red-400 hover:bg-red-50 text-xs font-semibold py-1.5 rounded-lg transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
