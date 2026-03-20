import { Link } from 'react-router-dom';
import type { SubmissionEvent } from '../types';
import { useToast } from '../context/ToastContext';

const TYPE_COLORS: Record<string, string> = {
  assignment: 'bg-blue-100 text-blue-700',
  attendance: 'bg-green-100 text-green-700',
  lab: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
};

interface Props {
  event: SubmissionEvent;
  onToggleClose: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function EventCard({ event, onToggleClose, onDelete }: Props) {
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

  const shareLink = `${window.location.origin}/submit/${event.slug}`;

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast('Link copied!', 'success');
    } catch {
      prompt('Copy this link:', shareLink);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[event.type] ?? TYPE_COLORS.other}`}
            >
              {event.type}
            </span>
            {(event.isClosed || isExpired) && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                Closed
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
          <p className="text-sm text-gray-500">{event.courseCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="text-lg font-bold text-gray-800">{event.totalSubmissions ?? 0}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-green-50 rounded-xl p-2">
          <p className="text-lg font-bold text-green-700">{event.confirmedCount ?? 0}</p>
          <p className="text-xs text-gray-500">Confirmed</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-2">
          <p className="text-lg font-bold text-yellow-700">{event.pendingCount ?? 0}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
      </div>

      <p className="text-xs text-gray-400">Deadline: {deadlineStr}</p>

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Link
          to={`/dashboard/events/${event.id}`}
          className="flex-1 text-center text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded-lg font-medium transition"
        >
          View
        </Link>
        <button
          type="button"
          onClick={copyLink}
          className="flex-1 text-xs border border-gray-300 hover:bg-gray-50 px-2 py-1.5 rounded-lg font-medium transition"
        >
          Copy Link
        </button>
        <button
          type="button"
          onClick={() => onToggleClose(event.id)}
          className={`flex-1 text-xs px-2 py-1.5 rounded-lg font-medium transition border ${
            event.isClosed
              ? 'border-green-300 text-green-700 hover:bg-green-50'
              : 'border-orange-300 text-orange-700 hover:bg-orange-50'
          }`}
        >
          {event.isClosed ? 'Re-open' : 'Close'}
        </button>
        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg transition"
          title="Delete event"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
