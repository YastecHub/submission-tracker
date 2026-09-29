import { useCallback, useEffect, useState } from 'react';
import { getAnnouncementAnalytics, getAnnouncementOutstandingStudents } from '../api/bulletin';
import { formatBulletinDateTime } from '../model/presentation';
import type {
  AnnouncementAnalyticsResponse,
  AnnouncementOutstandingStudentsResponse,
} from '../model/types';
import { useToast } from '../../../context/ToastContext';

interface AnnouncementAnalyticsModalProps {
  announcementId: string;
  announcementTitle: string;
  requiresAcknowledgement: boolean;
  onClose: () => void;
}

export default function AnnouncementAnalyticsModal({
  announcementId,
  announcementTitle,
  requiresAcknowledgement,
  onClose,
}: AnnouncementAnalyticsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'outstanding'>('overview');
  const [analytics, setAnalytics] = useState<AnnouncementAnalyticsResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  const [outstandingData, setOutstandingData] =
    useState<AnnouncementOutstandingStudentsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loadingOutstanding, setLoadingOutstanding] = useState(false);
  const [outstandingError, setOutstandingError] = useState('');

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Load analytics
  useEffect(() => {
    const controller = new AbortController();
    setLoadingAnalytics(true);
    setAnalyticsError('');
    getAnnouncementAnalytics(announcementId, controller.signal)
      .then((data) => setAnalytics(data))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setAnalyticsError(
            err instanceof Error ? err.message : 'Could not load analytics.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAnalytics(false);
      });
    return () => controller.abort();
  }, [announcementId]);

  // Load outstanding students
  const loadOutstanding = useCallback(
    (signal?: AbortSignal) => {
      if (!requiresAcknowledgement) return;
      setLoadingOutstanding(true);
      setOutstandingError('');
      getAnnouncementOutstandingStudents(
        announcementId,
        { page, limit: 15, search: search || undefined },
        signal,
      )
        .then((data) => setOutstandingData(data))
        .catch((err) => {
          if (!signal?.aborted) {
            setOutstandingError(
              err instanceof Error
                ? err.message
                : 'Could not load outstanding students.',
            );
          }
        })
        .finally(() => {
          if (!signal?.aborted) setLoadingOutstanding(false);
        });
    },
    [announcementId, page, search, requiresAcknowledgement],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadOutstanding(controller.signal);
    return () => controller.abort();
  }, [loadOutstanding]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function copyOutstandingMatricNumbers() {
    if (!outstandingData?.students.length) return;
    const list = outstandingData.students.map((s) => s.matricNumber).join(', ');
    try {
      await navigator.clipboard.writeText(list);
      toast('Copied outstanding matric numbers to clipboard.', 'success');
    } catch {
      toast('Could not copy to clipboard.', 'error');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card-base w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-nx overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-nx flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-accent font-semibold">
              Announcement Analytics
            </p>
            <h2
              id="analytics-modal-title"
              className="text-xl font-bold truncate mt-1"
            >
              {announcementTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close analytics"
            className="btn-ghost !p-2 text-muted hover:text-default"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tab Controls (if acknowledgement is required) */}
        {requiresAcknowledgement && (
          <div className="flex border-b border-nx px-5 bg-surface-2/40">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-[color:var(--nx-accent)] text-accent'
                  : 'border-transparent text-muted hover:text-default'
              }`}
            >
              Overview & Push Stats
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('outstanding')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'outstanding'
                  ? 'border-[color:var(--nx-accent)] text-accent'
                  : 'border-transparent text-muted hover:text-default'
              }`}
            >
              <span>Outstanding Students</span>
              {outstandingData && (
                <span className="badge badge-accent text-xs">
                  {outstandingData.total}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'overview' && (
            <>
              {loadingAnalytics && !analytics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="card-base h-24 animate-pulse" />
                    ))}
                  </div>
                  <div className="card-base h-32 animate-pulse" />
                </div>
              ) : analyticsError ? (
                <div role="alert" className="alert-danger">
                  {analyticsError}
                </div>
              ) : analytics ? (
                <div className="space-y-6">
                  {/* Primary Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="card-base p-4">
                      <p className="text-xs text-dim uppercase tracking-wider">
                        Registered Audience
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        {analytics.totalRegisteredStudents}
                      </p>
                      <p className="text-xs text-muted mt-1">Total class accounts</p>
                    </div>

                    <div className="card-base p-4">
                      <p className="text-xs text-dim uppercase tracking-wider">
                        Unique Readers
                      </p>
                      <p className="text-2xl font-bold mt-1 text-accent">
                        {analytics.uniqueReaders}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {(analytics.readRate * 100).toFixed(1)}% of class read
                      </p>
                    </div>

                    {requiresAcknowledgement ? (
                      <div className="card-base p-4 col-span-2 sm:col-span-1">
                        <p className="text-xs text-dim uppercase tracking-wider">
                          Acknowledged
                        </p>
                        <p className="text-2xl font-bold mt-1 text-success">
                          {analytics.totalAcknowledged}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {(
                            (analytics.classAcknowledgementRate ??
                              analytics.acknowledgementRate) * 100
                          ).toFixed(1)}
                          % of audience confirmed
                        </p>
                      </div>
                    ) : (
                      <div className="card-base p-4 col-span-2 sm:col-span-1">
                        <p className="text-xs text-dim uppercase tracking-wider">
                          Version
                        </p>
                        <p className="text-2xl font-bold mt-1">
                          v{analytics.version ?? 1}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          Current published version
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Push Notification Delivery Section */}
                  {analytics.pushStats && (
                    <div className="card-base p-5 border border-nx">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">
                        Web Push Delivery Status
                      </h3>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 rounded-lg bg-surface-2/60">
                          <p className="text-xl font-bold text-success">
                            {analytics.pushStats.delivered}
                          </p>
                          <p className="text-xs text-dim mt-1">Delivered</p>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-2/60">
                          <p className="text-xl font-bold text-accent">
                            {analytics.pushStats.pending}
                          </p>
                          <p className="text-xs text-dim mt-1">In Flight / Retrying</p>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-2/60">
                          <p className="text-xl font-bold text-danger">
                            {analytics.pushStats.failed}
                          </p>
                          <p className="text-xs text-dim mt-1">Expired / Dead</p>
                        </div>
                      </div>
                      <p className="text-xs text-dim mt-3">
                        Delivered notifications reach active student browser and PWA subscriptions.
                      </p>
                    </div>
                  )}

                  {requiresAcknowledgement && (
                    <div className="card-base p-4 border border-[color:var(--nx-accent)] flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">
                          Acknowledgement is mandatory for this update.
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {analytics.totalRegisteredStudents -
                            analytics.totalAcknowledged}{' '}
                          students have not yet acknowledged this announcement.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('outstanding')}
                        className="btn-secondary text-xs !py-2 shrink-0"
                      >
                        View Outstanding List →
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}

          {activeTab === 'outstanding' && (
            <div className="space-y-4">
              {/* Search & Actions Bar */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between">
                <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by name, matric no, or email..."
                    className="input-base text-sm flex-1"
                  />
                  <button type="submit" className="btn-secondary !py-2 text-xs">
                    Search
                  </button>
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        setSearch('');
                        setPage(1);
                      }}
                      className="btn-ghost !py-2 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </form>

                {outstandingData && outstandingData.students.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void copyOutstandingMatricNumbers()}
                    className="btn-secondary text-xs !py-2 shrink-0"
                    title="Copy matric numbers to paste into group announcement"
                  >
                    Copy Matric Numbers
                  </button>
                )}
              </div>

              {loadingOutstanding && !outstandingData ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="card-base h-16 animate-pulse" />
                  ))}
                </div>
              ) : outstandingError ? (
                <div role="alert" className="alert-danger">
                  {outstandingError}
                </div>
              ) : !outstandingData?.students.length ? (
                <div className="card-base p-8 text-center">
                  <p className="font-semibold text-success">
                    ✓ All matching students have acknowledged!
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {search
                      ? 'No outstanding students match your search filter.'
                      : 'Every student in the class has acknowledged this announcement.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {outstandingData.students.map((student) => (
                    <div
                      key={student.id}
                      className="card-base p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">
                            {student.fullName}
                          </span>
                          <span className="text-xs text-accent font-mono">
                            {student.matricNumber}
                          </span>
                        </div>
                        <p className="text-xs text-dim truncate">{student.email}</p>
                      </div>

                      <div className="text-right shrink-0">
                        {student.hasOpened ? (
                          <span className="badge badge-accent text-xs">
                            Opened{' '}
                            {student.lastReadAt
                              ? formatBulletinDateTime(student.lastReadAt)
                              : ''}
                          </span>
                        ) : (
                          <span className="badge text-xs text-muted">
                            Never opened
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {outstandingData.totalPages && outstandingData.totalPages > 1 && (
                    <nav
                      aria-label="Outstanding students pagination"
                      className="flex justify-center items-center gap-3 pt-4"
                    >
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="btn-secondary !py-1 text-xs"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-muted">
                        Page {page} of {outstandingData.totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={page >= outstandingData.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="btn-secondary !py-1 text-xs"
                      >
                        Next
                      </button>
                    </nav>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
