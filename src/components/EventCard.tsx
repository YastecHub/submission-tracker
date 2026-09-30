import { Link } from 'react-router-dom';
import type { SubmissionEvent } from '../types';
import { useToast } from '../context/ToastContext';

interface Props {
  event: SubmissionEvent;
  onToggleClose: (id: string) => void;
  onExtend: (id: string) => void;
  onDelete: (id: string) => void;
  canManage?: boolean;
}

export default function EventCard({ event, onToggleClose, onExtend, onDelete, canManage = true }: Props) {
  const { toast } = useToast();
  const deadline = new Date(event.deadline);
  const isExpired = new Date() > deadline;
  const deadlineStr = deadline.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const shareLink = `${window.location.origin}/submitit/${event.slug}`;
  const closed = event.isClosed || isExpired;

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast('Link copied!', 'success');
    } catch {
      prompt('Copy this link:', shareLink);
    }
  }

  return (
    <div className="card-interactive p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="badge">{event.type}</span>
            {closed && <span className="badge badge-danger">Closed</span>}
          </div>
          <h3 className="font-semibold truncate">{event.title}</h3>
          <p className="text-sm text-muted">{event.courseCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-surface-2 rounded-lg py-2 border border-nx">
          <p className="text-lg font-semibold">{event.totalSubmissions ?? 0}</p>
          <p className="text-xs text-dim">Total</p>
        </div>
        <div className="bg-surface-2 rounded-lg py-2 border border-nx">
          <p className="text-lg font-semibold text-success">{event.confirmedCount ?? 0}</p>
          <p className="text-xs text-dim">Confirmed</p>
        </div>
        <div className="bg-surface-2 rounded-lg py-2 border border-nx">
          <p className="text-lg font-semibold text-accent">{event.pendingCount ?? 0}</p>
          <p className="text-xs text-dim">Pending</p>
        </div>
      </div>

      <p className="text-xs text-dim">Deadline: {deadlineStr}</p>

      <div className="grid grid-cols-2 gap-2 mt-auto pt-1">
        <Link
          to={`/dashboard/events/${event.id}`}
          className="btn-primary !py-2 !text-sm text-center justify-center"
        >
          View
        </Link>
        <button type="button" onClick={copyLink} className="btn-secondary !py-2 !text-sm text-center justify-center">
          Copy link
        </button>
        {canManage && (
          <>
            <button
              type="button"
              onClick={() => onToggleClose(event.id)}
              className="btn-secondary !py-2 !text-sm text-center justify-center"
            >
              {event.isClosed ? 'Re-open' : 'Close'}
            </button>
            <button
              type="button"
              onClick={() => onExtend(event.id)}
              className="btn-secondary !py-2 !text-sm text-center justify-center"
              title={closed ? 'Reopen with a new deadline' : 'Extend deadline'}
            >
              {closed ? 'Reopen…' : 'Extend…'}
            </button>
            <button
              type="button"
              onClick={() => onDelete(event.id)}
              className="btn-ghost !py-2 !text-sm text-danger col-span-2 text-center justify-center"
              title="Delete event"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
