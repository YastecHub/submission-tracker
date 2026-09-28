import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useToast } from '../context/ToastContext';
import type { PaymentEvent, PaymentReceipt } from '../types';
import { useReceiptList } from '../features/payments/hooks/useReceiptList';
import { claimTicket, reviewReceipt } from '../features/payments/api/actions';
import { ReceiptReviewModal, type ReceiptAction } from '../features/payments/components/ReceiptReviewModal';
import { TicketScannerModal, type ClaimResult } from '../features/payments/components/TicketScannerModal';
import { useAuth } from '../context/AuthContext';
import { canManagePaymentEvent } from '../features/auth/model/capabilities';
import { type DisplayPaymentReceipt,
  PICNIC_EXPORT_AMOUNT, PICNIC_LEGACY_EVENT_ID, PICNIC_LEGACY_EVENT_TITLE,
  isPicnicPaymentEvent, dedupePicnicReceipts } from '../features/payments/model/picnic';


const PAGE_SIZE = 50;

function normalizeReceiptName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}


function csvValue(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>): void {
  const csv = rows.map((row) => row.map(csvValue).join(',')).join('\n');
  const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function PaymentEventDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user } = useAuth();

  const [event, setEvent] = useState<PaymentEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionModal, setActionModal] = useState<ReceiptAction | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updatingTickets, setUpdatingTickets] = useState(false);
  const actionInFlight = useRef(false);
  const claimInFlight = useRef(false);
  const combinedPicnicMode = isPicnicPaymentEvent(id);
  const canManage = canManagePaymentEvent(user?.role, user?.id, event?.createdBy);

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = search.trim();
      setDebouncedSearch(trimmed.length >= 2 ? trimmed : '');
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const receiptState = useReceiptList(id!, combinedPicnicMode, page, debouncedSearch, statusFilter);
  const allReceipts: DisplayPaymentReceipt[] = receiptState.data?.receipts ?? [];
  const receiptStats = {
    total: (receiptState.data?.confirmedTotal ?? 0) + (receiptState.data?.rejectedTotal ?? 0) + (receiptState.data?.pendingTotal ?? 0),
    confirmed: receiptState.data?.confirmedTotal ?? 0,
    rejected: receiptState.data?.rejectedTotal ?? 0,
    pending: receiptState.data?.pendingTotal ?? 0,
    claimed: receiptState.data?.claimedTotal ?? 0,
    totalPages: Math.max(1, receiptState.data?.totalPages ?? 1),
  };
  const fetchAllReceipts = receiptState.refresh;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setEvent(null);
    async function init() {
      try {
        const res = await api.get<PaymentEvent>(`/api/payment-events/id/${id}`, { signal: controller.signal });
        if (!controller.signal.aborted) setEvent(res.data);
      } catch {
        if (!controller.signal.aborted) toast('Payment event not found', 'error');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void init();
    return () => controller.abort();
  }, [id, toast]);


  const filteredReceipts = useMemo(() => {
    if (!combinedPicnicMode) return allReceipts;
    const q = debouncedSearch.toLowerCase();
    return allReceipts.filter((receipt) => {
      const matchesSearch =
        !q ||
        receipt.fullName.toLowerCase().includes(q) ||
        receipt.matricNumber.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || receipt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allReceipts, combinedPicnicMode, debouncedSearch, statusFilter]);

  const receipts = useMemo(
    () => combinedPicnicMode ? filteredReceipts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : filteredReceipts,
    [combinedPicnicMode, filteredReceipts, page]
  );

  const totalPages = combinedPicnicMode ? Math.max(1, Math.ceil(filteredReceipts.length / PAGE_SIZE)) : receiptStats.totalPages;
  useEffect(() => {
    if (receiptState.data && !receiptState.loading && page > totalPages) setPage(totalPages);
  }, [receiptState.data, receiptState.loading, page, totalPages]);
  const stats = receiptStats;

  async function handleAction() {
    if (!actionModal || actionInFlight.current) return;
    actionInFlight.current = true;
    setActionLoading(true);
    const { type, receipt } = actionModal;
    try {
      await reviewReceipt(receipt.id, type, actionNote);
      void fetchAllReceipts();
      toast(type === 'confirm' ? 'Payment confirmed!' : 'Receipt rejected.', type === 'confirm' ? 'success' : 'error');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast(err.response?.data?.error ?? 'Action failed', 'error');
      } else {
        toast('Action failed', 'error');
      }
    } finally {
      setActionLoading(false);
      actionInFlight.current = false;
      setActionModal(null);
      setActionNote('');
    }
  }

  async function handleClaim(code: string): Promise<void> {
    if (claimInFlight.current) return;
    claimInFlight.current = true;
    setClaimLoading(true);
    try {
      const data = await claimTicket(code);

      if (data.alreadyClaimed) {
        setClaimResult({
          type: 'warning',
          message: `Already collected by ${data.receipt.claimedBy}`,
          fullName: data.receipt.fullName,
          matricNumber: data.receipt.matricNumber,
        });
      } else {
        setClaimResult({
          type: 'success',
          message: 'Collected!',
          fullName: data.receipt.fullName,
          matricNumber: data.receipt.matricNumber,
        });
        void fetchAllReceipts();
      }
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Claim failed'
        : 'Claim failed';
      setClaimResult({ type: 'error', message: msg });
    } finally {
      setClaimLoading(false);
      claimInFlight.current = false;
    }
  }

  async function handleExport(): Promise<void> {
    if (!id) return;
    setExporting(true);
    try {
      if (combinedPicnicMode) {
        const confirmedPicnicReceipts = dedupePicnicReceipts(allReceipts.filter((receipt) => receipt.status === 'confirmed'));
        downloadCsv(
          'picnic_payments_combined.csv',
          [
            ['S/N', 'Full Name', 'Matric Number', 'Level', 'Expected Picnic Amount', 'Status', 'Source Event'],
            ...confirmedPicnicReceipts.map((receipt, index) => [
              index + 1,
              normalizeReceiptName(receipt.fullName),
              receipt.matricNumber,
              receipt.level ?? '100L',
              PICNIC_EXPORT_AMOUNT,
              'Confirmed',
              receipt.sourceEventIds?.includes(PICNIC_LEGACY_EVENT_ID)
                ? (receipt.sourceEventIds.length > 1 ? `${event?.title ?? 'Picnic payment'} + ${PICNIC_LEGACY_EVENT_TITLE}` : PICNIC_LEGACY_EVENT_TITLE)
                : event?.title ?? 'Picnic payment',
            ]),
          ]
        );
        return;
      }

      const res = await api.get(`/api/payment-receipts/${id}/export`, { responseType: 'blob' });
      const contentDisposition = (res.headers['content-disposition'] as string) ?? '';
      const match = contentDisposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : `payments_${id}.xlsx`;
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

  function formatAmountValue(value: string | null | undefined): string {
    if (!value) return '-';
    return Number(value).toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    });
  }

  function amountCheckBadge(receipt: PaymentReceipt) {
    const status = receipt.amountCheckStatus ?? 'pending';
    if (status === 'matched') {
      return <span className="badge badge-success" title={receipt.amountCheckNote ?? undefined}>Amount matched</span>;
    }
    if (status === 'mismatch') {
      return <span className="badge badge-danger" title={receipt.amountCheckNote ?? undefined}>Amount mismatch</span>;
    }
    if (status === 'unreadable') {
      return <span className="badge badge-accent" title={receipt.amountCheckNote ?? undefined}>Needs review</span>;
    }
    if (status === 'unavailable') {
      return <span className="badge" title={receipt.amountCheckNote ?? undefined}>AI unavailable</span>;
    }
    return <span className="badge">Checking amount</span>;
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
        <Link to="/dashboard?section=payments" className="btn-ghost !px-0 mb-4">
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

          {canManage && <label className="flex items-center gap-3 mt-4 cursor-pointer select-none bg-surface-2 border border-nx rounded-xl px-4 py-3">
            <input
              type="checkbox"
              checked={event.hasTickets}
              disabled={updatingTickets}
              onChange={async (e) => {
                const val = e.target.checked;
                setUpdatingTickets(true);
                try {
                  await api.patch(`/api/payment-events/${event.id}`, { hasTickets: val });
                  setEvent({ ...event, hasTickets: val });
                  toast(val ? 'Collection tickets enabled' : 'Collection tickets disabled', 'success');
                } catch {
                  toast('Failed to update', 'error');
                } finally {
                  setUpdatingTickets(false);
                }
              }}
              className="w-4 h-4 rounded border-[color:var(--nx-border)] bg-surface-2 accent-[color:var(--nx-accent)]"
            />
            <div>
              <span className="text-sm font-medium">Enable collection tickets</span>
              <p className="text-xs text-dim mt-0.5">Students get a QR ticket when confirmed. Scan at the event to mark collected.</p>
            </div>
          </label>}
        </div>

        {canManage && event.hasTickets && (
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
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || stats.total === 0}
            className="btn-primary !py-3 sm:!py-2 !text-sm whitespace-nowrap"
          >
            {exporting ? 'Exporting…' : 'Export sheet'}
          </button>
        </div>

        {receiptState.error ? (
          <div role="alert" className="alert-danger">Unable to load receipts. <button className="btn-secondary" onClick={() => void fetchAllReceipts()}>Try again</button></div>
        ) : receiptState.loading ? (
          <p role="status" className="text-center text-dim py-10">Loading receipts…</p>
        ) : receipts.length === 0 ? (
          <div className="card-base p-10 text-center text-dim">
            <p className="font-medium">{debouncedSearch || statusFilter ? 'No receipts match your filters' : 'No receipts yet'}</p>
            <p className="text-sm mt-1">{debouncedSearch || statusFilter ? 'Try a different search or status.' : 'Share the student link for them to submit.'}</p>
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
                      {amountCheckBadge(receipt)}
                      {event.hasTickets && receipt.isClaimed && (
                        <span className="badge badge-accent" title={receipt.claimedBy ? `Claimed by ${receipt.claimedBy}` : undefined}>
                          Collected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted break-words">
                      {receipt.matricNumber}{receipt.level ? ` · ${receipt.level}` : ''}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      AI amount: {formatAmountValue(receipt.extractedAmount)}
                    </p>
                    {receipt.amountCheckNote && (
                      <p className="text-xs text-dim mt-0.5 break-words">{receipt.amountCheckNote}</p>
                    )}
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

                {canManage && receipt.status === 'pending' && (
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

      {canManage && showScanner && (
        <TicketScannerModal
          onScan={(code) => { void handleClaim(code); }}
          onClose={() => setShowScanner(false)}
          result={claimResult}
          onScanAgain={() => setClaimResult(null)}
        />
      )}

      {canManage && actionModal && (
        <ReceiptReviewModal action={actionModal} note={actionNote} loading={actionLoading}
          onNoteChange={setActionNote} onSubmit={() => void handleAction()}
          onClose={() => { setActionModal(null); setActionNote(''); }} />
      )}
    </div>
  );
}
