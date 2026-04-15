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
    void init();
  }, [id, toast]);

  useEffect(() => {
    if (!loading) void fetchReceipts();
  }, [loading, fetchReceipts]);

  useEffect(() => {
    const interval = setInterval(() => void fetchReceipts(), 30_000);
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
      <div className="page-base">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[color:var(--nx-accent)]" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page-base">
        <Navbar />
        <div className="text-center py-20 text-dim">Payment event not found.</div>
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
    if (status === 'confirmed') return <span className="badge badge-success">Confirmed</span>;
    if (status === 'rejected') return <span className="badge badge-danger">Rejected</span>;
    return <span className="badge badge-accent">Pending</span>;
  }

  return (
    <div className="page-base">
      <Navbar />

      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Receipt"
            className="max-w-full max-h-full rounded-xl shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/dashboard" className="btn-ghost !px-0 mb-4">
          ← Back to dashboard
        </Link>

        <div className="card-base p-5 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <span className="badge badge-accent">Payment Collection</span>
              <h1 className="text-xl font-semibold tracking-tight mt-3">{event.title}</h1>
              {event.description && <p className="text-sm text-muted mt-1">{event.description}</p>}
              <p className="text-xs text-dim mt-2">Deadline: {deadline}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-accent">{amount}</p>
              <p className="text-sm text-muted mt-1">{event.bankName}</p>
              <p className="text-sm">{event.accountName}</p>
              <p className="font-mono text-sm text-muted">{event.accountNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-5">
            <div className="card-base p-3 text-center bg-surface-2">
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-dim mt-1">Total</p>
            </div>
            <div className="card-base p-3 text-center bg-surface-2">
              <p className="text-2xl font-semibold text-accent">{stats.pending}</p>
              <p className="text-xs text-dim mt-1">Pending</p>
            </div>
            <div className="card-base p-3 text-center bg-surface-2">
              <p className="text-2xl font-semibold text-success">{stats.confirmed}</p>
              <p className="text-xs text-dim mt-1">Confirmed</p>
            </div>
            <div className="card-base p-3 text-center bg-surface-2">
              <p className="text-2xl font-semibold text-danger">{stats.rejected}</p>
              <p className="text-xs text-dim mt-1">Rejected</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 bg-surface-2 border border-nx rounded-xl px-4 py-2.5">
            <span className="text-xs text-muted flex-1 truncate">
              Student link: <span className="font-mono text-accent">/payment/{event.slug}</span>
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/payment/${event.slug}`);
                toast('Link copied!', 'success');
              }}
              className="btn-ghost !py-1 !px-2 !text-xs whitespace-nowrap"
            >
              Copy link
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or matric number…"
            className="input-base flex-1 min-w-[180px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-base !w-auto"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {receipts.length === 0 ? (
          <div className="card-base p-10 text-center text-dim">
            <p className="font-medium">No receipts yet</p>
            <p className="text-sm mt-1">Share the student link for them to submit.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="card-base p-4">
                <div className="flex gap-4 items-start">
                  <button
                    onClick={() => setLightboxUrl(receipt.receiptUrl)}
                    className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-nx hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={receipt.receiptUrl}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold">{receipt.fullName}</p>
                      {statusBadge(receipt.status)}
                    </div>
                    <p className="text-sm text-muted">
                      {receipt.matricNumber}{receipt.level ? ` · ${receipt.level}` : ''}
                    </p>
                    <p className="text-xs text-dim mt-0.5">
                      Submitted {new Date(receipt.submittedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {receipt.confirmedBy && (
                      <p className="text-xs text-muted mt-0.5">
                        {receipt.status === 'confirmed' ? 'Confirmed' : 'Rejected'} by {receipt.confirmedBy}
                        {receipt.note && <span className="italic"> — &ldquo;{receipt.note}&rdquo;</span>}
                      </p>
                    )}
                  </div>

                  {receipt.status === 'pending' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => setActionModal({ type: 'confirm', receipt })}
                        className="btn-primary !py-1.5 !px-3 !text-xs"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setActionModal({ type: 'reject', receipt })}
                        className="btn-secondary !py-1.5 !px-3 !text-xs"
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 text-sm text-muted">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary !py-2 !text-sm"
              >
                ← Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary !py-2 !text-sm"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => { setActionModal(null); setActionNote(''); }} />
          <div className="relative card-base w-full max-w-sm p-6 z-10 animate-fade-up">
            <h3 className="text-lg font-semibold mb-2">
              {actionModal.type === 'confirm' ? 'Confirm payment' : 'Reject receipt'}
            </h3>
            <p className="text-sm text-muted mb-4">
              {actionModal.type === 'confirm'
                ? `Confirm payment from ${actionModal.receipt.fullName} (${actionModal.receipt.matricNumber})?`
                : `Reject receipt from ${actionModal.receipt.fullName} (${actionModal.receipt.matricNumber})?`}
            </p>

            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
              Note (optional)
            </label>
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={2}
              placeholder={actionModal.type === 'reject' ? 'Reason for rejection…' : 'Any note for the student…'}
              className="input-base mb-4 resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setActionModal(null); setActionNote(''); }}
                disabled={actionLoading}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="btn-primary flex-1"
              >
                {actionLoading ? 'Please wait…' : actionModal.type === 'confirm' ? 'Confirm' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
