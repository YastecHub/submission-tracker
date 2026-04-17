import { useState, useEffect, useCallback, useRef } from 'react';
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
  claimedTotal: number;
  page: number;
  totalPages: number;
}

interface ActionModal {
  type: 'confirm' | 'reject';
  receipt: PaymentReceipt;
}

interface ClaimResult {
  type: 'success' | 'warning' | 'error';
  message: string;
  fullName?: string;
  matricNumber?: string;
}

export default function PaymentEventDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [event, setEvent] = useState<PaymentEvent | null>(null);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [stats, setStats] = useState({ confirmed: 0, rejected: 0, pending: 0, total: 0, claimed: 0 });
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
  const [showScanner, setShowScanner] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);

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
        claimed: res.data.claimedTotal,
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

  async function handleClaim(code: string): Promise<void> {
    setClaimLoading(true);
    try {
      const res = await api.post<{
        alreadyClaimed: boolean;
        receipt: { fullName: string; matricNumber: string; claimedBy: string | null; claimedAt: string | null };
      }>('/api/payment-receipts/scan', { code });

      if (res.data.alreadyClaimed) {
        setClaimResult({
          type: 'warning',
          message: `Already collected by ${res.data.receipt.claimedBy}`,
          fullName: res.data.receipt.fullName,
          matricNumber: res.data.receipt.matricNumber,
        });
      } else {
        setClaimResult({
          type: 'success',
          message: 'Collected!',
          fullName: res.data.receipt.fullName,
          matricNumber: res.data.receipt.matricNumber,
        });
        void fetchReceipts();
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Claim failed'
        : 'Claim failed';
      setClaimResult({ type: 'error', message: msg });
    } finally {
      setClaimLoading(false);
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

        <div className="card-base p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <span className="badge badge-accent">Payment Collection</span>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight mt-3">{event.title}</h1>
              {event.description && <p className="text-sm text-muted mt-1">{event.description}</p>}
              <p className="text-xs text-dim mt-2">Deadline: {deadline}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl sm:text-2xl font-semibold text-accent">{amount}</p>
              <p className="text-sm text-muted mt-1">{event.bankName}</p>
              <p className="text-sm">{event.accountName}</p>
              <p className="font-mono text-sm text-muted">{event.accountNumber}</p>
            </div>
          </div>

          <div className={`grid gap-2 sm:gap-3 mt-5 grid-cols-2 ${event.hasTickets ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
            <div className="card-base p-3 text-center bg-surface-2">
              <p className="text-lg sm:text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-dim mt-1">Total</p>
            </div>
            <div className="card-base p-3 text-center bg-surface-2">
              <p className="text-lg sm:text-2xl font-semibold text-accent">{stats.pending}</p>
              <p className="text-xs text-dim mt-1">Pending</p>
            </div>
            <div className="card-base p-3 text-center bg-surface-2">
              <p className="text-lg sm:text-2xl font-semibold text-success">{stats.confirmed}</p>
              <p className="text-xs text-dim mt-1">Confirmed</p>
            </div>
            <div className="card-base p-3 text-center bg-surface-2">
              <p className="text-lg sm:text-2xl font-semibold text-danger">{stats.rejected}</p>
              <p className="text-xs text-dim mt-1">Rejected</p>
            </div>
            {event.hasTickets && (
              <div className="card-base p-3 text-center bg-surface-2 col-span-2 sm:col-span-1">
                <p className="text-lg sm:text-2xl font-semibold text-accent">{stats.claimed}</p>
                <p className="text-xs text-dim mt-1">Collected</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 bg-surface-2 border border-nx rounded-xl px-4 py-2.5">
            <span className="text-xs text-muted w-full sm:flex-1 truncate">
              Student link: <span className="font-mono text-accent">/payment/{event.slug}</span>
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/payment/${event.slug}`);
                toast('Link copied!', 'success');
              }}
              className="btn-ghost !py-1 !px-2 !text-xs whitespace-nowrap self-end sm:self-auto"
            >
              Copy link
            </button>
          </div>

          <label className="flex items-center gap-3 mt-4 cursor-pointer select-none bg-surface-2 border border-nx rounded-xl px-4 py-3">
            <input
              type="checkbox"
              checked={event.hasTickets}
              onChange={async (e) => {
                const val = e.target.checked;
                try {
                  await api.patch(`/api/payment-events/${event.id}`, { hasTickets: val });
                  setEvent({ ...event, hasTickets: val });
                  toast(val ? 'Collection tickets enabled' : 'Collection tickets disabled', 'success');
                } catch {
                  toast('Failed to update', 'error');
                }
              }}
              className="w-4 h-4 rounded border-[color:var(--nx-border)] bg-surface-2 accent-[color:var(--nx-accent)]"
            />
            <div>
              <span className="text-sm font-medium">Enable collection tickets</span>
              <p className="text-xs text-dim mt-0.5">Students get a QR ticket when confirmed. Scan at the event to mark collected.</p>
            </div>
          </label>
        </div>

        {event.hasTickets && (
          <div className="card-base p-4 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-sm font-semibold flex-1">Collection tickets</h3>
              <button
                type="button"
                onClick={() => { setShowScanner(true); setClaimResult(null); }}
                className="btn-primary !py-2 !text-sm"
              >
                Scan ticket
              </button>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter claim code (e.g. 7036-1DCB)"
                className="input-base flex-1 !py-2 !text-sm font-mono uppercase"
                maxLength={9}
              />
              <button
                type="button"
                disabled={!manualCode.trim() || claimLoading}
                onClick={() => { void handleClaim(manualCode.trim()); setManualCode(''); }}
                className="btn-secondary !py-2 !text-sm whitespace-nowrap"
              >
                {claimLoading ? 'Checking…' : 'Claim'}
              </button>
            </div>
            {claimResult && (
              <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${
                claimResult.type === 'success' ? 'alert-success' :
                claimResult.type === 'warning' ? 'bg-[color:var(--nx-accent-soft)] border border-[color:var(--nx-accent)] text-[color:var(--nx-accent)]' :
                'alert-danger'
              }`}>
                <p className="font-semibold">{claimResult.message}</p>
                {claimResult.fullName && (
                  <p className="text-xs mt-0.5 opacity-80">{claimResult.fullName} ({claimResult.matricNumber})</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or matric number…"
            className="input-base flex-1 sm:min-w-[180px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-base sm:!w-auto"
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
                <div className="flex gap-3 sm:gap-4 items-start">
                  <button
                    onClick={() => setLightboxUrl(receipt.receiptUrl)}
                    className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-nx hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={receipt.receiptUrl}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold break-words">{receipt.fullName}</p>
                      {statusBadge(receipt.status)}
                      {event.hasTickets && receipt.isClaimed && (
                        <span className="badge badge-accent" title={receipt.claimedBy ? `Claimed by ${receipt.claimedBy}` : undefined}>
                          Collected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted break-words">
                      {receipt.matricNumber}{receipt.level ? ` · ${receipt.level}` : ''}
                    </p>
                    <p className="text-xs text-dim mt-0.5">
                      Submitted {new Date(receipt.submittedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {receipt.confirmedBy && (
                      <p className="text-xs text-muted mt-0.5 break-words">
                        {receipt.status === 'confirmed' ? 'Confirmed' : 'Rejected'} by {receipt.confirmedBy}
                        {receipt.note && <span className="italic"> — &ldquo;{receipt.note}&rdquo;</span>}
                      </p>
                    )}
                  </div>
                </div>

                {receipt.status === 'pending' && (
                  <div className="flex flex-row gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setActionModal({ type: 'confirm', receipt })}
                      className="btn-primary !py-1.5 !px-3 !text-xs flex-1 sm:flex-initial"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionModal({ type: 'reject', receipt })}
                      className="btn-secondary !py-1.5 !px-3 !text-xs flex-1 sm:flex-initial"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {receipt.status === 'confirmed' && event.hasTickets && (
                  <div className="flex flex-row gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/payment/${event.slug}/success?id=${receipt.id}`;
                        navigator.clipboard.writeText(url);
                        toast('Ticket link copied!', 'success');
                      }}
                      className="btn-ghost !py-1.5 !px-3 !text-xs"
                    >
                      Copy ticket link
                    </button>
                  </div>
                )}
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

      {showScanner && (
        <TicketScannerModal
          onScan={(code) => { void handleClaim(code); }}
          onClose={() => setShowScanner(false)}
          result={claimResult}
          onScanAgain={() => setClaimResult(null)}
        />
      )}

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

function TicketScannerModal({
  onScan,
  onClose,
  result,
  onScanAgain,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
  result: ClaimResult | null;
  onScanAgain: () => void;
}) {
  const instanceRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [error, setError] = useState('');
  const scanningRef = useRef(true);

  useEffect(() => {
    if (!result) startScanner();
    return () => { instanceRef.current?.stop().catch(() => {}); };
  }, [result]);

  async function startScanner(): Promise<void> {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const qr = new Html5Qrcode('ticket-qr-reader');
      instanceRef.current = qr;
      scanningRef.current = true;

      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          if (!scanningRef.current) return;
          scanningRef.current = false;
          await qr.stop();
          onScan(decodedText);
        },
        () => {},
      );
    } catch {
      setError('Camera access denied or not available.');
    }
  }

  function handleScanAgain() {
    setError('');
    onScanAgain();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative card-base w-full max-w-sm overflow-hidden z-10 animate-fade-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-nx">
          <h2 className="font-semibold">Scan ticket</h2>
          <button onClick={onClose} className="text-muted hover:text-[color:var(--nx-text)] text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4">
          {error ? (
            <div className="text-center py-8 text-danger text-sm">{error}</div>
          ) : result ? (
            <div className="text-center py-4">
              {result.type === 'success' && (
                <>
                  <div className="mx-auto w-14 h-14 bg-[color:var(--nx-success-soft)] rounded-full flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-semibold text-success mb-1">{result.message}</p>
                </>
              )}
              {result.type === 'warning' && (
                <>
                  <div className="mx-auto w-14 h-14 bg-[color:var(--nx-accent-soft)] rounded-full flex items-center justify-center mb-3">
                    <span className="text-2xl text-accent">!</span>
                  </div>
                  <p className="font-semibold text-accent mb-1">{result.message}</p>
                </>
              )}
              {result.type === 'error' && (
                <>
                  <div className="mx-auto w-14 h-14 bg-[color:var(--nx-danger-soft)] rounded-full flex items-center justify-center mb-3">
                    <span className="text-2xl text-danger">!</span>
                  </div>
                  <p className="font-semibold text-danger mb-1">{result.message}</p>
                </>
              )}
              {result.fullName && (
                <>
                  <p className="text-sm">{result.fullName}</p>
                  <p className="text-xs text-muted">{result.matricNumber}</p>
                </>
              )}
              <button onClick={handleScanAgain} className="btn-primary mt-4 !py-2 !text-sm">
                Scan next
              </button>
            </div>
          ) : (
            <>
              <p className="text-center text-sm text-muted mb-3">Point camera at student&apos;s ticket QR</p>
              <div id="ticket-qr-reader" className="w-full rounded-xl overflow-hidden" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
