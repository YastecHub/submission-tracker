import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import SubmissionsTable from '../components/SubmissionsTable';
import QRScanner from '../components/QRScanner';
import api from '../api/axios';
import type { SubmissionEvent, Submission } from '../types';
import { useToast } from '../context/ToastContext';

export default function EventDetail() {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<SubmissionEvent | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [evRes, subRes] = await Promise.all([
        api.get<SubmissionEvent>(`/api/events/id/${id}`),
        api.get<Submission[]>(`/api/submissions/${id}`),
      ]);
      setEvent(evRes.data);
      setSubmissions(subRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function handleConfirmed(updated: Submission): void {
    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
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

  const filtered = submissions.filter(
    (s) =>
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.matricNumber.toLowerCase().includes(search.toLowerCase())
  );

  const confirmed = submissions.filter((s) => s.isConfirmed).length;
  const pending = submissions.length - confirmed;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onConfirmed={(updated) =>
            setSubmissions((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            )
          }
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
            <p className="text-2xl font-bold text-gray-800">{submissions.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{confirmed}</p>
            <p className="text-xs text-gray-500 mt-1">Confirmed</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{pending}</p>
            <p className="text-xs text-gray-500 mt-1">Pending</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or matric number..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-3 rounded-lg transition"
            >
              Scan QR
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || submissions.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-3 rounded-lg transition disabled:opacity-60"
            >
              {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <SubmissionsTable submissions={filtered} onConfirmed={handleConfirmed} />
        </div>

        {search && filtered.length === 0 && submissions.length > 0 && (
          <p className="text-center text-sm text-gray-400 mt-4">
            No results for &quot;{search}&quot;
          </p>
        )}
      </main>
    </div>
  );
}
