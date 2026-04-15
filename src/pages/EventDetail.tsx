import { useState, useEffect, useCallback, useRef } from 'react';
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

export default function EventDetail() {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<SubmissionEvent | null>(null);
  const [page, setPage] = useState<SubmissionsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [exporting, setExporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchSubmissions = useCallback(
    async (pg: number, q: string, silent = false) => {
      if (!silent) setTableLoading(true);
      try {
        const params = new URLSearchParams({ page: String(pg), limit: String(PAGE_SIZE) });
        if (q) params.set('search', q);
        const res = await api.get<SubmissionsPage>(`/api/submissions/${id}?${params}`);
        setPage(res.data);
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
      await Promise.all([fetchEvent(), fetchSubmissions(1, '')]);
      setLoading(false);
    }
    void init();
  }, [fetchEvent, fetchSubmissions]);

  useEffect(() => {
    if (loading) return;
    void fetchSubmissions(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchSubmissions(currentPage, debouncedSearch, true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchSubmissions, currentPage, debouncedSearch]);

  function handleConfirmed(updated: Submission): void {
    setPage((prev) => {
      if (!prev) return prev;
      const wasConfirmed = prev.submissions.find((s) => s.id === updated.id)?.isConfirmed ?? false;
      const nowConfirmed = updated.isConfirmed;
      const delta = nowConfirmed && !wasConfirmed ? 1 : 0;
      return {
        ...prev,
        submissions: prev.submissions.map((s) => (s.id === updated.id ? updated : s)),
        confirmedTotal: prev.confirmedTotal + delta,
        pendingTotal: prev.pendingTotal - delta,
      };
    });
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

  if (loading) return <EventDetailSkeleton />;

  const totalSubmissions = page?.total ?? 0;
  const confirmedTotal = page?.confirmedTotal ?? 0;
  const pendingTotal = page?.pendingTotal ?? 0;
  const totalPages = page?.totalPages ?? 1;

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
            submissions={page?.submissions ?? []}
            onConfirmed={handleConfirmed}
            loading={tableLoading}
            pageOffset={(currentPage - 1) * PAGE_SIZE}
          />
        </div>

        {!tableLoading && search && (page?.submissions.length ?? 0) === 0 && (
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
