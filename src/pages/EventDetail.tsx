import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SubmissionsTable from '../components/SubmissionsTable';
import QRScanner from '../components/QRScanner';
import api from '../api/axios';
import type { SubmissionEvent, Submission } from '../types';
import { useToast } from '../context/ToastContext';

interface SubmissionsPage {
  submissions: Submission[];
  total: number;
  confirmedTotal: number;
  pendingTotal: number;
  page: number;
  totalPages: number;
}

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
const PRELOAD_PAGE_SIZE = 100;
const CONFIRM_ALL_MIN_SUBMISSIONS = 100;

export default function EventDetail() {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<SubmissionEvent | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = search.trim();
      setDebouncedSearch(trimmed.length >= 2 ? trimmed : '');
      setCurrentPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchAllSubmissions = useCallback(
    async (silent = false) => {
      if (!silent) setTableLoading(true);
      try {
        const first = await api.get<SubmissionsPage>(
          `/api/submissions/${id}?${new URLSearchParams({
            page: '1',
            limit: String(PRELOAD_PAGE_SIZE),
          })}`
        );
        const submissions = [...first.data.submissions];
        const requests = [];
        for (let pg = 2; pg <= first.data.totalPages; pg += 1) {
          requests.push(
            api.get<SubmissionsPage>(
              `/api/submissions/${id}?${new URLSearchParams({
                page: String(pg),
                limit: String(PRELOAD_PAGE_SIZE),
              })}`
            )
          );
        }
        const rest = await Promise.all(requests);
        for (const res of rest) submissions.push(...res.data.submissions);
        setAllSubmissions(submissions);
      } catch (err) {
        console.error(err);
      } finally {
        setTableLoading(false);
      }
    },
    [id]
  );

  const fetchEvent = useCallback(async () => {
    try {
      const res = await api.get<SubmissionEvent>(`/api/events/id/${id}`);
      setEvent(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    async function init() {
      await Promise.all([fetchEvent(), fetchAllSubmissions()]);
      setLoading(false);
    }
    void init();
  }, [fetchEvent, fetchAllSubmissions]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchAllSubmissions(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchAllSubmissions]);

  const filteredSubmissions = useMemo(() => {
    if (!debouncedSearch) return allSubmissions;
    const q = debouncedSearch.toLowerCase();
    return allSubmissions.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.matricNumber.toLowerCase().includes(q)
    );
  }, [allSubmissions, debouncedSearch]);

  const pagedSubmissions = useMemo(
    () => filteredSubmissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredSubmissions, currentPage]
  );

  function handleConfirmed(updated: Submission): void {
    setAllSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function handleExport(): Promise<void> {
    setExporting(true);
    try {
      const res = await api.get(`/api/submissions/${id}/export`, { responseType: 'blob' });
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
      const res = await api.patch<{ confirmedCount: number }>(`/api/submissions/${id}/confirm-all`);
      toast(`${res.data.confirmedCount} submissions confirmed.`, 'success');
      await Promise.all([fetchEvent(), fetchAllSubmissions(true)]);
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

  const totalSubmissions = allSubmissions.length;
  const confirmedTotal = allSubmissions.filter((s) => s.isConfirmed).length;
  const pendingTotal = totalSubmissions - confirmedTotal;
  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));
  const eventTotalSubmissions = event?.totalSubmissions ?? totalSubmissions;
  const canConfirmAll = eventTotalSubmissions >= CONFIRM_ALL_MIN_SUBMISSIONS && pendingTotal > 0;

  return (
    <div className="page-base">
      <Navbar />
      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onConfirmed={(updated) => handleConfirmed(updated)}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/dashboard" className="btn-ghost !px-0 mb-4">
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
            submissions={pagedSubmissions}
            onConfirmed={handleConfirmed}
            loading={tableLoading}
            pageOffset={(currentPage - 1) * PAGE_SIZE}
          />
        </div>

        {!tableLoading && search && filteredSubmissions.length === 0 && (
          <p className="text-center text-sm text-dim mt-4">
            No results for &quot;{search}&quot;
          </p>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted">
            <span>
              Page {currentPage} of {totalPages} · {filteredSubmissions.length} shown
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
