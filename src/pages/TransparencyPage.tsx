import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { fetchPublicLedger } from '../api/transactions';
import { useToast } from '../context/ToastContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import type { Ledger, PaymentEventTransactionGroup, Transaction, TransactionType } from '../types';

function formatNaira(amount: string | number, opts: { compact?: boolean } = {}): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return `₦${amount}`;
  if (opts.compact && Math.abs(n) >= 1000) {
    return n.toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
      notation: 'compact',
      maximumFractionDigits: 1,
    });
  }
  return n.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 });
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export default function TransparencyPage() {
  const { toast } = useToast();
  const { student, token, logout } = useStudentAuth();

  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPublicLedger({
        page,
        limit: 20,
        type: typeFilter || undefined,
      }, token ?? undefined);
      setLedger(data);
      setLastLoadedAt(new Date());
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout();
        setLedger(null);
        toast('Your student session expired. Please sign in again.', 'info');
      } else {
        toast('Failed to load ledger - the server may still be starting up.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, toast, token, logout]);

  useEffect(() => {
    if (student && token) {
      void loadLedger();
    }
  }, [student, token, loadLedger]);

  const balance = ledger ? Number(ledger.balance) : 0;
  const totalIn = ledger ? Number(ledger.totalCredits) : 0;
  const totalOut = ledger ? Number(ledger.totalDebits) : 0;
  const flowTotal = totalIn + totalOut;
  const inPct = flowTotal > 0 ? (totalIn / flowTotal) * 100 : 0;
  const outPct = flowTotal > 0 ? (totalOut / flowTotal) * 100 : 0;
  const balancePositive = balance >= 0;

  return (
    <div className="page-base pb-12">
      <header>
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-accent font-semibold">Class account</p>
              <h1 className="text-lg font-semibold tracking-tight mt-0.5">Transparency ledger</h1>
            </div>
            <div className="text-right">
              <p className="text-xs text-dim uppercase tracking-wider">Viewing as</p>
              <p className="text-sm font-semibold truncate max-w-[160px]">{student?.matricNumber}</p>
            </div>
          </div>

          <div className="card-base p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className={balancePositive ? 'text-success' : 'text-danger'}>●</span>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Current balance</p>
            </div>
            <p className="text-3xl sm:text-5xl font-semibold tracking-tight mt-1 break-words">
              {ledger ? formatNaira(ledger.balance) : <span className="text-dim">Loading…</span>}
            </p>
            {ledger && lastLoadedAt && (
              <p className="text-xs text-dim mt-2">Updated {formatRelative(lastLoadedAt.toISOString())}</p>
            )}

            {ledger && flowTotal > 0 && (
              <div className="mt-5">
                <svg
                  className="w-full h-2 rounded-full overflow-hidden bg-surface-2 border border-nx"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <rect x="0" y="0" width={inPct} height="8" className="fill-[color:var(--nx-success)]" />
                  <rect
                    x={inPct}
                    y="0"
                    width={outPct}
                    height="8"
                    className="fill-[color:var(--nx-danger)]"
                  />
                </svg>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-success">In {inPct.toFixed(0)}%</span>
                  <span className="text-danger">Out {outPct.toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          <StatCard
            label="Money in"
            value={ledger ? formatNaira(ledger.totalCredits, { compact: true }) : '-'}
            tone="success"
          />
          <StatCard
            label="Money out"
            value={ledger ? formatNaira(ledger.totalDebits, { compact: true }) : '-'}
            tone="danger"
          />
          <StatCard
            label="Entries"
            value={ledger ? String(ledger.transactionCount) : '-'}
            tone="neutral"
          />
        </div>

        <div className="card-base p-3 mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <h2 className="text-base font-semibold flex-1 pl-1">Transactions</h2>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as TransactionType | ''); setPage(1); }}
              className="input-base !w-auto !py-2 !text-sm flex-1 sm:flex-initial"
            >
              <option value="">All types</option>
              <option value="credit">Money in</option>
              <option value="debit">Money out</option>
            </select>
            <button
              type="button"
              onClick={() => void loadLedger()}
              disabled={loading}
              className="btn-primary !py-2 !text-sm shrink-0"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {loading && !ledger ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-base p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-11 h-11 rounded-xl bg-surface-2" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-2 rounded w-2/3" />
                    <div className="h-3 bg-surface-2 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : ledger ? (
          <GroupedTransactions ledger={ledger} onProofClick={setLightboxUrl} />
        ) : null}

        {ledger && ledger.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3 mt-6 text-center">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary !py-2 !text-sm flex-1 sm:flex-initial"
              >
                ← Previous
              </button>
              <span className="px-3 py-2 text-sm text-muted whitespace-nowrap">
                Page {page} of {ledger.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= ledger.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary !py-2 !text-sm flex-1 sm:flex-initial"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>

      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Proof"
            className="max-w-full max-h-full rounded-xl shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'danger' | 'neutral';
}) {
  const valueClass =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : '';

  return (
    <div className="card-base p-2 sm:p-3">
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-dim">{label}</p>
      <p className={`text-sm sm:text-lg font-semibold mt-1 truncate ${valueClass}`}>{value}</p>
    </div>
  );
}

function PaymentEventGroupCard({
  group,
  onProofClick,
}: {
  group: PaymentEventTransactionGroup;
  onProofClick: (url: string) => void;
}) {
  return (
    <section className="card-base overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-nx">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-dim">Payment event</p>
            <h3 className="text-base sm:text-lg font-semibold tracking-tight mt-1 break-words">
              {group.paymentEventTitle}
            </h3>
            <p className="text-xs text-muted mt-1 font-mono break-all">ref: {group.paymentEventReference}</p>
          </div>
          <div className="sm:text-right shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-dim">Total collected</p>
            <p className="text-xl sm:text-3xl font-semibold text-success mt-1">{formatNaira(group.totalCollected)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
          <span className="badge badge-success">{group.transactionCount} transactions</span>
        </div>
      </div>

      <details open>
        <summary className="cursor-pointer list-none px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-surface-2 transition-colors border-t border-nx">
          <span className="text-sm font-semibold">Individual Payments</span>
          <span className="text-muted text-sm">▼</span>
        </summary>
        <div className="px-3 sm:px-4 pb-4 pt-2 space-y-2">
          {group.transactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} onProofClick={onProofClick} />
          ))}
        </div>
      </details>
    </section>
  );
}

function GroupedTransactions({
  ledger,
  onProofClick,
}: {
  ledger: Ledger;
  onProofClick: (url: string) => void;
}) {
  const { paymentEventGroups, ungroupedTransactions } = useMemo(() => {
    if (ledger.paymentEventGroups) {
      return {
        paymentEventGroups: ledger.paymentEventGroups,
        ungroupedTransactions: ledger.ungroupedTransactions ?? ledger.transactions.filter((t) => !t.paymentEventId),
      };
    }

    const groups = new Map<
      string,
      {
        paymentEventId: string;
        paymentEventTitle: string;
        paymentEventSlug: string;
        paymentEventReference: string;
        transactions: Transaction[];
      }
    >();
    const ungrouped: Transaction[] = [];

    for (const transaction of ledger.transactions) {
      if (!transaction.paymentEventId || !transaction.paymentEventTitle) {
        ungrouped.push(transaction);
        continue;
      }

      if (!groups.has(transaction.paymentEventId)) {
        groups.set(transaction.paymentEventId, {
          paymentEventId: transaction.paymentEventId,
          paymentEventTitle: transaction.paymentEventTitle,
          paymentEventSlug: transaction.paymentEventSlug ?? transaction.paymentEventReference ?? transaction.paymentEventId,
          paymentEventReference: transaction.paymentEventReference ?? transaction.paymentEventSlug ?? transaction.paymentEventId,
          transactions: [],
        });
      }

      groups.get(transaction.paymentEventId)!.transactions.push(transaction);
    }

    return {
      paymentEventGroups: Array.from(groups.values()).map((group) => ({
        paymentEventId: group.paymentEventId,
        paymentEventTitle: group.paymentEventTitle,
        paymentEventSlug: group.paymentEventSlug,
        paymentEventReference: group.paymentEventReference,
        totalCollected: group.transactions.reduce((acc, transaction) => {
          if (transaction.type !== 'credit') return acc;
          return acc + Number(transaction.amount);
        }, 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }),
        transactionCount: group.transactions.length,
        transactions: group.transactions,
      })),
      ungroupedTransactions: ungrouped,
    };
  }, [ledger]);

  if (paymentEventGroups.length === 0 && ungroupedTransactions.length === 0) {
    return (
      <div className="card-base p-16 text-center">
        <p className="font-semibold">No transactions yet</p>
        <p className="text-sm text-muted mt-1">Entries will appear here once the fin sec records them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {paymentEventGroups.length > 0 && (
        <div className="space-y-3">
          <div className="px-1">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Payment events</h2>
          </div>
          <div className="space-y-4">
            {paymentEventGroups.map((group) => (
              <PaymentEventGroupCard key={group.paymentEventId} group={group} onProofClick={onProofClick} />
            ))}
          </div>
        </div>
      )}

      {ungroupedTransactions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-xs font-semibold text-dim uppercase tracking-wider">Other ledger entries</h3>
            <div className="flex-1 h-px bg-[color:var(--nx-border)]" />
          </div>
          <div className="space-y-2">
            {ungroupedTransactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} onProofClick={onProofClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionCard({
  transaction,
  onProofClick,
}: {
  transaction: Transaction;
  onProofClick: (url: string) => void;
}) {
  const isCredit = transaction.type === 'credit';
  return (
    <div className="card-base p-3 sm:p-4">
      <div className="flex gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg font-semibold bg-surface-2 border border-nx ${isCredit ? 'text-success' : 'text-danger'
            }`}
        >
          {isCredit ? '↓' : '↑'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-sm sm:text-base break-words min-w-0 leading-snug">
              {transaction.description}
            </p>
            <p
              className={`font-semibold text-sm sm:text-base whitespace-nowrap text-right flex-shrink-0 ${isCredit ? 'text-success' : 'text-danger'
                }`}
            >
              {isCredit ? '+' : '−'} {formatNaira(transaction.amount)}
            </p>
          </div>
          <div className="flex items-center gap-x-2 gap-y-1 mt-2 text-xs flex-wrap">
            {transaction.category && (
              <span className={`badge ${isCredit ? 'badge-success' : 'badge-danger'}`}>
                {transaction.category}
              </span>
            )}
            {transaction.recorderName && (
              <span className="text-dim break-words">
                Approved by {transaction.recorderName}
              </span>
            )}
          </div>
          {transaction.proofUrl && (
            <button
              type="button"
              onClick={() => onProofClick(transaction.proofUrl!)}
              className="btn-ghost !px-0 !py-1 !text-xs mt-2"
            >
              View proof →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
