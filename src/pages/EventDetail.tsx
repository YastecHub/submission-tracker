import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SubmissionsTable from '../components/SubmissionsTable';
import QRScanner from '../components/QRScanner';
import { confirmAllSubmissions, exportSubmissions } from '../features/submissions/api/submissions';
import { useSubmissionDetail } from '../features/submissions/hooks/useSubmissionDetail';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { canManageSubmissionEvent } from '../features/auth/model/capabilities';


function EventDetailSkeleton() {
  return (
    <div className="page-base">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="h-4 w-24 bg-surface-2 rounded animate-pulse mb-4" />
        <div className="card-base p-5 mb-6 animate-pulse">
          <div className="h-3 w-16 bg-surface-2 rounded mb-3" />
          <div className="h-6 w-2/3 bg-surface-2 rounded mb-2" />
          <div className="h-3 w-24 bg-surface-2 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card-base p-4 text-center animate-pulse">
              <div className="h-7 w-10 bg-surface-2 rounded mx-auto mb-1" />
              <div className="h-3 w-12 bg-surface-2 rounded mx-auto" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const PAGE_SIZE = 50;
const CONFIRM_ALL_MIN_SUBMISSIONS = 90;

export default function EventDetail() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { event, submissions, submissionStats, loading, tableLoading, currentPage,
    setCurrentPage, search, setSearch, refresh, error, retry } = useSubmissionDetail(id!);
  const [showScanner, setShowScanner] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const handleConfirmed = () => { void refresh(); };

  async function handleExport(): Promise<void> {
    setExporting(true);
    try {
      const res = await exportSubmissions(id!);
      const contentDisposition = (res.headers['content-disposition'] as string) ?? '';
      const match = contentDisposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : `export_${id}.xlsx`;
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast('Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleConfirmAll(): Promise<void> {
    if (!id) return;
    setConfirmingAll(true);
    try {
      const result = await confirmAllSubmissions(id);
      toast(`${result.confirmedCount} submissions confirmed.`, 'success');
      await refresh();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      toast(msg ?? 'Failed to confirm all submissions.', 'error');
    } finally {
      setConfirmingAll(false);
    }
  }

  if (loading) return <EventDetailSkeleton />;

  const totalSubmissions = submissionStats.confirmed + submissionStats.pending;
  const confirmedTotal = submissionStats.confirmed;
  const pendingTotal = submissionStats.pending;
  const totalPages = submissionStats.totalPages;
  const eventTotalSubmissions = totalSubmissions;
  const canConfirmAll = eventTotalSubmissions >= CONFIRM_ALL_MIN_SUBMISSIONS && pendingTotal > 0;
  const canManage = canManageSubmissionEvent(user?.role, user?.id, event?.createdBy);

  return (
    <div className="page-base">
      <Navbar />
      {canManage && showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onConfirmed={handleConfirmed}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && <div role="alert" className="alert-danger mb-4">Unable to load submissions. <button className="btn-secondary" onClick={() => void retry()}>Try again</button></div>}
        <Link to="/dashboard?section=submissions" className="btn-ghost !px-0 mb-4">
          ← Back to dashboard
        </Link>

        {event && (
          <div className="card-base p-5 mb-6">
            <span className="badge badge-accent">{event.type}</span>
            <h1 className="text-xl font-semibold tracking-tight mt-3">{event.title}</h1>
            <p className="text-sm text-muted mt-1">{event.courseCode}</p>
            {event.description && (
              <p className="text-sm text-muted mt-2 leading-relaxed">{event.description}</p>
            )}
            <p className="text-xs text-dim mt-3">
              Deadline:{' '}
              {new Date(event.deadline).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card-base p-4 text-center">
            <p className="text-2xl font-semibold">{totalSubmissions}</p>
            <p className="text-xs text-dim mt-1">Total</p>
          </div>
          <div className="card-base p-4 text-center">
            <p className="text-2xl font-semibold text-success">{confirmedTotal}</p>
            <p className="text-xs text-dim mt-1">Confirmed</p>
          </div>
          <div className="card-base p-4 text-center">
            <p className="text-2xl font-semibold text-accent">{pendingTotal}</p>
            <p className="text-xs text-dim mt-1">Pending</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or matric number…"
              className="input-base pr-10"
            />
            {tableLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-[color:var(--nx-accent)]" />
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {canManage && <>
              <button onClick={() => setShowScanner(true)} className="btn-secondary flex-1 !py-3">
                Scan QR
              </button>
              <button
                onClick={handleConfirmAll}
                disabled={!canConfirmAll || confirmingAll}
                className="btn-secondary flex-1 !py-3"
                title={
                  eventTotalSubmissions < CONFIRM_ALL_MIN_SUBMISSIONS
                    ? `Available after ${CONFIRM_ALL_MIN_SUBMISSIONS} submissions`
                    : pendingTotal === 0
                    ? 'All submissions are already confirmed'
                    : 'Confirm all pending submissions'
                }
              >
                {confirmingAll ? 'Confirming...' : 'Confirm all'}
              </button>
            </>}
            <button
              onClick={handleExport}
              disabled={exporting || totalSubmissions === 0}
              className="btn-primary flex-1 !py-3"
            >
              {exporting ? 'Exporting…' : 'Export Excel'}
            </button>
          </div>
        </div>

        <div className="card-base overflow-hidden">
          <SubmissionsTable
            submissions={submissions}
            onConfirmed={handleConfirmed}
            loading={tableLoading}
            pageOffset={(currentPage - 1) * PAGE_SIZE}
            canConfirm={canManage}
          />
        </div>

        {!tableLoading && search && submissions.length === 0 && (
          <p className="text-center text-sm text-dim mt-4">
            No results for &quot;{search}&quot;
          </p>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted">
            <span>
              Page {currentPage} of {totalPages} · {totalSubmissions} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="btn-secondary !py-2 !text-sm"
              >
                ← Prev
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="btn-secondary !py-2 !text-sm"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
