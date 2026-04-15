import { useState, useEffect, useCallback, useMemo, FormEvent } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { fetchPublicLedger, verifyMatricNumber } from '../api/transactions';
import { useToast } from '../context/ToastContext';
import type { Ledger, Transaction, TransactionType } from '../types';

const STORAGE_KEY = 'classLedgerVerifiedMatric';

interface Verified {
  matricNumber: string;
  displayName: string;
}

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
  const [verified, setVerified] = useState<Verified | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Verified) : null;
    } catch {
      return null;
    }
  });
  const [matricInput, setMatricInput] = useState('');
  const [verifying, setVerifying] = useState(false);

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
      });
      setLedger(data);
      setLastLoadedAt(new Date());
    } catch {
      toast('Failed to load ledger — the server may still be starting up.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, toast]);

  useEffect(() => {
    if (verified) void loadLedger();
  }, [verified, loadLedger]);

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const matric = matricInput.trim().toUpperCase();
    if (!matric) return;
    setVerifying(true);
    try {
      const res = await verifyMatricNumber(matric);
      if (res.verified && res.displayName && res.matricNumber) {
        const v: Verified = { matricNumber: res.matricNumber, displayName: res.displayName };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
        setVerified(v);
        toast(`Welcome, ${res.displayName.split(' ')[0]}!`, 'success');
      } else {
        toast('Matric not found in class records', 'error');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        toast('Matric not found in class records', 'error');
      } else {
        toast('Verification failed', 'error');
      }
    } finally {
      setVerifying(false);
    }
  }

  function handleLogOut() {
    localStorage.removeItem(STORAGE_KEY);
    setVerified(null);
    setLedger(null);
    setMatricInput('');
  }

  if (!verified) {
    return (
      <div className="page-base flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-up">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Class account</h1>
            <p className="text-muted text-sm mt-1.5">Full transparency. Every kobo accounted for.</p>
          </div>

          <div className="card-base p-6">
            <h2 className="text-base font-semibold mb-1">Verify your matric</h2>
            <p className="text-sm text-muted mb-5">Only verified class members can view the ledger.</p>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                  Matric number
                </label>
                <input
                  type="text"
                  value={matricInput}
                  onChange={(e) => setMatricInput(e.target.value)}
                  placeholder="e.g. CSC/2020/001"
                  className="input-base uppercase"
                  autoFocus
                />
                <p className="text-xs text-dim mt-1.5">
                  Must match a matric that has submitted an assignment or payment.
                </p>
              </div>
              <button
                type="submit"
                disabled={verifying || !matricInput.trim()}
                className="btn-primary w-full"
              >
                {verifying ? 'Verifying…' : 'View ledger'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-nx text-center">
              <Link to="/login" className="text-xs text-muted hover:text-accent transition-colors">
                Are you an admin? Log in →
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-dim mt-5">
            Your matric is only used to unlock this page. Nothing is tracked.
          </p>
        </div>
      </div>
    );
  }

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
              <p className="text-sm font-semibold truncate max-w-[160px]">{verified.displayName}</p>
              <button
                type="button"
                onClick={handleLogOut}
                className="text-xs text-muted hover:text-accent underline mt-0.5 transition-colors"
              >
                Use different matric
              </button>
            </div>
          </div>

          <div className="card-base p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className={balancePositive ? 'text-success' : 'text-danger'}>●</span>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Current balance</p>
            </div>
            <p className="text-4xl sm:text-5xl font-semibold tracking-tight mt-1">
              {ledger ? formatNaira(ledger.balance) : <span className="text-dim">Loading…</span>}
            </p>
            {ledger && lastLoadedAt && (
              <p className="text-xs text-dim mt-2">Updated {formatRelative(lastLoadedAt.toISOString())}</p>
            )}

            {ledger && flowTotal > 0 && (
              <div className="mt-5">
                <div className="flex h-2 rounded-full overflow-hidden bg-surface-2 border border-nx">
                  <div className="bg-[color:var(--nx-success)] transition-[width]" style={{ width: `${inPct}%` }} />
                  <div className="bg-[color:var(--nx-danger)] transition-[width]" style={{ width: `${outPct}%` }} />
                </div>
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
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            label="Money in"
            value={ledger ? formatNaira(ledger.totalCredits, { compact: true }) : '—'}
            tone="success"
          />
          <StatCard
            label="Money out"
            value={ledger ? formatNaira(ledger.totalDebits, { compact: true }) : '—'}
            tone="danger"
          />
          <StatCard
            label="Entries"
            value={ledger ? String(ledger.transactionCount) : '—'}
            tone="neutral"
          />
        </div>

        <div className="card-base p-3 mb-4 flex gap-2 items-center">
          <h2 className="text-base font-semibold flex-1 pl-2">Transactions</h2>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as TransactionType | ''); setPage(1); }}
            className="input-base !w-auto !py-2 !text-sm"
          >
            <option value="">All types</option>
            <option value="credit">Money in</option>
            <option value="debit">Money out</option>
          </select>
          <button
            type="button"
            onClick={() => void loadLedger()}
            disabled={loading}
            className="btn-primary !py-2 !text-sm"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
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
        ) : ledger && ledger.transactions.length === 0 ? (
          <div className="card-base p-16 text-center">
            <p className="font-semibold">No transactions yet</p>
            <p className="text-sm text-muted mt-1">
              {typeFilter ? 'Try clearing the filter.' : 'Entries will appear here once the fin sec records them.'}
            </p>
          </div>
        ) : ledger ? (
          <GroupedTransactions transactions={ledger.transactions} onProofClick={setLightboxUrl} />
        ) : null}

        {ledger && ledger.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary !py-2 !text-sm"
            >
              ← Previous
            </button>
            <span className="px-4 py-2 text-sm text-muted">
              Page {page} of {ledger.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= ledger.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary !py-2 !text-sm"
            >
              Next →
            </button>
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
    <div className="card-base p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-dim">{label}</p>
      <p className={`text-base sm:text-lg font-semibold mt-1 truncate ${valueClass}`}>{value}</p>
    </div>
  );
}

function GroupedTransactions({
  transactions,
  onProofClick,
}: {
  transactions: Transaction[];
  onProofClick: (url: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const key = formatDate(t.occurredAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [transactions]);

  return (
    <div className="space-y-5">
      {groups.map(([date, items]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <h3 className="text-xs font-semibold text-dim uppercase tracking-wider">{date}</h3>
            <div className="flex-1 h-px bg-[color:var(--nx-border)]" />
          </div>
          <div className="space-y-2">
            {items.map((t) => (
              <TransactionCard key={t.id} transaction={t} onProofClick={onProofClick} />
            ))}
          </div>
        </div>
      ))}
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
    <div className="card-base p-4">
      <div className="flex gap-3 items-start">
        <div
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg font-semibold bg-surface-2 border border-nx ${
            isCredit ? 'text-success' : 'text-danger'
          }`}
        >
          {isCredit ? '↓' : '↑'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{transaction.description}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted flex-wrap">
                {transaction.category && (
                  <span className={`badge ${isCredit ? 'badge-success' : 'badge-danger'}`}>
                    {transaction.category}
                  </span>
                )}
                {transaction.recorderName && (
                  <span className="text-dim">by {transaction.recorderName}</span>
                )}
              </div>
            </div>
            <p
              className={`font-semibold whitespace-nowrap text-right ${
                isCredit ? 'text-success' : 'text-danger'
              }`}
            >
              {isCredit ? '+' : '−'} {formatNaira(transaction.amount)}
            </p>
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
