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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="bg-blue-100 rounded-2xl p-5 mb-6 animate-pulse">
          <div className="h-3 w-16 bg-blue-200 rounded mb-3" />
          <div className="h-6 w-2/3 bg-blue-200 rounded mb-2" />
          <div className="h-3 w-24 bg-blue-200 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow p-4 text-center animate-pulse">
              <div className="h-7 w-10 bg-gray-200 rounded mx-auto mb-1" />
              <div className="h-3 w-12 bg-gray-100 rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 mb-4">
          <div className="h-12 bg-white border border-gray-200 rounded-lg animate-pulse" />
          <div className="flex gap-2">
            <div className="flex-1 h-12 bg-purple-100 rounded-lg animate-pulse" />
            <div className="flex-1 h-12 bg-green-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 animate-pulse">
              <div className="w-5 h-3 bg-gray-200 rounded" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
              <div className="w-24 h-3 bg-gray-100 rounded" />
              <div className="w-16 h-5 bg-gray-100 rounded-full" />
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

  // Debounce search — wait 400ms before hitting API
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

  // Initial load
  useEffect(() => {
    async function init() {
      await Promise.all([fetchEvent(), fetchSubmissions(1, '')]);
      setLoading(false);
    }
    void init();
  }, [fetchEvent, fetchSubmissions]);

  // Refetch when page or search changes (skip on initial)
  useEffect(() => {
    if (loading) return;
    void fetchSubmissions(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Silent background poll every 30s
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onConfirmed={(updated) => handleConfirmed(updated)}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Link to="/dashboard" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Dashboard
        </Link>

        {event && (
          <div className="bg-blue-700 text-white rounded-2xl p-5 mb-6 shadow">
            <span className="text-xs uppercase tracking-widest opacity-70">{event.type}</span>
            <h1 className="text-xl font-bold mt-1">{event.title}</h1>
            <p className="text-sm opacity-80">{event.courseCode}</p>
            {event.description && (
              <p className="text-sm opacity-70 mt-2">{event.description}</p>
            )}
            <p className="text-xs mt-2 opacity-60">
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
          <div className="bg-white rounded-2xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{totalSubmissions}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{confirmedTotal}</p>
            <p className="text-xs text-gray-500 mt-1">Confirmed</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendingTotal}</p>
            <p className="text-xs text-gray-500 mt-1">Pending</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or matric number..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
            />
            {tableLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-3 rounded-lg transition"
            >
              Scan QR
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || totalSubmissions === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-3 rounded-lg transition disabled:opacity-60"
            >
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <SubmissionsTable
            submissions={page?.submissions ?? []}
            onConfirmed={handleConfirmed}
            loading={tableLoading}
            pageOffset={(currentPage - 1) * PAGE_SIZE}
          />
        </div>

        {!tableLoading && search && (page?.submissions.length ?? 0) === 0 && (
          <p className="text-center text-sm text-gray-400 mt-4">
            No results for &quot;{search}&quot;
          </p>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>
              Page {currentPage} of {totalPages} · {totalSubmissions} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
