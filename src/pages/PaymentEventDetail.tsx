import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useToast } from '../context/ToastContext';
import type { PaymentEvent, PaymentReceipt } from '../types';

interface ReceiptsResponse {
  receipts: PaymentReceipt[];
  total: number;
  confirmedTotal: number;
  rejectedTotal: number;
  pendingTotal: number;
  page: number;
  totalPages: number;
}

interface ActionModal {
  type: 'confirm' | 'reject';
  receipt: PaymentReceipt;
}

export default function PaymentEventDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [event, setEvent] = useState<PaymentEvent | null>(null);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [stats, setStats] = useState({ confirmed: 0, rejected: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchReceipts = useCallback(async () => {
    if (!id) return;
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get<ReceiptsResponse>(`/api/payment-receipts/${id}?${params}`);
      setReceipts(res.data.receipts);
      setTotalPages(res.data.totalPages);
      setStats({
        confirmed: res.data.confirmedTotal,
        rejected: res.data.rejectedTotal,
        pending: res.data.pendingTotal,
        total: res.data.confirmedTotal + res.data.rejectedTotal + res.data.pendingTotal,
      });
    } catch {
      toast('Failed to load receipts', 'error');
    }
  }, [id, page, debouncedSearch, statusFilter, toast]);

  useEffect(() => {
    async function init() {
      try {
        const res = await api.get<PaymentEvent>(`/api/payment-events/id/${id}`);
        setEvent(res.data);
      } catch {
        toast('Payment event not found', 'error');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, toast]);

  useEffect(() => {
    if (!loading) fetchReceipts();
  }, [loading, fetchReceipts]);

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(fetchReceipts, 30_000);
    return () => clearInterval(interval);
  }, [fetchReceipts]);

  async function handleAction() {
    if (!actionModal) return;
    setActionLoading(true);
    const { type, receipt } = actionModal;
    try {
      const endpoint = `/api/payment-receipts/${receipt.id}/${type}`;
      const updated = await api.patch<PaymentReceipt>(endpoint, { note: actionNote.trim() || undefined });
      setReceipts((prev) => prev.map((r) => (r.id === receipt.id ? updated.data : r)));
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        confirmed: type === 'confirm' ? prev.confirmed + 1 : prev.confirmed,
        rejected: type === 'reject' ? prev.rejected + 1 : prev.rejected,
      }));
      toast(type === 'confirm' ? 'Payment confirmed!' : 'Receipt rejected.', type === 'confirm' ? 'success' : 'error');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast(err.response?.data?.error ?? 'Action failed', 'error');
      } else {
        toast('Action failed', 'error');
      }
    } finally {
      setActionLoading(false);
      setActionModal(null);
      setActionNote('');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-20 text-gray-400">Payment event not found.</div>
      </div>
    );
  }

  const amount = parseFloat(event.amount).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  });

  const deadline = new Date(event.deadline).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  function statusBadge(status: PaymentReceipt['status']) {
    if (status === 'confirmed')
      return <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">Confirmed</span>;
    if (status === 'rejected')
      return <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">Rejected</span>;
    return <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full">Pending</span>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Receipt"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/40 rounded-full w-10 h-10 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Back link */}
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
          ← Back to Dashboard
        </Link>

        {/* Event header */}
        <div className="bg-white rounded-2xl shadow p-5 mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs uppercase tracking-widest text-green-600 font-semibold">Payment Collection</span>
              <h1 className="text-xl font-bold text-gray-900 mt-0.5">{event.title}</h1>
              {event.description && <p className="text-sm text-gray-500 mt-1">{event.description}</p>}
              <p className="text-xs text-gray-400 mt-1">Deadline: {deadline}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-700">{amount}</p>
              <p className="text-sm text-gray-500">{event.bankName}</p>
              <p className="text-sm text-gray-600 font-medium">{event.accountName}</p>
              <p className="font-mono text-sm text-gray-800">{event.accountNumber}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Total', value: stats.total, color: 'text-gray-700' },
              { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
              { label: 'Confirmed', value: stats.confirmed, color: 'text-green-600' },
              { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Student link */}
          <div className="mt-4 flex items-center gap-2 bg-green-50 rounded-xl px-4 py-2">
            <span className="text-xs text-gray-500 flex-1 truncate">
              Student link: <span className="font-mono text-green-700">/pay/{event.slug}</span>
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/pay/${event.slug}`);
                toast('Link copied!', 'success');
              }}
              className="text-xs text-green-700 font-semibold hover:underline whitespace-nowrap"
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or matric..."
            className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Receipts list */}
        {receipts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🧾</p>
            <p className="font-medium">No receipts yet</p>
            <p className="text-sm mt-1">Share the student link for them to submit.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="bg-white rounded-2xl shadow p-4">
                <div className="flex gap-4 items-start">
                  {/* Receipt thumbnail */}
                  <button
                    onClick={() => setLightboxUrl(receipt.receiptUrl)}
                    className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 hover:opacity-80 transition"
                  >
                    <img
                      src={receipt.receiptUrl}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-900">{receipt.fullName}</p>
                      {statusBadge(receipt.status)}
                    </div>
                    <p className="text-sm text-gray-500">{receipt.matricNumber}{receipt.level ? ` · ${receipt.level}` : ''}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted {new Date(receipt.submittedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {receipt.confirmedBy && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {receipt.status === 'confirmed' ? 'Confirmed' : 'Rejected'} by {receipt.confirmedBy}
                        {receipt.note && <span className="italic"> — "{receipt.note}"</span>}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {receipt.status === 'pending' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => setActionModal({ type: 'confirm', receipt })}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setActionModal({ type: 'reject', receipt })}
                        className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-sm border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Confirm / Reject modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-1">
              {actionModal.type === 'confirm' ? 'Confirm Payment' : 'Reject Receipt'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {actionModal.type === 'confirm'
                ? `Confirm payment from ${actionModal.receipt.fullName} (${actionModal.receipt.matricNumber})?`
                : `Reject receipt from ${actionModal.receipt.fullName} (${actionModal.receipt.matricNumber})?`}
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={2}
              placeholder={actionModal.type === 'reject' ? 'Reason for rejection...' : 'Any note for the student...'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setActionModal(null); setActionNote(''); }}
                disabled={actionLoading}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex-1 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60
                  ${actionModal.type === 'confirm' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {actionLoading ? '...' : actionModal.type === 'confirm' ? 'Confirm' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
