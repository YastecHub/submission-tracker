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
    if (verified) loadLedger();
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

  // ------------------ GATE ------------------
  if (!verified) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark bg-radial-fade pointer-events-none" />
        <div className="blob bg-emerald-500 w-[500px] h-[500px] -top-40 -left-40 animate-aurora" />
        <div className="blob bg-teal-500 w-[420px] h-[420px] -bottom-32 -right-32 animate-aurora-slow" />
        <div className="blob bg-cyan-400 w-[300px] h-[300px] top-1/3 right-1/4 opacity-30 animate-aurora" />

        <div className="w-full max-w-md relative animate-fade-up">
          <div className="text-center mb-6">
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 mb-4 shadow-2xl animate-pulse-ring">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30" />
              <span className="text-3xl relative">₦</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient-emerald">Class Account</h1>
            <p className="text-zinc-400 text-sm mt-1.5">Full transparency. Every kobo accounted for.</p>
          </div>

          <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-white/20 via-white/5 to-transparent overflow-hidden">
            <div className="absolute inset-0 opacity-50 overflow-hidden rounded-3xl">
              <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-sweep" />
            </div>

            <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-7">
              <h2 className="text-lg font-bold text-white mb-1">Verify your matric</h2>
              <p className="text-sm text-zinc-400 mb-5">Only verified class members can view the ledger.</p>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Matric Number</label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 group-focus-within:text-emerald-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h0a2 2 0 012 2v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={matricInput}
                      onChange={(e) => setMatricInput(e.target.value)}
                      placeholder="e.g. CSC/2020/001"
                      className="w-full bg-zinc-800/60 border border-zinc-700 text-zinc-100 placeholder-zinc-500 rounded-xl pl-10 pr-3 py-3 text-base uppercase focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5">Must match a matric that has submitted an assignment or payment.</p>
                </div>
                <button
                  type="submit"
                  disabled={verifying || !matricInput.trim()}
                  className="relative w-full overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-60 shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 group"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-sweep" />
                  </span>
                  <span className="relative">{verifying ? 'Verifying...' : 'View Ledger'}</span>
                  {!verifying && (
                    <svg className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/10 text-center">
                <Link to="/login" className="text-xs text-zinc-500 hover:text-emerald-400 transition">
                  Are you an admin? Log in →
                </Link>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-500 mt-5">
            Your matric is only used to unlock this page. Nothing is tracked.
          </p>
        </div>
      </div>
    );
  }

  // ------------------ LEDGER ------------------
  const balance = ledger ? Number(ledger.balance) : 0;
  const totalIn = ledger ? Number(ledger.totalCredits) : 0;
  const totalOut = ledger ? Number(ledger.totalDebits) : 0;
  const flowTotal = totalIn + totalOut;
  const inPct = flowTotal > 0 ? (totalIn / flowTotal) * 100 : 0;
  const outPct = flowTotal > 0 ? (totalOut / flowTotal) * 100 : 0;
  const balancePositive = balance >= 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-12 relative overflow-hidden">
      {/* Ambient grid + aurora */}
      <div className="absolute inset-0 bg-grid-dark bg-radial-fade pointer-events-none" />
      <div className="blob bg-emerald-500 w-[600px] h-[600px] -top-48 -left-40 animate-aurora opacity-40" />
      <div className="blob bg-teal-500 w-[500px] h-[500px] top-20 -right-40 animate-aurora-slow opacity-40" />

      {/* Hero header */}
      <header className="relative">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-8">
          <div className="flex items-start justify-between mb-6 animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-xl shadow-lg">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30" />
                <span className="relative">₦</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-semibold">Class Account</p>
                <h1 className="text-lg font-bold leading-tight text-white">Transparency Ledger</h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Viewing as</p>
              <p className="text-sm font-semibold truncate max-w-[160px] text-white">{verified.displayName}</p>
              <button
                type="button"
                onClick={handleLogOut}
                className="text-[11px] text-zinc-500 hover:text-emerald-400 underline mt-0.5 transition"
              >
                Use different matric
              </button>
            </div>
          </div>

          {/* Balance hero with gradient border */}
          <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/40 via-white/10 to-transparent overflow-hidden animate-fade-up">
            <div className="absolute inset-0 opacity-40 overflow-hidden rounded-3xl">
              <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-sweep" />
            </div>

            <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-block w-2 h-2 rounded-full ${balancePositive ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-semibold">Current Balance</p>
              </div>
              <p className="text-4xl sm:text-5xl font-bold tracking-tight mt-1 text-gradient-emerald">
                {ledger ? formatNaira(ledger.balance) : <span className="text-zinc-600">Loading…</span>}
              </p>
              {ledger && lastLoadedAt && (
                <p className="text-[11px] text-zinc-500 mt-2">Updated {formatRelative(lastLoadedAt.toISOString())}</p>
              )}

              {ledger && flowTotal > 0 && (
                <div className="mt-5">
                  <div className="flex h-2 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-700"
                      style={{ width: `${inPct}%` }}
                    />
                    <div
                      className="bg-gradient-to-r from-rose-500 to-red-400 transition-all duration-700"
                      style={{ width: `${outPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] text-zinc-400">
                    <span className="text-emerald-400">In {inPct.toFixed(0)}%</span>
                    <span className="text-rose-400">Out {outPct.toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 relative">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-up">
          <StatCard
            label="Money In"
            value={ledger ? formatNaira(ledger.totalCredits, { compact: true }) : '—'}
            tone="emerald"
            icon="↓"
          />
          <StatCard
            label="Money Out"
            value={ledger ? formatNaira(ledger.totalDebits, { compact: true }) : '—'}
            tone="rose"
            icon="↑"
          />
          <StatCard
            label="Entries"
            value={ledger ? String(ledger.transactionCount) : '—'}
            tone="zinc"
            icon="#"
          />
        </div>

        {/* Filters */}
        <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-3 mb-4 flex gap-2 items-center sticky top-2 z-10">
          <h2 className="text-base font-bold text-white flex-1 pl-2">Transactions</h2>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as TransactionType | ''); setPage(1); }}
            className="bg-zinc-800/80 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="">All types</option>
            <option value="credit">Money in</option>
            <option value="debit">Money out</option>
          </select>
          <button
            type="button"
            onClick={loadLedger}
            disabled={loading}
            className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-60 shadow-md shadow-emerald-500/20"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Transactions list */}
        {loading && !ledger ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-2/3" />
                    <div className="h-3 bg-zinc-800/60 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : ledger && ledger.transactions.length === 0 ? (
          <div className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl border-2 border-dashed border-white/10 py-16 text-center animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-3 ring-1 ring-emerald-500/30">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-semibold text-white">No transactions yet</p>
            <p className="text-sm text-zinc-500 mt-1">
              {typeFilter ? 'Try clearing the filter.' : 'Entries will appear here once the fin sec records them.'}
            </p>
          </div>
        ) : ledger ? (
          <GroupedTransactions transactions={ledger.transactions} onProofClick={setLightboxUrl} />
        ) : null}

        {/* Pagination */}
        {ledger && ledger.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-sm border border-white/10 bg-zinc-900/60 text-zinc-300 rounded-lg disabled:opacity-40 hover:bg-zinc-800 font-medium transition"
            >
              ← Previous
            </button>
            <span className="px-4 py-2 text-sm text-zinc-400 font-medium">
              Page {page} of {ledger.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= ledger.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-sm border border-white/10 bg-zinc-900/60 text-zinc-300 rounded-lg disabled:opacity-40 hover:bg-zinc-800 font-medium transition"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Proof"
            className="max-w-full max-h-full rounded-xl shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full w-10 h-10 flex items-center justify-center transition"
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
  icon,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'rose' | 'zinc';
  icon: string;
}) {
  const accent = {
    emerald: 'from-emerald-500/20 to-transparent border-emerald-500/30 text-emerald-300',
    rose: 'from-rose-500/20 to-transparent border-rose-500/30 text-rose-300',
    zinc: 'from-zinc-500/20 to-transparent border-zinc-500/30 text-zinc-300',
  }[tone];
  const iconBg = {
    emerald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    rose: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    zinc: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30',
  }[tone];

  return (
    <div className={`card-lift relative overflow-hidden bg-gradient-to-br ${accent} border rounded-2xl p-3 backdrop-blur-xl`}>
      <div className="absolute inset-0 bg-zinc-900/60 -z-10" />
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ring-1 ${iconBg} mb-2`}>
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-base sm:text-lg font-bold mt-0.5 truncate text-white">{value}</p>
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
        <div key={date} className="animate-fade-up">
          <div className="flex items-center gap-2 mb-2 px-1">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{date}</h3>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
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
    <div className="card-lift bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-white/20 p-4">
      <div className="flex gap-3 items-start">
        <div
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold ring-1 ${
            isCredit
              ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/10 text-emerald-300 ring-emerald-500/30'
              : 'bg-gradient-to-br from-rose-500/30 to-red-500/10 text-rose-300 ring-rose-500/30'
          }`}
        >
          {isCredit ? '↓' : '↑'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{transaction.description}</p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400 flex-wrap">
                {transaction.category && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                    isCredit ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' : 'bg-rose-500/10 text-rose-300 ring-rose-500/30'
                  }`}>
                    {transaction.category}
                  </span>
                )}
                {transaction.recorderName && (
                  <span className="text-zinc-500">by {transaction.recorderName}</span>
                )}
              </div>
            </div>
            <p
              className={`font-bold whitespace-nowrap text-right ${
                isCredit ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {isCredit ? '+' : '−'} {formatNaira(transaction.amount)}
            </p>
          </div>
          {transaction.proofUrl && (
            <button
              type="button"
              onClick={() => onProofClick(transaction.proofUrl!)}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 ring-1 ring-emerald-500/30 rounded-lg px-2.5 py-1 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              View proof
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
