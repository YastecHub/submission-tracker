import { Link } from 'react-router-dom';
import type { SubmissionEvent } from '../types';
import { useToast } from '../context/ToastContext';

interface Props {
  event: SubmissionEvent;
  onToggleClose: (id: string) => void;
  onExtend: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function EventCard({ event, onToggleClose, onExtend, onDelete }: Props) {
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

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to={`/dashboard/events/${event.id}`}
          className="btn-primary flex-1 !py-2 !text-sm"
        >
          View
        </Link>
        <button type="button" onClick={copyLink} className="btn-secondary flex-1 !py-2 !text-sm">
          Copy link
        </button>
        <button
          type="button"
          onClick={() => onToggleClose(event.id)}
          className="btn-secondary flex-1 !py-2 !text-sm"
        >
          {event.isClosed ? 'Re-open' : 'Close'}
        </button>
        <button
          type="button"
          onClick={() => onExtend(event.id)}
          className="btn-secondary flex-1 !py-2 !text-sm"
          title={closed ? 'Reopen with a new deadline' : 'Extend deadline'}
        >
          {closed ? 'Reopen…' : 'Extend…'}
        </button>
        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="btn-ghost !text-sm text-danger"
          title="Delete event"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
